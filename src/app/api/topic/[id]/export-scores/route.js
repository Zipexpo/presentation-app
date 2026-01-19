import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Topic from '@/models/Topic';
import ProjectSubmission from '@/models/ProjectSubmission';
import PeerReview from '@/models/PeerReview';
import Papa from 'papaparse';
import mongoose from 'mongoose';
import '@/models/User'; // Ensure User model is registered

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const topicId = params.id;
        if (!mongoose.Types.ObjectId.isValid(topicId)) {
            return NextResponse.json({ error: 'Invalid Topic ID' }, { status: 400 });
        }

        const topic = await Topic.findById(topicId);
        if (!topic) {
            return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
        }

        // Ensure user is the teacher of the topic or an admin (if applicable)
        // For now, simple check against teacherId
        if (topic.teacherId.toString() !== session.user.id) {
            // Allow invited teachers too? For now, stricly owner.
            // Check invited teachers if needed, but let's stick to simple first.
            if (!topic.invitedTeachers?.includes(session.user.email)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const projects = await ProjectSubmission.find({ topicId }).lean();
        const reviews = await PeerReview.find({ topicId }).lean();

        // Map projects by ID for easy lookup
        const projectMap = projects.reduce((acc, project) => {
            acc[project._id.toString()] = project;
            return acc;
        }, {});

        // Prepare CSV Data
        // We need a consistent set of columns. 
        // The survey questions define the dynamic columns.

        // Flatten survey questions to get headers
        const surveyHeaders = [];
        topic.presentationConfig.surveyQuestions.forEach((q, qIndex) => {
            if (q.type === 'matrix') {
                q.rows.forEach((row, rIndex) => {
                    surveyHeaders.push(`Q${qIndex + 1}_${row.text || row.id}`);
                });
            } else {
                surveyHeaders.push(q.label || q.question || `Question ${qIndex + 1}`);
            }
        });

        // Helper to find score for a question label/index
        const findScore = (review, qIndex, subLabel = null) => {
            // This relies on how scores are stored in PeerReview.
            // PeerReview scores: [{ label: String, score: Number, textValue: String }]
            // The label in PeerReview usually matches the question label/id.
            // Let's match by order if labels aren't reliable or check how they are saved.
            // Looking at PeerReview model, it has `scores` array.
            // Ideally, we should match by label or ensure order.
            // Let's assume the `scores` array in PeerReview matches the flattened questions,
            // OR iterate `scores` to find matching label.

            // Re-evaluating PeerReview saving logic (not visible here, but common pattern):
            // Usually, `scores` contains objects with `label` corresponding to the question.

            // Let's try to map the question to the score entry.
            const question = topic.presentationConfig.surveyQuestions[qIndex];
            let targetLabel = question.label || question.question;

            if (subLabel) {
                // For matrix, it might be "Question Label - Row Label" or just Row Label
                // This depends on how it's saved.
                // Safe bet: Search for partial match or specific structure if known.
                // If unknown, we might just dump all scores found in the review.
            }

            // Simplification: Just dump whatever is in the `scores` array of the review,
            // aligned with the project and reviewer.
            // BUT the user asked for "score details".

            // Let's create a strategy:
            // Rows: Each Review
            // Cols: Project Info, Reviewer Info, [Dynamic Score Cols], Comment

            return "";
        };

        // Better approach for CSV:
        // Row = One Review
        // Columns = Project Name, Group, Reviewer, Type, [All Score Fields], Comment

        // Collect all unique score labels encountered to build dynamic headers if questions changed
        // OR use the current topic definition. Using topic definition is safer for order.

        const csvRows = [];

        reviews.forEach(review => {
            const project = projectMap[review.projectId.toString()];
            const rowData = {
                'Project Name': project ? project.projectName : 'Unknown Project',
                'Group Name': project ? project.groupName : '',
                'Reviewer Name': review.reviewerName || 'Anonymous',
                'Reviewer Type': review.userType,
                'Comment': review.comment || ''
            };

            // Fill scores
            // We iterate through the review's saved scores and try to put them in columns.
            // If we strictly follow topic schema, we might miss old questions if schema changed.
            // If we follow review scores, we get everything but maybe unordered.
            // Let's follow the review scores for maximum data retention.

            if (review.scores && Array.isArray(review.scores)) {
                review.scores.forEach(scoreItem => {
                    // Use the label from the score item as the column header
                    const header = scoreItem.label || 'Unknown Question';
                    rowData[header] = scoreItem.textValue || scoreItem.score;
                });
            }

            csvRows.push(rowData);
        });

        // Generate CSV
        const csv = Papa.unparse(csvRows, {
            quotes: true, // Force quotes to avoid issues with commas in text
        });

        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="survey_scores_${topic.title.replace(/[^a-z0-9]/gi, '_')}.csv"`,
            },
        });

    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
