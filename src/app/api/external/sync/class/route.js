import { NextResponse } from 'next/server';
import { connectToDB } from '@/lib/db';
import Class from '@/models/Class';
import User from '@/models/User';
import SyncLink from '@/models/SyncLink';
import { validateApiKey } from '@/lib/apiAuth';

/**
 * Group sync with an external app (Teamwo). Two gates apply to every call: a valid `x-api-key`
 * header AND a one-time confirmation code minted by the class's teacher, which scopes the request
 * to exactly one class and one direction. See models/SyncLink.js.
 *
 *   POST { code, externalRef? }                      → pull one class out (code kind 'export')
 *   PUT  { code, name, members[], note?, externalRef? } → push a group in  (code kind 'import')
 *
 * Members are matched to accounts by email; unknown emails are created as students (no password —
 * they sign in with Google/Microsoft, or get one set later), so identity stays owned by this app.
 */

function publicUser(u) {
    return {
        id: String(u._id),
        email: u.email,
        name: u.name,
        role: u.role,
        studentId: u.studentId ?? null,
        school: u.school ?? null,
        faculty: u.faculty ?? null,
        cohort: u.cohort ?? null,
    };
}

// --- PULL: external app imports this class -------------------------------------------------
export async function POST(req) {
    const authResult = await validateApiKey(req, 'sync:class');
    if (!authResult.isValid) return authResult.errorResponse;

    try {
        const { code, externalRef } = await req.json();
        await connectToDB();

        const consumed = await SyncLink.consume(code, 'export', externalRef);
        if (!consumed.ok) return NextResponse.json({ error: consumed.error }, { status: 403 });

        const cls = await Class.findById(consumed.link.classId)
            .populate('teacherId', 'name email role studentId school faculty cohort')
            .populate('students', 'name email role studentId school faculty cohort')
            .lean();
        if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

        return NextResponse.json({
            success: true,
            class: {
                id: String(cls._id),
                name: cls.name,
                note: cls.note ?? '',
                // The teacher is NOT a presenter on the external side either — it is up to the
                // external app whether to appoint them (e.g. as mentor) after the import.
                teacher: cls.teacherId ? publicUser(cls.teacherId) : null,
                students: (cls.students ?? []).map(publicUser),
            },
        });
    } catch (error) {
        console.error('Error exporting class:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// --- PUSH: external app sends a group here --------------------------------------------------
export async function PUT(req) {
    const authResult = await validateApiKey(req, 'sync:class');
    if (!authResult.isValid) return authResult.errorResponse;

    try {
        const body = await req.json();
        const { code, name, members, note, externalRef } = body;
        if (!Array.isArray(members)) {
            return NextResponse.json({ error: 'members[] is required' }, { status: 400 });
        }

        await connectToDB();
        const consumed = await SyncLink.consume(code, 'import', externalRef);
        if (!consumed.ok) return NextResponse.json({ error: consumed.error }, { status: 403 });

        // Resolve every member to an account by email, creating the ones we've never seen.
        const studentIds = [];
        let created = 0;
        for (const m of members) {
            const email = String(m?.email ?? '').trim().toLowerCase();
            if (!email) continue;
            let user = await User.findOne({ email });
            if (!user) {
                user = await User.create({
                    email,
                    name: m.name || email.split('@')[0],
                    role: 'student',
                    emailVerified: false,
                    profileCompleted: false,
                    ...(m.studentId ? { studentId: m.studentId } : {}),
                    ...(m.school ? { school: m.school } : {}),
                    ...(m.faculty ? { faculty: m.faculty } : {}),
                    ...(m.cohort ? { cohort: m.cohort } : {}),
                });
                created++;
            }
            studentIds.push(user._id);
        }

        const teacherId = consumed.link.createdBy;
        let cls;
        if (consumed.link.classId) {
            // Merge into the existing class — never drop students who are already there.
            cls = await Class.findById(consumed.link.classId);
            if (!cls) return NextResponse.json({ error: 'Target class not found' }, { status: 404 });
            const existing = new Set(cls.students.map(String));
            for (const id of studentIds) if (!existing.has(String(id))) cls.students.push(id);
            if (name) cls.name = name;
            if (note != null) cls.note = note;
            if (externalRef) { cls.externalSource = 'teamwo'; cls.externalTeamId = String(externalRef); }
            await cls.save();
        } else {
            cls = await Class.create({
                name: name || 'Imported group',
                teacherId,
                students: studentIds,
                note: note ?? '',
                externalSource: 'teamwo',
                externalTeamId: externalRef ? String(externalRef) : undefined,
            });
        }

        return NextResponse.json({
            success: true,
            classId: String(cls._id),
            name: cls.name,
            students: cls.students.length,
            accountsCreated: created,
        }, { status: 201 });
    } catch (error) {
        console.error('Error importing class:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
