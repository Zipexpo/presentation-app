import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDB } from '@/lib/db';
import Topic from '@/models/Topic';

async function requireTeacher() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireTeacher();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectToDB();
  const topics = await Topic.find(
    { teacherId: session.user.id },
    'title description submissionDeadline presentationDate createdAt'
  )
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(topics);
}

export async function POST(request) {
  const session = await requireTeacher();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { title, description, submissionDeadline, presentationDate, submissionConfig, classId } =
      await request.json();

    if (!title || !description || !submissionDeadline || !presentationDate) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    await connectToDB();

    const topic = await Topic.create({
      title,
      description,
      teacherId: session.user.id,
      submissionDeadline: new Date(submissionDeadline),
      presentationDate: new Date(presentationDate),
      submissionConfig: submissionConfig || {},
      classId: classId || undefined,
    });

    return NextResponse.json(topic.toObject(), { status: 201 });
  } catch (error) {
    console.error('Error creating topic:', error);
    return NextResponse.json({ error: 'Failed to create topic' }, { status: 500 });
  }
}


