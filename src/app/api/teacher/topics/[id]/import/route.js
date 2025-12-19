import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDB } from '@/lib/db';
import ProjectSubmission from '@/models/ProjectSubmission';
import Topic from '@/models/Topic';

async function requireTeacher() {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
        return null;
    }
    return session;
}

export async function POST(request, { params }) {
    const session = await requireTeacher();
    if (!session) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: topicId } = params;
    const { projects } = await request.json();

    if (!projects || !Array.isArray(projects)) {
        return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    await connectToDB();

    // Validate Topic exists and belongs to teacher?
    const topic = await Topic.findById(topicId);
    if (!topic) {
        return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    // Optional: Check if topic belongs to this teacher
    // if (topic.teacherId.toString() !== session.user.id) ...

    const createdProjects = [];
    const errors = [];

    for (const p of projects) {
        try {
            // Basic validation
            if (!p.projectName) {
                errors.push({ project: p, error: 'Missing Project Name' });
                continue;
            }

            // Create
            const newProject = await ProjectSubmission.create({
                topicId,
                groupNumber: p.groupNumber,
                projectName: p.projectName,
                members: p.members || [], // Array of { name, studentId, email }
                // Default other fields
            });
            createdProjects.push(newProject);
        } catch (err) {
            console.error('Import error:', err);
            errors.push({ project: p, error: err.message });
        }
    }

    return NextResponse.json({
        success: true,
        importedCount: createdProjects.length,
        projects: createdProjects,
        errors
    });
}
