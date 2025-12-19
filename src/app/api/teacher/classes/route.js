import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDB } from '@/lib/db';
import Class from '@/models/Class';

export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDB();
    const classes = await Class.find({ teacherId: session.user.id }).sort({ createdAt: -1 });
    return NextResponse.json(classes);
}

export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        await connectToDB();
        const newClass = await Class.create({
            name,
            teacherId: session.user.id,
            students: []
        });

        return NextResponse.json(newClass, { status: 201 });
    } catch (error) {
        console.error('Error creating class:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
