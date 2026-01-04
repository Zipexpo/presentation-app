import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDB } from '@/lib/db';
import ProjectSubmission from '@/models/ProjectSubmission';
import Topic from '@/models/Topic';
import User from '@/models/User';
import { getGoogleDriveDirectLink, getGoogleDrivePreviewLink } from '@/lib/utils';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { topicId, groupNumber, projectName, members, links, resources, additionalMaterials } = body;

        if (!topicId || !projectName) {
            return NextResponse.json({ error: 'Topic ID and Project Name are required' }, { status: 400 });
        }

        await connectToDB();

        const topic = await Topic.findById(topicId);
        if (!topic) {
            return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
        }

        const now = new Date();
        if (topic.submissionDeadline && now > new Date(topic.submissionDeadline)) {
            return NextResponse.json({ error: 'Submission deadline has passed' }, { status: 400 });
        }

        // CLASS RESTRICTION CHECK
        if (topic.classId) {
            // Need Class Model here? Yes.
            // But I cannot import Class here easily if not already top level?
            // Actually I can import it.
            const ClassModel = (await import('@/models/Class')).default;
            const classDoc = await ClassModel.findById(topic.classId);

            if (classDoc) {
                const allowedStudentIds = classDoc.students.map(id => id.toString());

                // 1. Check Submitter
                if (!allowedStudentIds.includes(session.user.id)) {
                    return NextResponse.json({ error: 'You are not enrolled in this class.' }, { status: 403 });
                }

                // 2. Check Members
                // We need to verify that provided member emails belong to users in the allowed list.
                // Or simplified: Just check if their email matches any user in the allowed list.
                // Let's get all allowed users' emails.
                const allowedUsers = await User.find({ _id: { $in: classDoc.students } }, 'email studentId');
                const allowedEmails = new Set(allowedUsers.map(u => u.email.toLowerCase()));
                const allowedStudentIdsSet = new Set(allowedUsers.map(u => u.studentId));

                for (const member of members) {
                    const email = member.email?.toLowerCase();
                    const sId = member.studentId;

                    // If neither email nor ID is in allowed list, reject.
                    // Note: member might just be free text if manual?
                    // User said "restrict to class". Explicitly.
                    // So we should NOT allow random people.
                    const isAllowed = (email && allowedEmails.has(email)) || (sId && allowedStudentIdsSet.has(sId));

                    if (!isAllowed) {
                        return NextResponse.json({
                            error: `Team member ${member.name} (${email || sId}) is not in this class.`
                        }, { status: 400 });
                    }
                }
            }
        }

        // Check if there's an existing submission for this topic that this user can edit
        // (Either they are the submitter, OR they are in the members list)
        const user = await User.findById(session.user.id);
        const userEmail = user?.email;

        let matchQuery = { topicId, submitterId: session.user.id };
        if (userEmail) {
            matchQuery = {
                topicId,
                $or: [
                    { submitterId: session.user.id },
                    { 'members.email': userEmail }
                ]
            };
        }

        let existing = await ProjectSubmission.findOne(matchQuery);

        let submission;
        if (existing) {
            // Update existing
            existing.groupNumber = groupNumber;
            existing.projectName = projectName;
            existing.members = members;
            existing.videoLink = links?.video;

            // Apply transformations
            existing.presentationLink = links?.presentation ? getGoogleDrivePreviewLink(links.presentation) : undefined;
            existing.storageLink = links?.storage;
            existing.sourceCodeLink = links?.sourceCode;
            existing.thumbnailUrl = links?.thumbnailUrl ? getGoogleDriveDirectLink(links.thumbnailUrl) : undefined;

            // Transform dynamic resources
            existing.resources = (resources || []).map(r => {
                if (r.type === 'image') return { ...r, url: getGoogleDriveDirectLink(r.url) };
                if (r.type === 'presentation') return { ...r, url: getGoogleDrivePreviewLink(r.url) };
                return r;
            });

            existing.additionalMaterials = additionalMaterials || [];
            existing.submittedAt = now;
            submission = await existing.save();
        } else {
            // Create new
            submission = await ProjectSubmission.create({
                topicId,
                submitterId: session.user.id,
                groupNumber,
                projectName,
                members,
                videoLink: links?.video,
                presentationLink: links?.presentation ? getGoogleDrivePreviewLink(links.presentation) : undefined,
                storageLink: links?.storage,
                sourceCodeLink: links?.sourceCode,
                thumbnailUrl: links?.thumbnailUrl ? getGoogleDriveDirectLink(links.thumbnailUrl) : undefined,
                resources: (resources || []).map(r => {
                    if (r.type === 'image') return { ...r, url: getGoogleDriveDirectLink(r.url) };
                    if (r.type === 'presentation') return { ...r, url: getGoogleDrivePreviewLink(r.url) };
                    return r;
                }),
                additionalMaterials: additionalMaterials || [],
                submittedAt: now
            });
        }

        return NextResponse.json({ success: true, submission }, { status: 201 });
    } catch (error) {
        console.error('Submission error:', error);
        return NextResponse.json({ error: 'Failed to submit project' }, { status: 500 });
    }
}
