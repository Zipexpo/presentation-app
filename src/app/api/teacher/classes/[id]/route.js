import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDB } from '@/lib/db';
import Class from '@/models/Class';
import User from '@/models/User';
import ProjectSubmission from '@/models/ProjectSubmission';
import bcrypt from 'bcryptjs';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Roster files can spell the same name with different bytes (Vietnamese exported on macOS is NFD,
// stray double spaces), so names are compared cleaned and only real spelling changes count.
const cleanName = (value) => String(value ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

export async function GET(request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDB();
    const { id } = await params;
    const classData = await Class.findOne({ _id: id, teacherId: session.user.id })
        .populate('students', 'name email studentId accountCreationEmailSent');

    if (!classData) {
        return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    return NextResponse.json(classData);
}

// Import Students (CSV)
export async function POST(request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { students } = await request.json(); // Array of { name, email, studentId, birthday }
        if (!students || !Array.isArray(students)) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        await connectToDB();
        const { id } = await params;
        const classDoc = await Class.findOne({ _id: id, teacherId: session.user.id });
        if (!classDoc) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

        const addedStudentIds = [];
        const renamed = [];
        const errors = [];
        const { sendAccountCreationEmail } = await import('@/lib/email');

        for (const student of students) {
            const name = cleanName(student.name);
            if (!student.email || !name) {
                errors.push({ student, error: 'Missing email or name' });
                continue;
            }

            const email = student.email.trim().toLowerCase();
            const studentId = student.studentId ? String(student.studentId).trim() : null;

            // 1. Check if user exists. Student ID is the roster's identity key, so it wins over email,
            // but a row whose ID and email belong to two different accounts is ambiguous: skip it.
            const matches = await User.find({
                $or: [
                    { email: email },
                    ...(studentId ? [{ studentId: studentId }] : [])
                ]
            });
            const byStudentId = studentId ? matches.find(u => u.studentId === studentId) : undefined;
            const byEmail = matches.find(u => u.email === email);
            if (byStudentId && byEmail && byStudentId !== byEmail) {
                errors.push({
                    student: { email, name },
                    error: `Skipped: Student ID ${studentId} belongs to ${byStudentId.email}, but this email belongs to another account`,
                });
                continue;
            }
            let user = byStudentId || byEmail;

            // 2. If not, create
            if (!user) {
                // Auto-create
                // Password logic: 
                // If birthday provided (DD/MM/YYYY): 'p!' + 'DDMMYYYY'
                // Else: 'p!' + studentId + 'temp'

                let rawPassword = '';
                if (student.birthday) {
                    // Extract DDMMYYYY from DD/MM/YYYY
                    const parts = student.birthday.split('/');
                    if (parts.length === 3) {
                        rawPassword = `p!${parts[0]}${parts[1]}${parts[2]}`;
                    }
                }

                if (!rawPassword) {
                    rawPassword = `p!${studentId}temp`;
                }

                const hashedPassword = await bcrypt.hash(rawPassword, 10);

                try {
                    user = await User.create({
                        name: name,
                        email: email,
                        username: email, // Use email as username
                        studentId: studentId,
                        password: hashedPassword,
                        role: 'student',
                        profileCompleted: true,
                        mustChangePassword: true,
                        emailVerified: true, // Auto-verify imported students
                        accountCreationEmailSent: false // Default to false
                    });

                    // Add delay to prevent rate limiting (2 req/sec -> 500ms+ delay)
                    await delay(600);

                    // Send Email
                    const emailResult = await sendAccountCreationEmail(email, student.name, rawPassword, session.user.name);

                    if (emailResult.success) {
                        user.accountCreationEmailSent = true;
                        await user.save();
                    } else {
                        console.error(`Failed to send email to ${email}: ${emailResult.error}`);
                        // Don't fail the import, but surface the reason so the
                        // teacher knows why the student got no email.
                        errors.push({
                            student: { email, name },
                            error: 'Account created but email failed: ' + emailResult.error,
                        });
                    }

                } catch (createErr) {
                    errors.push({ student, error: 'Failed to create user: ' + createErr.message });
                    continue;
                }
            } else {
                // If existing user, update studentId if needed
                if (studentId && !user.studentId) {
                    user.studentId = studentId;
                    await user.save();
                }

                // Re-uploading a corrected roster is how teachers fix misspelled names, so the file's
                // name wins for the account holding this Student ID.
                if (studentId && cleanName(user.name) !== name) {
                    if (user.studentId !== studentId) {
                        errors.push({
                            student: { email, name },
                            error: `Name not updated: this account's Student ID is ${user.studentId}, not ${studentId}`,
                        });
                    } else if (user.role !== 'student') {
                        errors.push({
                            student: { email, name },
                            error: `Name not updated: ${user.email} is a ${user.role} account`,
                        });
                    } else {
                        // Project groups keep their own copy of each member's name, and "Add Me" leaves
                        // the copy's studentId empty, so fix copies by either key. Copies go first: if
                        // the account update then fails, a retry still sees the old name and redoes both.
                        for (const [key, value] of Object.entries({ studentId, email: user.email })) {
                            if (!value) continue; // an empty key would match every copy lacking it
                            await ProjectSubmission.updateMany(
                                { [`members.${key}`]: value },
                                { $set: { 'members.$[m].name': name } },
                                { arrayFilters: [{ [`m.${key}`]: value }] }
                            );
                        }
                        await User.updateOne({ _id: user._id }, { $set: { name } });
                        renamed.push({ studentId, from: user.name, to: name });
                    }
                }
            }

            // 3. Add to Class
            if (!classDoc.students.includes(user._id)) {
                classDoc.students.push(user._id);
                addedStudentIds.push(user._id);
            }
        }

        await classDoc.save();

        return NextResponse.json({
            success: true,
            addedCount: addedStudentIds.length,
            renamed,
            errors
        });

    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { name } = await request.json();
        if (!name || !name.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        await connectToDB();
        const { id } = await params;

        const updatedClass = await Class.findOneAndUpdate(
            { _id: id, teacherId: session.user.id },
            { name: name.trim() },
            { new: true }
        );

        if (!updatedClass) {
            return NextResponse.json({ error: 'Class not found' }, { status: 404 });
        }

        return NextResponse.json(updatedClass);
    } catch (error) {
        console.error('Update class error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
