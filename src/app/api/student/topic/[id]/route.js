import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDB } from '@/lib/db';
import Topic from '@/models/Topic';
import ProjectSubmission from '@/models/ProjectSubmission';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
    try {
        const { id } = await params;
        await connectToDB();

        // Include submissionConfig
        const topic = await Topic.findById(id, 'title description submissionDeadline presentationDate submissionConfig resourceRequirements classId');

        if (!topic) {
            return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
        }

        // Check for existing submission if user is logged in
        const session = await getServerSession(authOptions);
        let existingSubmission = null;

        if (session?.user?.id) {
            // Find by submitterId OR if user's email is in members list
            const user = await User.findById(session.user.id);
            const userEmail = user?.email;

            const query = { topicId: id };

            if (userEmail) {
                query.$or = [
                    { submitterId: session.user.id },
                    { 'members.email': userEmail }
                ];
            } else {
                query.submitterId = session.user.id;
            }

            existingSubmission = await ProjectSubmission.findOne(query);
        }

        return NextResponse.json({ topic, existingSubmission });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
