
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDB } from '@/lib/db';
import Class from '@/models/Class';
import Topic from '@/models/Topic'; // Register Topic model
import ProjectSubmission from '@/models/ProjectSubmission';
import User from '@/models/User';

export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectToDB();
        const userId = session.user.id;
        const userEmail = session.user.email;
        // Get user to find studentId if needed
        const user = await User.findById(userId);
        const studentId = user?.studentId;

        // 1. Fetch Enrolled Classes
        const classes = await Class.find({ students: userId })
            .select('name teacherId _id')
            .populate('teacherId', 'name email');

        // 2. Fetch Project Submissions
        // Match if user is submitter OR is in members list (by email or studentId)
        const submissionQuery = {
            $or: [
                { submitterId: userId },
                { "members.email": userEmail },
                // If studentId exists, check that too
                ...(studentId ? [{ "members.studentId": studentId }] : [])
            ]
        };

        const submissions = await ProjectSubmission.find(submissionQuery)
            .populate('topicId', 'title') // Populate topic title
            .sort({ submittedAt: -1 });

        // 3. Get Linked Accounts (Providers only)
        // Re-fetch user to ensure fresh data if not fetched above fully
        const freshUser = await User.findById(userId).select('accounts');
        const linkedProviders = freshUser?.accounts?.map(acc => acc.provider) || [];

        return NextResponse.json({
            classes,
            submissions,
            linkedProviders
        });

    } catch (error) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
