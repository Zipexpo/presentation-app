import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDB } from '@/lib/db';
import ProjectSubmission from '@/models/ProjectSubmission';
import Topic from '@/models/Topic';
import User from '@/models/User';

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

    // 1. Collect all emails to look up
    const allEmails = new Set();
    projects.forEach(p => {
        if (p.members && Array.isArray(p.members)) {
            p.members.forEach(m => {
                if (m.email) allEmails.add(m.email.toLowerCase().trim());
            });
        }
    });

    // 2. Lookup Users
    const users = await User.find({ email: { $in: Array.from(allEmails) } }).lean();
    const userMap = {};
    users.forEach(u => {
        userMap[u.email.toLowerCase()] = u;
    });

    const createdProjects = [];
    const errors = [];

    for (const p of projects) {
        try {
            // Basic validation
            if (!p.projectName) {
                errors.push({ project: p, error: 'Missing Project Name' });
                continue;
            }

            // Hydrate members
            const hydratedMembers = (p.members || []).map(m => {
                const email = m.email?.toLowerCase().trim();
                const user = userMap[email];
                if (user) {
                    return {
                        email: user.email,
                        name: user.name,
                        studentId: user.studentId
                    };
                }
                // Fallback for non-registered users
                return {
                    email: m.email,
                    name: m.email?.split('@')[0] || 'Unknown', // Fallback name
                    studentId: ''
                };
            });

            // Create
            const newProject = await ProjectSubmission.create({
                topicId,
                groupNumber: p.groupNumber,
                groupName: p.groupName,
                projectName: p.projectName,
                members: hydratedMembers,
                videoLink: p.videoLink,
                presentationLink: p.presentationLink,
                sourceCodeLink: p.sourceCodeLink,
                thumbnailUrl: p.thumbnailUrl,
                resources: p.resources || [],
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
