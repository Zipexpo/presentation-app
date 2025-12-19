import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
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

  const topic = await Topic.findOne({
    _id: id,
    teacherId: session.user.id,
  }).lean();

  if (!topic) {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  }

  const projects = await ProjectSubmission.find(
    { topicId: params.id }
  )
    .sort({ submittedAt: 1 })
    .lean();

  return NextResponse.json({ topic, projects });
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
  const { title, description, submissionDeadline, presentationDate, submissionConfig, resourceRequirements, classId } = body;

  await connectToDB();

  const topic = await Topic.findOneAndUpdate(
    { _id: id, teacherId: session.user.id },
    {
      title,
      description,
      submissionDeadline: new Date(submissionDeadline),
      presentationDate: new Date(presentationDate),
      submissionConfig,
      resourceRequirements,
      classId: classId || undefined, // Added classId update
      updatedAt: new Date()
    },
    { new: true }
  );

  if (!topic) {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  }

  return NextResponse.json(topic);
}


