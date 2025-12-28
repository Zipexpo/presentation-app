import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDB } from '@/lib/db';
import Topic from '@/models/Topic';
import ProjectSubmission from '@/models/ProjectSubmission';

export async function GET(req, { params }) {
    await connectToDB();
    const { id } = await params;

    const topic = await Topic.findById(id).select('title presentationConfig activeSession').lean();

    if (!topic) {
        return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    // Check Auth vs Guest Permission
    const session = await getServerSession(authOptions);
    const allowGuest = topic.presentationConfig?.allowGuest;

    if (!session?.user && !allowGuest) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let currentProject = null;

    if (topic.activeSession?.currentProjectId) {
        currentProject = await ProjectSubmission.findById(topic.activeSession.currentProjectId)
            .select('projectName groupNumber members videoLink presentationLink sourceCodeLink storageLink resources additionalMaterials')
            .lean();
    }

    return NextResponse.json({
        topicTitle: topic.title,
        config: topic.presentationConfig,
        session: topic.activeSession,
        currentProject
    });
}
