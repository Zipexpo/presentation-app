import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { connectToDB } from '@/lib/db';
import Topic from '@/models/Topic';
import ProjectSubmission from '@/models/ProjectSubmission';

export async function POST(request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { action, projectId, phase } = await request.json();

    await connectToDB();

    const topic = await Topic.findOne({ _id: id, teacherId: session.user.id });
    if (!topic) {
        return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    const now = new Date();
    let update = {};

    switch (action) {
        case 'start':
            // Start specific project or resume
            update = {
                'activeSession.status': 'active',
                'activeSession.currentProjectId': projectId,
                'activeSession.currentPhase': 'presentation', // Always start with presentation
                'activeSession.startTime': now, // Reset timer
                'activeSession.pauseTime': null
            };
            break;

        case 'nextPhase':
            // Cycle: presentation -> qa -> break -> next project (presentation)
            const currentPhase = topic.activeSession?.currentPhase || 'presentation';
            let nextPhase = 'presentation';
            let nextProjectId = topic.activeSession?.currentProjectId;

            console.log('[API] nextPhase Request:', { currentPhase, projectIdFromBody: projectId });

            // Should next project be triggered?
            let shouldMoveToNextProject = false;

            if (currentPhase === 'presentation') {
                nextPhase = 'qa';
            } else if (currentPhase === 'qa') {
                nextPhase = 'break';
            } else if (currentPhase === 'break') {
                shouldMoveToNextProject = true;
                nextPhase = 'presentation';
            }

            console.log('[API] Calculated Next Phase:', nextPhase);

            if (shouldMoveToNextProject) {
                // Check if this is the last project using DB source of truth
                // We need the list of projects to know if there is a "next" one.
                const projects = await ProjectSubmission.find({ topicId: id })
                    .sort({ groupNumber: 1, submittedAt: 1 }) // Must match frontend sort
                    .select('_id')
                    .lean();

                // Find current index
                const currentIdx = projects.findIndex(p => p._id.toString() === topic.activeSession?.currentProjectId?.toString());

                console.log('[API] DB Check:', {
                    totalProjects: projects.length,
                    currentId: topic.activeSession?.currentProjectId,
                    foundIndex: currentIdx
                });

                if (currentIdx !== -1 && currentIdx + 1 >= projects.length) {
                    // Last project break ended. STOP.
                    console.log('[API] Last project finished. Stopping session.');
                    update = {
                        'activeSession.status': 'idle',
                        'activeSession.currentProjectId': null,
                        'activeSession.startTime': null,
                        'activeSession.pauseTime': null
                    };
                    break; // Exit the switch, apply update
                }

                // Normal transition to next project
                if (projectId) {
                    // Use provided ID if available (from frontend calc)
                    nextProjectId = projectId;
                } else if (currentIdx !== -1 && projects[currentIdx + 1]) {
                    // Fallback: calculate server side if frontend didn't send it? 
                    // Frontend sends it usually. But let's trust frontend if sent.
                    // Actually, let's use the one found from DB if appropriate?
                    // Safe to trust payload.projectId if we trust frontend sequence.
                    // But for consistency:
                    nextProjectId = projects[currentIdx + 1]._id;
                }

                console.log('[API] Moving to Next Project:', nextProjectId);
            }

            update = {
                'activeSession.status': 'active',
                'activeSession.currentPhase': nextPhase,
                'activeSession.currentProjectId': nextProjectId,
                'activeSession.startTime': now,
                'activeSession.pauseTime': null
            };
            break;

        case 'setPhase':
            // Manual phase jump (Reset timer)
            console.log('[API] setPhase:', phase, 'Current Project:', topic.activeSession?.currentProjectId);

            update = {
                'activeSession.status': 'active',
                'activeSession.currentPhase': phase || 'presentation',
                'activeSession.startTime': now,
                'activeSession.pauseTime': null
            };
            break;

        case 'next':
            // Force jump to next project (skip phases)
            update = {
                'activeSession.status': 'active',
                'activeSession.currentProjectId': projectId,
                'activeSession.currentPhase': 'presentation',
                'activeSession.startTime': now,
                'activeSession.pauseTime': null
            };
            break;

        case 'pause':
            update = {
                'activeSession.status': 'paused',
                'activeSession.pauseTime': now
            };
            break;

        case 'resume':
            // Calculate new start time to account for pause duration
            // If pauseTime was T_pause, and now is T_resume, we shift startTime forward by (T_resume - T_pause)
            /* 
               This logic is complex if we want "exact" resumption of valid timer.
               For simplicity:
               If we just "resume", we might just want to continue counting down.
               But if we set status to 'active' and clear pauseTime, the client can calculate offset.
               Let's just toggle status. The client needs to handle the visual timer based on 'elapsed' if needed.
               OR: We shift startTime so that (now - startTime) equals the previous elapsed.
               Elapsed before pause = pauseTime - oldStartTime.
               New Start Time = now - Elapsed.
            */
            let newStartTime = now;
            if (topic.activeSession?.startTime && topic.activeSession?.pauseTime) {
                const elapsed = new Date(topic.activeSession.pauseTime) - new Date(topic.activeSession.startTime);
                newStartTime = new Date(now.getTime() - elapsed);
            }

            update = {
                'activeSession.status': 'active',
                'activeSession.startTime': newStartTime,
                'activeSession.pauseTime': null
            };
            break;

        case 'stop':
            update = {
                'activeSession.status': 'idle',
                'activeSession.currentProjectId': null,
                'activeSession.startTime': null,
                'activeSession.pauseTime': null
            };
            break;

        default:
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updatedTopic = await Topic.findByIdAndUpdate(id, update, { new: true });
    return NextResponse.json(updatedTopic);
}
