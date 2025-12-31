import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { connectToDB } from '@/lib/db';
import PeerReview from '@/models/PeerReview';
import Topic from '@/models/Topic';

export async function POST(request, { params }) {
    const session = await getServerSession(authOptions);

    // 1. Validate Input
    const { id } = await params; // Topic ID
    const requestJson = await request.json();
    const { projectId, scores, comment, guestId, reviewerName: bodyReviewerName, feedbackType } = requestJson;

    if (!projectId || (!scores && comment === undefined)) {
        return NextResponse.json({ error: 'Missing Data' }, { status: 400 });
    }

    await connectToDB();

    // 2. Fetch Topic to check Permissions
    const topic = await Topic.findById(id);
    if (!topic) return NextResponse.json({ error: 'Topic not found' }, { status: 404 });

    const config = topic.presentationConfig || {};

    // 3. Determine User & Permissions
    let reviewerId = null;

    let reviewerName = 'Guest';
    let userType = 'guest';

    if (session?.user) {
        reviewerId = session.user.id;
        reviewerName = session.user.name;
        userType = session.user.role === 'teacher' ? 'teacher' : 'student';
    } else {
        // Guest Mode Check
        if (!config.allowGuest) {
            return NextResponse.json({ error: 'Unauthorized: Guest mode disabled' }, { status: 401 });
        }

        if (bodyReviewerName) reviewerName = bodyReviewerName;

        // Rate Limit Enforcement Requirement: Guest ID is mandatory if comments are rate-limited
        if (config.maxCommentsPerProject > 0 && !guestId && !reviewerId) {
            return NextResponse.json({ error: 'Guest ID required for comment rate limiting' }, { status: 400 });
        }
    }

    let result = null;

    // 4. Handle COMMENT (Append / Create New)
    if (comment !== undefined) {
        if (config.allowComments) {
            // Rate Limit Check
            if (config.maxCommentsPerProject > 0) {
                const countQuery = {
                    topicId: id,
                    projectId,
                    comment: { $exists: true, $ne: '' }
                };

                if (reviewerId) countQuery.reviewerId = reviewerId;
                else if (guestId) countQuery.guestId = guestId;

                const count = await PeerReview.countDocuments(countQuery);

                if (count >= config.maxCommentsPerProject) {
                    return NextResponse.json({ error: `Comment limit reached (${config.maxCommentsPerProject} max)` }, { status: 429 });
                }
            }

            // Allow multiple comments -> Create new document
            result = await PeerReview.create({
                topicId: id,
                projectId,
                reviewerId, // Null for guests
                guestId,    // String for guests
                reviewerName,
                userType,
                comment,
                feedbackType: feedbackType || 'comment',
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
    }

    // 5. Handle SCORES (Upsert / Update Single Entry)
    if (scores) {
        const query = { topicId: id, projectId };
        if (reviewerId) query.reviewerId = reviewerId;
        else if (guestId) query.guestId = guestId; // Now we can upsert for guests too!
        else {
            // Fallback if absolutely no ID (shouldn't happen with updated client)
            // We can't upsert reliably, so we create.
            // But let's assume guestId is present as we require it or client sends it.
        }

        if (reviewerId || guestId) {
            const updateOps = {
                $set: {
                    reviewerName,
                    userType,
                    scores,
                    updatedAt: new Date(),
                    ...(guestId ? { guestId } : {}) // Ensure guestId is saved
                },
                $setOnInsert: {
                    createdAt: new Date()
                }
            };

            // Should usually correspond to ONE score doc per user per project
            result = await PeerReview.findOneAndUpdate(
                query,
                updateOps,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        } else {
            // Fallback create
            result = await PeerReview.create({
                topicId: id,
                projectId,
                reviewerName,
                userType,
                scores,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
    }

    return NextResponse.json(result || { success: true });
}

export async function GET(request, { params }) {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const guestId = searchParams.get('guestId');

    if (!projectId) return NextResponse.json({ error: 'Missing Project ID' }, { status: 400 });

    await connectToDB();

    // Auth Check
    let reviewerId = null;
    if (session?.user) {
        reviewerId = session.user.id;
    } else {
        const topic = await Topic.findById(id).select('presentationConfig');
        if (!topic?.presentationConfig?.allowGuest) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // guestId is required for guest access
        if (!guestId) return NextResponse.json({ error: 'Guest ID required' }, { status: 400 });
    }

    const query = {
        topicId: id,
        projectId,
        comment: { $exists: true, $ne: '' }
    };

    if (reviewerId) query.reviewerId = reviewerId;
    else if (guestId) query.guestId = guestId;

    const reviews = await PeerReview.find(query).sort({ createdAt: -1 });

    return NextResponse.json(reviews);
}

export async function PUT(request, { params }) {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const { reviewId, comment, guestId, feedbackType } = await request.json();

    await connectToDB();

    let reviewerId = null;
    if (session?.user) {
        reviewerId = session.user.id;
    } else {
        const topic = await Topic.findById(id).select('presentationConfig');
        if (!topic?.presentationConfig?.allowGuest) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!guestId) return NextResponse.json({ error: 'Guest ID required' }, { status: 400 });
    }

    if (!reviewId || !comment) return NextResponse.json({ error: 'Missing Data' }, { status: 400 });

    const query = { _id: reviewId, topicId: id };
    if (reviewerId) query.reviewerId = reviewerId;
    else if (guestId) query.guestId = guestId;

    const result = await PeerReview.findOneAndUpdate(
        query,
        { $set: { comment, feedbackType: feedbackType || 'comment', updatedAt: new Date() } },
        { new: true }
    );

    if (!result) return NextResponse.json({ error: 'Review not found or unauthorized' }, { status: 404 });

    return NextResponse.json(result);
}

export async function DELETE(request, { params }) {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get('reviewId');
    const guestId = searchParams.get('guestId');

    await connectToDB();

    const topic = await Topic.findById(id);
    if (!topic) return NextResponse.json({ error: 'Topic not found' }, { status: 404 });

    // Check if user is the Topic Owner (Teacher)
    const isOwner = session?.user?.id && topic.teacherId && session.user.id === topic.teacherId.toString();

    let reviewerId = null;

    // Authorization Check
    if (!isOwner) {
        if (session?.user) {
            reviewerId = session.user.id;
        } else {
            if (!topic.presentationConfig?.allowGuest) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            if (!guestId) return NextResponse.json({ error: 'Guest ID required' }, { status: 400 });
        }
    }

    if (!reviewId) return NextResponse.json({ error: 'Missing Data' }, { status: 400 });

    const query = { _id: reviewId, topicId: id };

    // Enforce ownership if NOT teacher
    if (!isOwner) {
        if (reviewerId) query.reviewerId = reviewerId;
        else if (guestId) query.guestId = guestId;
        else return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await PeerReview.findOneAndDelete(query);

    if (!result) return NextResponse.json({ error: 'Review not found or unauthorized' }, { status: 404 });

    return NextResponse.json({ success: true });
}
