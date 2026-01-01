import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, FileText, ArrowLeft, LayoutGrid } from 'lucide-react';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

export default function SurveyEditor({ questions, onChange, onImport }) {
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });

    const updateQuestion = (idx, updates) => {
        const newQs = [...questions];
        newQs[idx] = { ...newQs[idx], ...updates };
        onChange(newQs);
    };

    const removeQuestion = (idx) => {
        const newQs = questions.filter((_, i) => i !== idx);
        onChange(newQs);
    };

    const addQuestion = () => {
        const newQs = [...(questions || [])];
        newQs.push({ question: '', type: 'choice', options: [{ label: 'Yes', score: 10 }, { label: 'No', score: 0 }] });
        onChange(newQs);
    };

    const handleCSVImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const lines = evt.target.result.split('\n').filter(l => l.trim());
            if (lines.length < 2) return alert('Invalid CSV');

            const rawQuestions = [];
            // Skip header
            for (let i = 1; i < lines.length; i++) {
                const parseCSVLine = (str) => {
                    const res = [];
                    let current = "";
                    let inQuote = false;
                    for (let c = 0; c < str.length; c++) {
                        const char = str[c];
                        if (char === '"' && str[c + 1] === '"') { current += '"'; c++; continue; }
                        if (char === '"') { inQuote = !inQuote; continue; }
                        if (char === ',' && !inQuote) { res.push(current.trim()); current = ""; continue; }
                        current += char;
                    }
                    res.push(current.trim());
                    return res;
                };

                const parts = parseCSVLine(lines[i]);
                const type = parts[0]?.toLowerCase() || 'choice';
                const question = parts[1];
                const configStr = parts[2];

                if (!question) continue;

                const qObj = { type: type, question };

                if (type === 'choice') {
                    qObj.options = configStr ? configStr.split(';').map(opt => {
                        return { label: label || 'Option', score: Number(score) || 0 };
                    }) : [];
                } else if (type === 'rubric') {
                    let effectiveConfig = configStr;
                    let weight = 1;

                    const weightMatch = effectiveConfig?.match(/^weight\s*:\s*([\d.]+)\s*;/i);
                    if (weightMatch) {
                        weight = parseFloat(weightMatch[1]) || 1;
                        effectiveConfig = effectiveConfig.substring(weightMatch[0].length).trim();
                    }
                    qObj.weight = weight; // Store weight for Matrix derivation

                    qObj.options = effectiveConfig ? effectiveConfig.split(';').map(opt => {
                        let parts = opt.split('|');
                        if (parts.length < 2) parts = opt.split(':');

                        let colLabel = parts[0]?.trim();
                        let baseScore = Number(parts[1]);
                        let desc = parts[2]?.trim();

                        // Auto-detect format: Score|Desc (e.g. "1|Description")
                        // If parts[1] is NOT a number AND parts[0] IS a number
                        if (parts.length === 2 && !isNaN(parseFloat(parts[0])) && isNaN(parseFloat(parts[1]))) {
                            baseScore = parseFloat(parts[0]);
                            colLabel = parts[0];
                            desc = parts[1].trim();
                        } else {
                            // Standard: Header|Score|Desc (Header|Score)
                            baseScore = baseScore || 0;
                            desc = desc || colLabel;
                        }

                        return {
                            columnLabel: colLabel,
                            score: baseScore * weight,
                            baseScore: baseScore, // Store this!
                            label: desc
                        };
                    }) : [];
                } else if (type === 'section') {
                    qObj.title = question;
                } else if (type === 'scale' || type === 'rating') {
                    const [min, max, minLabel, maxLabel] = configStr ? configStr.split(';') : [1, 5, 'Poor', 'Excellent'];
                    qObj.scaleConfig = {
                        min: Number(min) || 1,
                        max: Number(max) || 5,
                        minLabel: minLabel || 'Poor',
                        maxLabel: maxLabel || 'Excellent'
                    };
                } else if (type === 'text') {
                    qObj.textConfig = { maxScore: Number(configStr) || 0 };
                }
                rawQuestions.push(qObj);
            }

            // Aggregate Rubric Rows into Matrix
            const newQuestions = [];
            let pendingMatrix = null;

            rawQuestions.forEach((q, idx) => {
                if (q.type === 'rubric') {
                    const qLabels = q.options.map(o => o.columnLabel || '').join('|');

                    if (pendingMatrix) {
                        const pendingLabels = pendingMatrix.columns.map(c => c.label).join('|');
                        if (pendingLabels === qLabels) {
                            pendingMatrix.rows.push({
                                id: Date.now() + idx, // Simple ID
                                text: q.question,
                                weight: q.weight,
                                cells: q.options
                            });
                            return;
                        } else {
                            newQuestions.push(pendingMatrix);
                            pendingMatrix = null;
                        }
                    }

                    // Start new matrix
                    // If previous item was a section, use it as title?
                    let title = 'Rubric Matrix';
                    const lastQ = newQuestions[newQuestions.length - 1];
                    if (lastQ && lastQ.type === 'section') {
                        title = lastQ.title;
                        // Remove the section strictly?
                        // Or keep it? If we treat Matrix as self-contained, remove section.
                        newQuestions.pop();
                    }

                    pendingMatrix = {
                        type: 'matrix',
                        question: title,
                        columns: q.options.map(o => ({ label: o.columnLabel, baseScore: o.baseScore })), // Store initial scores
                        rows: [{ id: Date.now() + idx, text: q.question, weight: q.weight, cells: q.options }]
                    };
                } else {
                    if (pendingMatrix) {
                        newQuestions.push(pendingMatrix);
                        pendingMatrix = null;
                    }
                    newQuestions.push(q);
                }
            });
            if (pendingMatrix) newQuestions.push(pendingMatrix);

            setConfirmModal({
                isOpen: true,
                message: `Import ${newQuestions.length} items? (Rubrics grouped into Matrices)`,
                onConfirm: () => {
                    onChange([...(questions || []), ...newQuestions]);
                    setConfirmModal({ isOpen: false, message: '', onConfirm: null });
                }
            });
            e.target.value = null;
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            {questions?.map((q, qIdx) => (
                <div key={qIdx} className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 group">
                    {/* Header */}
                    <div className="flex flex-col-reverse justify-between items-start mb-4 gap-4 sm:flex-row sm:items-start">
                        <div className="flex-1 w-full">
                            {q.type !== 'section' ? (
                                <>
                                    <Label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Question {qIdx + 1}</Label>
                                    <Input
                                        placeholder="e.g. Rate the design quality"
                                        value={q.question}
                                        className="bg-white font-medium shadow-sm w-full"
                                        onChange={(e) => updateQuestion(qIdx, { question: e.target.value })}
                                    />
                                </>
                            ) : (
                                <Label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Section Break</Label>
                            )}
                        </div>
                        <div className="flex gap-2 items-center self-end sm:self-auto sm:pt-6">
                            <select
                                value={q.type || 'choice'}
                                onChange={(e) => {
                                    const t = e.target.value;
                                    const update = { type: t };
                                    if ((t === 'scale' || t === 'rating') && !q.scaleConfig) {
                                        update.scaleConfig = { min: 1, max: 5, minLabel: 'Poor', maxLabel: 'Excellent' };
                                    }
                                    updateQuestion(qIdx, update);
                                }}
                                className="h-10 text-xs rounded-md border border-slate-300 bg-white px-3 cursor-pointer focus:ring-2 focus:ring-blue-500/20 shadow-sm outline-none font-medium"
                            >
                                <option value="choice">Multiple Choice</option>
                                <option value="matrix">Rubric Matrix</option>
                                <option value="rubric">Rubric Row (Legacy)</option>
                                <option value="section">Section Header</option>
                                <option value="rating">Star Rating (5 Stars)</option>
                                <option value="scale">Numeric Scale</option>
                                <option value="text">Text Response</option>
                            </select>
                            <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100" onClick={() => removeQuestion(qIdx)}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    {/* CONFIG: SECTION HEADER */}
                    {q.type === 'section' && (
                        <div className="bg-slate-100 p-3 rounded-lg border-l-4 border-slate-500">
                            <Input
                                value={q.title || q.question}
                                onChange={(e) => updateQuestion(qIdx, { title: e.target.value, question: e.target.value })}
                                className="font-bold text-lg border-transparent focus:border-slate-300 bg-transparent px-0 h-auto"
                                placeholder="Section Title (e.g. 'Content Quality')"
                            />
                        </div>
                    )}

                    {/* CONFIG: CHOICE OR RUBRIC */}
                    {(q.type === 'choice' || q.type === 'rubric' || !q.type) && (
                        <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                            {q.type === 'rubric' && <p className="text-[10px] text-violet-600 font-bold mb-2 uppercase">Rubric Row Configuration</p>}
                            {q.options?.map((opt, oIdx) => (
                                <div key={oIdx} className="flex gap-2 items-center">
                                    <div className={`w-4 h-4 rounded-full border border-slate-300 shrink-0 ${q.type === 'rubric' ? 'bg-violet-100 rounded-sm' : 'bg-white'}`} />
                                    <Input
                                        placeholder={q.type === 'rubric' ? 'Description (HTML supported)' : 'Option Label'}
                                        value={opt.label}
                                        className="bg-white text-sm h-8"
                                        onChange={(e) => {
                                            const newOpts = [...q.options];
                                            newOpts[oIdx] = { ...newOpts[oIdx], label: e.target.value };
                                            updateQuestion(qIdx, { options: newOpts });
                                        }}
                                    />
                                    {q.type === 'rubric' && (
                                        <Input
                                            placeholder="Header"
                                            value={opt.columnLabel || ''}
                                            className="bg-slate-50 text-xs h-8 w-24 border-slate-200"
                                            onChange={(e) => {
                                                const newOpts = [...q.options];
                                                newOpts[oIdx] = { ...newOpts[oIdx], columnLabel: e.target.value };
                                                updateQuestion(qIdx, { options: newOpts });
                                            }}
                                        />
                                    )}
                                    <div className="w-20 relative shrink-0">
                                        <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-bold">PTS</span>
                                        <Input
                                            type="number"
                                            value={opt.score}
                                            className="bg-white text-sm h-8 pr-8"
                                            onChange={(e) => {
                                                const newOpts = [...q.options];
                                                newOpts[oIdx] = { ...newOpts[oIdx], score: Number(e.target.value) };
                                                updateQuestion(qIdx, { options: newOpts });
                                            }}
                                        />
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 shrink-0" onClick={() => {
                                        const newOpts = q.options.filter((_, i) => i !== oIdx);
                                        updateQuestion(qIdx, { options: newOpts });
                                    }}>&times;</Button>
                                </div>
                            ))}
                            <Button type="button" size="sm" variant="ghost" className="text-blue-600 h-8 text-xs" onClick={() => {
                                const newOpts = [...(q.options || []), { label: '', score: 0 }];
                                updateQuestion(qIdx, { options: newOpts });
                            }}>+ Add Option</Button>
                        </div>
                    )}

                    {/* CONFIG: MATRIX EDITOR */}
                    {q.type === 'matrix' && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 overflow-x-auto">
                            <div className="flex justify-between items-center mb-4">
                                <Label className="text-xs font-bold uppercase text-slate-500">Matrix Configuration</Label>
                                <div className="text-[10px] text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                                    Formula: <span className="font-mono text-slate-600">Base Score × Weight = Final Points</span>
                                </div>
                            </div>

                            <table className="w-full text-sm border-collapse min-w-[600px]">
                                <thead>
                                    <tr>
                                        <th className="p-2 text-left w-1/4">Criteria / Weight</th>
                                        {q.columns?.map((col, cIdx) => (
                                            <th key={cIdx} className="p-2 min-w-[140px] bg-slate-100/50 rounded-t-lg border-b border-slate-200">
                                                <div className="flex flex-col gap-1">
                                                    <Input
                                                        value={col.label}
                                                        onChange={e => {
                                                            const newCols = [...q.columns];
                                                            newCols[cIdx].label = e.target.value;
                                                            const newRows = q.rows.map(r => ({
                                                                ...r,
                                                                cells: r.cells.map((cell, idx) => idx === cIdx ? { ...cell, columnLabel: e.target.value } : cell)
                                                            }));
                                                            updateQuestion(qIdx, { columns: newCols, rows: newRows });
                                                        }}
                                                        className="h-7 text-xs font-bold text-center bg-transparent border-transparent hover:bg-white focus:bg-white transition-colors"
                                                        placeholder="Label"
                                                    />
                                                    <div className="flex items-center justify-center gap-1">
                                                        <span className="text-[10px] text-slate-400">Base:</span>
                                                        <Input
                                                            type="number"
                                                            value={col.baseScore}
                                                            onChange={e => {
                                                                const val = Number(e.target.value);
                                                                const newCols = [...q.columns];
                                                                newCols[cIdx].baseScore = val;
                                                                // Recalc all rows
                                                                const newRows = q.rows.map(r => ({
                                                                    ...r,
                                                                    cells: r.cells.map((cell, idx) => idx === cIdx ? { ...cell, baseScore: val, score: val * (r.weight || 1) } : cell)
                                                                }));
                                                                updateQuestion(qIdx, { columns: newCols, rows: newRows });
                                                            }}
                                                            className="h-6 w-12 text-[10px] text-center bg-white border-slate-200 p-0"
                                                        />
                                                    </div>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {q.rows?.map((row, rIdx) => (
                                        <tr key={rIdx} className="border-b border-slate-100 last:border-0 group/row">
                                            <td className="p-2 align-top bg-white/50">
                                                <div className="flex flex-col gap-2 pt-2">
                                                    <Input
                                                        value={row.text}
                                                        onChange={e => {
                                                            const newRows = [...q.rows];
                                                            newRows[rIdx] = { ...row, text: e.target.value };
                                                            updateQuestion(qIdx, { rows: newRows });
                                                        }}
                                                        className="font-bold text-sm h-9 bg-white border-slate-200"
                                                        placeholder="Criteria Name"
                                                    />
                                                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-md w-fit">
                                                        <span className="text-[10px] uppercase font-bold text-slate-500 pl-1">Weight:</span>
                                                        <Input
                                                            type="number"
                                                            value={row.weight ?? 1}
                                                            onChange={e => {
                                                                const w = parseFloat(e.target.value) || 0;
                                                                const newRows = [...q.rows];
                                                                // Recalc this row's scores
                                                                const newCells = row.cells.map((c, idx) => ({
                                                                    ...c,
                                                                    score: (q.columns[idx]?.baseScore || 0) * w
                                                                }));
                                                                newRows[rIdx] = { ...row, weight: w, cells: newCells };
                                                                updateQuestion(qIdx, { rows: newRows });
                                                            }}
                                                            className="h-6 w-14 text-xs bg-white border-slate-200 text-center"
                                                        />
                                                    </div>
                                                    <Button variant="ghost" className="text-red-400 hover:text-red-500 h-6 text-[10px] justify-start px-0 hover:bg-transparent opacity-0 group-hover/row:opacity-100 transition-opacity" onClick={() => {
                                                        const newRows = q.rows.filter((_, i) => i !== rIdx);
                                                        updateQuestion(qIdx, { rows: newRows });
                                                    }}>
                                                        Delete Row
                                                    </Button>
                                                </div>
                                            </td>
                                            {row.cells?.map((cell, cIdx) => (
                                                <td key={cIdx} className="p-2 align-top">
                                                    <textarea
                                                        value={cell.label}
                                                        onChange={e => {
                                                            const newRows = [...q.rows];
                                                            newRows[rIdx].cells[cIdx].label = e.target.value;
                                                            updateQuestion(qIdx, { rows: newRows });
                                                        }}
                                                        className="w-full h-24 text-xs p-3 rounded-lg border border-slate-200 bg-white resize-y focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                                                        placeholder="Description..."
                                                    />
                                                    <div className="text-[10px] text-right font-mono text-slate-400 mt-1">
                                                        {cell.score} pts
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-4 text-xs border-dashed text-slate-500 hover:text-blue-600 hover:border-blue-200"
                                onClick={() => {
                                    const newRows = [...q.rows];
                                    const newCells = q.columns.map(c => ({
                                        label: '',
                                        baseScore: c.baseScore,
                                        score: c.baseScore * 1,
                                        columnLabel: c.label
                                    }));
                                    newRows.push({ id: Date.now(), text: 'New Criteria', weight: 1, cells: newCells });
                                    updateQuestion(qIdx, { rows: newRows });
                                }}
                            >
                                + Add Criteria Row
                            </Button>
                        </div>
                    )}

                    {/* CONFIG: RATING / SCALE */}
                    {(q.type === 'rating' || q.type === 'scale') && (
                        <div className="bg-white/50 p-3 rounded-lg border border-slate-200">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
                                <div>
                                    <Label className="text-[10px] uppercase text-slate-500 font-bold">Min Value</Label>
                                    <Input type="number" value={q.scaleConfig?.min ?? 1} onChange={(e) => updateQuestion(qIdx, { scaleConfig: { ...q.scaleConfig, min: Number(e.target.value) } })} className="h-8 text-sm bg-white" />
                                </div>
                                <div>
                                    <Label className="text-[10px] uppercase text-slate-500 font-bold">Max Value</Label>
                                    <Input type="number" value={q.scaleConfig?.max ?? 5} onChange={(e) => updateQuestion(qIdx, { scaleConfig: { ...q.scaleConfig, max: Number(e.target.value) } })} className="h-8 text-sm bg-white" />
                                </div>
                                <div>
                                    <Label className="text-[10px] uppercase text-slate-500 font-bold">Min Label</Label>
                                    <Input placeholder="Poor" value={q.scaleConfig?.minLabel ?? ''} onChange={(e) => updateQuestion(qIdx, { scaleConfig: { ...q.scaleConfig, minLabel: e.target.value } })} className="h-8 text-sm bg-white" />
                                </div>
                                <div>
                                    <Label className="text-[10px] uppercase text-slate-500 font-bold">Max Label</Label>
                                    <Input placeholder="Excellent" value={q.scaleConfig?.maxLabel ?? ''} onChange={(e) => updateQuestion(qIdx, { scaleConfig: { ...q.scaleConfig, maxLabel: e.target.value } })} className="h-8 text-sm bg-white" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CONFIG: TEXT */}
                    {q.type === 'text' && (
                        <div className="bg-white/50 p-3 rounded-lg border border-slate-200">
                            <Label className="text-[10px] uppercase text-slate-500 font-bold">Max Possible Score</Label>
                            <Input type="number" value={q.textConfig?.maxScore ?? 0} onChange={(e) => updateQuestion(qIdx, { textConfig: { ...q.textConfig, maxScore: Number(e.target.value) } })} className="h-8 text-sm w-32 bg-white" />
                            <p className="text-xs text-slate-500 mt-2">
                                <span className="font-bold text-red-500">Note:</span> Text answers require manual grading. Default score 0.
                            </p>
                        </div>
                    )}
                </div>
            ))}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1 border-dashed" onClick={addQuestion}>+ Add Survey Question</Button>
                <div className="flex gap-2 flex-wrap">
                    {/* Standard CSV Import */}
                    <div className="relative group">
                        <div className="flex gap-1">
                            <Button type="button" variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 gap-2 pointer-events-none">
                                <ArrowLeft className="w-4 h-4 rotate-90" /> Import Questions (CSV)
                            </Button>
                        </div>
                        <Input type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleCSVImport} />
                    </div>
                </div>
            </div>

            <div className="flex gap-4 text-xs text-slate-400 mt-2">
                <button type="button" className="hover:text-blue-600 underline" onClick={() => {
                    const csvContent = "Type,Question,Config\nsection,Content Quality,\nrubric,Grammar (Weighted),Weight:1.5; Ineffective|1|Poor Grammar;Effective|3|Good Grammar\nrubric,Logic,Ineffective|1|Illogical;Effective|3|Logical\nchoice,Example Choice,Option1:10;Option2:5";
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = 'survey_sample.csv'; a.click();
                }}>Download Sample CSV</button>
            </div>

            <Dialog open={confirmModal.isOpen} onOpenChange={(open) => !open && setConfirmModal(p => ({ ...p, isOpen: false }))}>
                <DialogContent className="glass-card border-none max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Confirm Import</DialogTitle>
                    </DialogHeader>
                    <div className="py-2">{confirmModal.message}</div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setConfirmModal(p => ({ ...p, isOpen: false }))}>Cancel</Button>
                        <Button onClick={confirmModal.onConfirm}>Confirm</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
