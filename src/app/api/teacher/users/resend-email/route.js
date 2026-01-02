import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDB } from '@/lib/db';
import User from '@/models/User';
import Class from '@/models/Class';
import { sendAccountCreationEmail } from '@/lib/email';
import bcrypt from 'bcryptjs';

export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { userId, classId } = await request.json();

        if (!userId || !classId) {
            return NextResponse.json({ error: 'Missing userId or classId' }, { status: 400 });
        }

        await connectToDB();

        // Verify teacher owns the class
        const classDoc = await Class.findOne({ _id: classId, teacherId: session.user.id });
        if (!classDoc) {
            return NextResponse.json({ error: 'Class not found or unauthorized' }, { status: 404 });
        }

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Generate a new temporary password
        // Always allow resending, even if profile is completed.
        // This acts as a manual password reset by the teacher.

        // We must generate a NEW temp password.
        let newTempPassword = `p!${user.studentId || Math.random().toString(36).slice(-6)}new`;

        // Update password
        const hashedPassword = await bcrypt.hash(newTempPassword, 10);
        user.password = hashedPassword;
        user.mustChangePassword = true;

        // Send Email
        const emailResult = await sendAccountCreationEmail(user.email, user.name, newTempPassword, session.user.name);

        if (emailResult.success) {
            user.accountCreationEmailSent = true;
            await user.save();
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Failed to send email: ' + emailResult.error }, { status: 500 });
        }

    } catch (error) {
        console.error('Resend email error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
