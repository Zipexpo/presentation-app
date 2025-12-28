import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDB } from '@/lib/db';
import PeerReview from '@/models/PeerReview';
import Topic from '@/models/Topic';

export async function GET(request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectToDB();
    const { id } = await params;

    // Validate Topic Ownership
    const topic = await Topic.findOne({ _id: id, teacherId: session.user.id });
    if (!topic) {
        return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const query = { topicId: id };
    if (projectId) {
        query.projectId = projectId;
    }

    const reviews = await PeerReview.find(query)
        .sort({ createdAt: -1 })
        .lean();

    return NextResponse.json(reviews);
}
