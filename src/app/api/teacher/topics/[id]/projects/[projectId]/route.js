import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDB } from '@/lib/db';
import ProjectSubmission from '@/models/ProjectSubmission';
import Topic from '@/models/Topic';

export async function DELETE(request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectToDB();
        const { id: topicId, projectId } = params;

        // Verify topic exists
        const topic = await Topic.findById(topicId);
        if (!topic) {
            return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
        }

        const project = await ProjectSubmission.findById(projectId);
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.topicId.toString() !== topicId) {
            return NextResponse.json({ error: 'Project does not belong to this topic' }, { status: 400 });
        }

        await ProjectSubmission.findByIdAndDelete(projectId);

        return NextResponse.json({ success: true, message: 'Project deleted' });
    } catch (error) {
        console.error('Delete project error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
