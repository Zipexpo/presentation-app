import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDB } from '@/lib/db';
import Class from '@/models/Class';
import SyncLink from '@/models/SyncLink';

const TTL_MINUTES = 30;

/**
 * Mint a one-time confirmation code so an external app (Teamwo) may sync ONE group.
 *
 * Body: { kind: 'export' | 'import', classId? }
 *   export → Teamwo pulls this class in (classId required)
 *   import → Teamwo pushes a group here; classId updates that class, omitted creates a new one
 *
 * The raw code is returned exactly once — only its hash is stored.
 */
export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session || !['teacher', 'admin'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { kind, classId } = await request.json();
        if (!['export', 'import'].includes(kind)) {
            return NextResponse.json({ error: 'kind must be "export" or "import"' }, { status: 400 });
        }
        if (kind === 'export' && !classId) {
            return NextResponse.json({ error: 'classId is required to export a class' }, { status: 400 });
        }

        await connectToDB();

        // A teacher may only mint codes for their own classes.
        if (classId) {
            const cls = await Class.findById(classId).select('teacherId').lean();
            if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 });
            if (session.user.role !== 'admin' && String(cls.teacherId) !== String(session.user.id)) {
                return NextResponse.json({ error: 'Not your class' }, { status: 403 });
            }
        }

        const code = SyncLink.generateCode();
        await SyncLink.create({
            codeHash: SyncLink.hashCode(code),
            prefix: code.slice(0, 9),
            kind,
            classId: classId || undefined,
            createdBy: session.user.id,
            expiresAt: new Date(Date.now() + TTL_MINUTES * 60_000),
        });

        return NextResponse.json({ success: true, code, kind, expiresInMinutes: TTL_MINUTES }, { status: 201 });
    } catch (error) {
        console.error('Error minting sync code:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
