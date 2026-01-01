import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, FolderOpen, Trash2, X, Plus, Check } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function PresetManager({ type, onLoad, onSave, currentConfig }) {
    const [presets, setPresets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState('load'); // 'load' or 'save'
    const [newPresetName, setNewPresetName] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchPresets();
        }
    }, [isOpen]);

    const fetchPresets = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/teacher/presets');
            if (res.ok) {
                const data = await res.json();
                // Filter by current type (rubric/survey)
                setPresets(data.filter(p => p.type === type));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!newPresetName) return;
        try {
            const res = await fetch('/api/teacher/presets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newPresetName,
                    type: type,
                    data: currentConfig // The questions or criteria
                })
            });
            if (res.ok) {
                setIsOpen(false);
                setNewPresetName('');
                if (onSave) onSave(); // Callback for success notification
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this preset?')) return;
        try {
            const res = await fetch(`/api/teacher/presets/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setPresets(prev => prev.filter(p => p._id !== id));
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => { setMode('load'); setIsOpen(true); }} className="text-slate-600 border-slate-300">
                    <FolderOpen className="w-4 h-4 mr-1.5" /> Load Preset
                </Button>
                <Button variant="outline" size="sm" type="button" onClick={() => { setMode('save'); setIsOpen(true); }} className="text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-100">
                    <Save className="w-4 h-4 mr-1.5" /> Save as Preset
                </Button>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-md bg-white border-none shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-800">
                            {mode === 'save' ? <Save className="w-5 h-5 text-blue-600" /> : <FolderOpen className="w-5 h-5 text-slate-600" />}
                            {mode === 'save' ? 'Save New Preset' : 'Load Preset'}
                        </DialogTitle>
                    </DialogHeader>

                    {mode === 'save' ? (
                        <div className="space-y-4 py-4">
                            <div>
                                <Label className="text-slate-600 mb-1.5 block">Preset Name</Label>
                                <Input
                                    placeholder="e.g. Standard Final Grading"
                                    value={newPresetName}
                                    onChange={(e) => setNewPresetName(e.target.value)}
                                    className="bg-slate-50 border-slate-200"
                                />
                            </div>
                            <div className="bg-slate-50 p-3 rounded text-xs text-slate-500 border border-slate-100">
                                This will save the current <strong>{type === 'rubric' ? 'Grading Rubric' : 'Survey Questions'}</strong> as a reusable template.
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" type="button" onClick={() => setIsOpen(false)}>Cancel</Button>
                                <Button onClick={handleSave} disabled={!newPresetName} className="bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            {loading ? (
                                <div className="text-center py-8 text-slate-400 text-sm animate-pulse">Loading presets...</div>
                            ) : presets.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                    No saved {type} presets found.
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto p-1">
                                    {presets.map(preset => (
                                        <div key={preset._id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm hover:border-blue-200 hover:shadow-md transition group">
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-slate-800 text-sm">{preset.name}</h4>
                                                <p className="text-xs text-slate-400">
                                                    {new Date(preset.createdAt).toLocaleDateString()} &bull; {Array.isArray(preset.data) ? `${preset.data.length} items` : 'Config'}
                                                </p>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="sm" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(preset._id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" onClick={() => { onLoad(preset.data); setIsOpen(false); }} className="h-8 bg-slate-800 hover:bg-slate-900 text-white text-xs">
                                                    Load
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
