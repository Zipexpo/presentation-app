import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { connectToDB } from '@/lib/db';
import RubricPreset from '@/models/RubricPreset';

export async function DELETE(request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDB();

    const deleted = await RubricPreset.findOneAndDelete({ _id: id, teacherId: session.user.id });
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true });
}
