import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDB } from '@/lib/db';
import RubricPreset from '@/models/RubricPreset';

export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDB();
    const presets = await RubricPreset.find({ teacherId: session.user.id }).sort({ createdAt: -1 });
    return NextResponse.json(presets);
}

export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, type, data } = await request.json();
    if (!name || !type || !data) {
        return NextResponse.json({ error: 'Missing Data' }, { status: 400 });
    }

    await connectToDB();
    const newPreset = await RubricPreset.create({
        teacherId: session.user.id,
        name,
        type,
        data
    });

    return NextResponse.json(newPreset);
}
