import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDB } from '@/lib/db';
import Class from '@/models/Class';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
        const errors = [];
        const { sendAccountCreationEmail } = await import('@/lib/email');

        for (const student of students) {
            if (!student.email || !student.name) {
                errors.push({ student, error: 'Missing email or name' });
                continue;
            }

            const email = student.email.toLowerCase();
            const studentId = student.studentId || null;

            // 1. Check if user exists
            let user = await User.findOne({
                $or: [
                    { email: email },
                    ...(studentId ? [{ studentId: studentId }] : [])
                ]
            });

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
                        name: student.name,
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
                        // Don't fail the import, just log, user will see status in UI
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
