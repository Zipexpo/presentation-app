import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Topic from '@/models/Topic';
import ProjectSubmission from '@/models/ProjectSubmission';
import PeerReview from '@/models/PeerReview';
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import '@/models/User';

export const dynamic = 'force-dynamic';

function calculateMaxScore(questions) {
    if (!questions || !Array.isArray(questions)) return 0;

    return questions.reduce((total, q) => {
        let qMax = 0;
        switch (q.type) {
            case 'scale':
            case 'rating':
                qMax = q.scaleConfig?.max || 5;
                break;
            case 'choice':
                if (q.options && q.options.length) {
                    qMax = Math.max(...q.options.map(o => (typeof o.score === 'number' ? o.score : o.baseScore) || 0));
                }
                break;
            case 'matrix':
                if (q.rows && q.rows.length) {
                    let matrixTotal = 0;
                    q.rows.forEach(row => {
                        const rowWeight = typeof row.weight === 'number' ? row.weight : 1;
                        let rowMax = 0;
                        if (q.columns && q.columns.length) {
                            rowMax = Math.max(...q.columns.map(c => (typeof c.score === 'number' ? c.score : c.baseScore) || 0));
                        } else if (q.options && q.options.length) {
                            rowMax = Math.max(...q.options.map(o => (typeof o.score === 'number' ? o.score : o.baseScore) || 0));
                        } else if (row.cells && row.cells.length) {
                            rowMax = Math.max(...row.cells.map(c => (typeof c.score === 'number' ? c.score : c.baseScore) || 0));
                        }
                        matrixTotal += (rowMax * rowWeight);
                    });
                    qMax = matrixTotal;
                }
                break;
            case 'rubric':
                if (q.options && q.options.length) {
                    qMax = Math.max(...q.options.map(o => (typeof o.score === 'number' ? o.score : o.baseScore) || 0));
                }
                break;
            case 'text':
                qMax = q.textConfig?.maxScore || 0;
                break;
            default:
                break;
        }
        return total + qMax;
    }, 0);
}

// Generate Headers AND a Lookup Map
function getHeadersAndMap(questions) {
    const headers = [];
    const labelMap = {}; // Maps Raw DB Label -> Header Index (0-based relative to question columns)

    questions.forEach((q, qIndex) => {
        if (q.type === 'matrix') {
            q.rows.forEach((row) => {
                const headerText = `Q${qIndex + 1}_${row.text || row.id}`;
                const mapIndex = headers.length;
                headers.push(headerText);

                // Map the RAW row text to this index
                if (row.text) labelMap[row.text] = mapIndex;
                if (row.id) labelMap[row.id] = mapIndex;
            });
        } else {
            const headerText = q.label || q.question || `Question ${qIndex + 1}`;
            const mapIndex = headers.length;
            headers.push(headerText);

            // Map raw labels
            if (q.label) labelMap[q.label] = mapIndex;
            if (q.question) labelMap[q.question] = mapIndex;
        }
    });
    return { headers, labelMap };
}

export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const resolvedParams = await params;
        const topicId = resolvedParams.id;

        if (!mongoose.Types.ObjectId.isValid(topicId)) return NextResponse.json({ error: 'Invalid Topic ID' }, { status: 400 });

        const topic = await Topic.findById(topicId);
        if (!topic) return NextResponse.json({ error: 'Topic not found' }, { status: 404 });

        if (topic.teacherId.toString() !== session.user.id && !topic.invitedTeachers?.includes(session.user.email)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const projects = await ProjectSubmission.find({ topicId }).lean();
        const reviews = await PeerReview.find({ topicId }).lean();

        const projectMap = projects.reduce((acc, p) => { acc[p._id.toString()] = p; return acc; }, {});
        projects.sort((a, b) => (a.groupNumber || 0) - (b.groupNumber || 0));

        const studentQuestions = topic.presentationConfig.surveyQuestions || [];
        const teacherQuestions = topic.presentationConfig.specialEvaluationConfig?.enabled
            ? topic.presentationConfig.specialEvaluationConfig.surveyQuestions
            : studentQuestions;

        const { headers: studentHeaders, labelMap: studentMap } = getHeadersAndMap(studentQuestions);
        const { headers: teacherHeaders, labelMap: teacherMap } = getHeadersAndMap(teacherQuestions);

        const studentMaxScore = calculateMaxScore(studentQuestions);
        const teacherMaxScore = calculateMaxScore(teacherQuestions);

        const surveyWeight = topic.presentationConfig.surveyWeight || 1;
        const specialWeight = topic.presentationConfig.specialEvaluationConfig?.weight || 1;

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Presentation App';

        const createDetailSheet = (sheetName, headers, labelMap, maxScore, typeFilter) => {
            const sheet = workbook.addWorksheet(sheetName);

            const columns = [
                { header: 'Group Number', key: 'groupNumber', width: 10 },
                { header: 'Project Name', key: 'projectName', width: 25 },
                { header: 'Reviewer Name', key: 'reviewerName', width: 20 },
            ];

            headers.forEach((h, i) => {
                columns.push({ header: h, key: `q_${i}`, width: 15 });
            });

            const rawTotalKey = 'rawTotal';
            const maxScoreKey = 'maxScore';
            const normalizedKey = 'normalizedScore';

            columns.push({ header: 'Raw Total', key: rawTotalKey, width: 12 });
            columns.push({ header: 'Max Poss.', key: maxScoreKey, width: 12 });
            columns.push({ header: 'Score (10)', key: normalizedKey, width: 12 });
            columns.push({ header: 'Comment', key: 'comment', width: 35 });

            sheet.columns = columns;
            sheet.getRow(1).font = { bold: true };

            const filteredReviews = reviews.filter(r => {
                if (typeFilter === 'student') return r.userType === 'student' || r.userType === 'guest';
                if (typeFilter === 'teacher') return r.userType === 'teacher';
                return false;
            });

            filteredReviews.forEach(r => {
                const proj = projectMap[r.projectId.toString()];
                if (!proj) return;

                const rowData = {
                    groupNumber: proj.groupNumber,
                    projectName: proj.projectName,
                    reviewerName: r.reviewerName || 'Anonymous',
                    [maxScoreKey]: maxScore,
                    comment: r.comment || ''
                };

                let total = 0;
                let hasScores = false;

                if (r.scores && r.scores.length > 0) {
                    r.scores.forEach(s => {
                        // Use the MAP to find the column index based on RAW label
                        const hIdx = labelMap[s.label];

                        if (hIdx !== undefined) {
                            rowData[`q_${hIdx}`] = s.score;
                        } else {
                            // Fallback: Check if label matches the header string exactly (legacy behavior)
                            const directIdx = headers.indexOf(s.label);
                            if (directIdx !== -1) {
                                rowData[`q_${directIdx}`] = s.score;
                            }
                        }

                        const val = typeof s.score === 'number' ? s.score : 0;
                        total += val;
                    });
                    hasScores = true;
                }

                rowData[rawTotalKey] = total;

                const newRow = sheet.addRow(rowData);

                const rawColIdx = 3 + headers.length + 1;
                const maxColIdx = rawColIdx + 1;

                const getColLetter = (colIndex) => {
                    let temp, letter = '';
                    while (colIndex > 0) {
                        temp = (colIndex - 1) % 26;
                        letter = String.fromCharCode(temp + 65) + letter;
                        colIndex = Math.floor((colIndex - temp - 1) / 26);
                    }
                    return letter;
                };

                const rawRef = getColLetter(rawColIdx) + newRow.number;
                const maxRef = getColLetter(maxColIdx) + newRow.number;

                if (hasScores && maxScore > 0) {
                    newRow.getCell(normalizedKey).value = {
                        formula: `IF(${maxRef}=0, 0, ROUND((${rawRef}/${maxRef})*10, 2))`
                    };
                } else {
                    newRow.getCell(normalizedKey).value = null;
                }
            });

            return columns.findIndex(c => c.key === normalizedKey) + 1;
        };

        const studentNormColIdx = createDetailSheet('Student Reviews', studentHeaders, studentMap, studentMaxScore, 'student');
        const teacherNormColIdx = createDetailSheet('Teacher Reviews', teacherHeaders, teacherMap, teacherMaxScore, 'teacher');

        // Summary Sheet
        const summarySheet = workbook.addWorksheet('Final Scores');
        summarySheet.columns = [
            { header: 'Group Number', key: 'groupNumber', width: 12 },
            { header: 'Project Name', key: 'projectName', width: 30 },
            { header: 'Student Avg (10)', key: 'sAvg', width: 18 },
            { header: 'Teacher Avg (10)', key: 'tAvg', width: 18 },
            { header: 'Final Score', key: 'final', width: 15 },
        ];
        summarySheet.getRow(1).font = { bold: true };

        const getColLetter = (colIndex) => {
            let temp, letter = '';
            while (colIndex > 0) {
                temp = (colIndex - 1) % 26;
                letter = String.fromCharCode(temp + 65) + letter;
                colIndex = Math.floor((colIndex - temp - 1) / 26);
            }
            return letter;
        };

        const sNormLetter = getColLetter(studentNormColIdx);
        const tNormLetter = getColLetter(teacherNormColIdx);

        projects.forEach((proj, idx) => {
            const r = idx + 2;
            const projRef = `B${r}`;

            const sFormula = `IFERROR(AVERAGEIFS('Student Reviews'!$${sNormLetter}:$${sNormLetter}, 'Student Reviews'!$B:$B, ${projRef}), 0)`;
            const tFormula = `IFERROR(AVERAGEIFS('Teacher Reviews'!$${tNormLetter}:$${tNormLetter}, 'Teacher Reviews'!$B:$B, ${projRef}), 0)`;

            const c = `C${r}`;
            const d = `D${r}`;
            const finalFormula = `IF(AND(${c}=0, ${d}=0), 0, IF(${c}=0, ${d}, IF(${d}=0, ${c}, ((${c}*${surveyWeight}) + (${d}*${specialWeight})) / (${surveyWeight} + ${specialWeight}))))`;

            summarySheet.addRow({
                groupNumber: proj.groupNumber,
                projectName: proj.projectName,
                sAvg: { formula: sFormula },
                tAvg: { formula: tFormula },
                final: { formula: finalFormula }
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="scores_${topic.title.replace(/[^a-z0-9]/gi, '_')}.xlsx"`
            }
        });

    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
