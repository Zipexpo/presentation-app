import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDB } from '@/lib/db';
import Topic from '@/models/Topic';
import ProjectSubmission from '@/models/ProjectSubmission';

async function requireTeacher() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
    return null;
  }
  return session;
}

export async function GET(_req, { params }) {
  const session = await requireTeacher();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectToDB();
  const { id } = await params;

  // Find topic first to check permissions (Owner OR Invited)
  const topic = await Topic.findById(id).lean();

  if (!topic) {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  }

  // Check access
  const isOwner = topic.teacherId.toString() === session.user.id;
  const isInvited = topic.invitedTeachers?.includes(session.user.email);

  if (!isOwner && !isInvited) {
    // If not owner and not invited, deny.
    // NOTE: In future we might want Admin bypass? Currently Schema says teacherId required.
    // If Admin, maybe allow? existing code allowed admin in requireTeacher but tied find to teacherId.
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const projects = await ProjectSubmission.find(
    { topicId: id }
  )
    .sort({ submittedAt: 1 })
    .lean();

  return NextResponse.json({ topic, projects, isOwner });
}

export async function POST(request, { params }) {
  const session = await requireTeacher();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectToDB();
  const { id } = await params;

  const topic = await Topic.findOne({
    _id: id,
    teacherId: session.user.id,
  });

  if (!topic) {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  }

  const { projectName, groupNumber } = await request.json();

  if (!projectName) {
    return NextResponse.json(
      { error: 'Project name is required' },
      { status: 400 }
    );
  }

  const project = await ProjectSubmission.create({
    topicId: topic._id,
    projectName,
    groupNumber,
    members: [],
  });

  return NextResponse.json(project, { status: 201 });
}

export async function PUT(request, { params }) {
  const session = await requireTeacher();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { title, description, submissionDeadline, presentationDate, submissionConfig, resourceRequirements, classId, presentationConfig } = body;

  await connectToDB();

  // Construct update object to avoid overwriting with undefined or crashing on invalid dates
  const updateData = { updatedAt: new Date() };

  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (submissionDeadline) updateData.submissionDeadline = new Date(submissionDeadline);
  if (presentationDate) updateData.presentationDate = new Date(presentationDate);
  if (submissionConfig) updateData.submissionConfig = submissionConfig;
  if (resourceRequirements) updateData.resourceRequirements = resourceRequirements;
  if (presentationConfig) updateData.presentationConfig = presentationConfig;
  if (classId !== undefined) updateData.classId = classId;
  if (body.invitedTeachers) updateData.invitedTeachers = body.invitedTeachers; // Allow updating invites

  const topic = await Topic.findOneAndUpdate(
    { _id: id, teacherId: session.user.id },
    updateData,
    { new: true }
  );

  if (!topic) {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  }

  return NextResponse.json(topic);
}


