import { NextResponse } from 'next/server';
import { connectToDB } from '@/lib/db';
import User from '@/models/User';
import { validateApiKey } from '@/lib/apiAuth';
import bcrypt from 'bcryptjs';

// GET: Fetch a list of all users. Can filter by ?role=student or ?role=teacher
export async function GET(req) {
    const authResult = await validateApiKey(req);
    if (!authResult.isValid) return authResult.errorResponse;

    try {
        await connectToDB();
        const url = new URL(req.url);
        const role = url.searchParams.get('role');

        const query = {};
        if (role) {
            query.role = role;
        }

        // Return users without passwords
        const users = await User.find(query).select('-password').sort({ createdAt: -1 }).lean();

        return NextResponse.json({ success: true, count: users.length, users });
    } catch (error) {
        console.error('Error fetching external users:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Create a new user (Admin-level action from external app)
export async function POST(req) {
    const authResult = await validateApiKey(req);
    if (!authResult.isValid) return authResult.errorResponse;

    try {
        const body = await req.json();
        const { email, name, password, role, studentId } = body;

        if (!email || !name || !password) {
            return NextResponse.json({ error: 'Email, name, and password are required' }, { status: 400 });
        }

        await connectToDB();

        // Check for existing user
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
        }

        // Optional: Hash the password. NextAuth uses bcrypt.
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            email,
            name,
            password: hashedPassword,
            role: role || 'student', // Default to student
            studentId: studentId || undefined
        });

        // Send the welcome email with credentials (best-effort — never block
        // account creation on email delivery). External apps create accounts
        // through this endpoint, so without this the student never gets notified.
        let emailSent = false;
        let emailError = null;
        try {
            const { sendAccountCreationEmail } = await import('@/lib/email');
            const emailResult = await sendAccountCreationEmail(email, name, password, 'System');
            emailSent = !!emailResult.success;
            if (emailSent) {
                newUser.accountCreationEmailSent = true;
                await newUser.save();
            } else {
                emailError = emailResult.error;
                console.error(`External create: failed to email ${email}:`, emailResult.error);
            }
        } catch (e) {
            emailError = e.message;
            console.error('External create: email error:', e);
        }

        // Return profile without password
        const userProfile = {
            id: newUser._id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
            studentId: newUser.studentId,
            createdAt: newUser.createdAt
        };

        return NextResponse.json(
            { success: true, user: userProfile, emailSent, emailError },
            { status: 201 }
        );

    } catch (error) {
        console.error('Error creating external user:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
