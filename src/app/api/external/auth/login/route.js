import { NextResponse } from 'next/server';
import { connectToDB } from '@/lib/db';
import User from '@/models/User';
import { validateApiKey } from '@/lib/apiAuth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req) {
    const authResult = await validateApiKey(req, 'auth:login');
    if (!authResult.isValid) return authResult.errorResponse;

    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        await connectToDB();

        // Find user and explicitly select password (which is often correctly deselected by default)
        const escaped = String(email).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const user = await User.findOne({ email: new RegExp(`^${escaped}$`, 'i') }).select('+password');
        
        // A class sync mirrors students without a password; they have to register first.
        if (!user || !user.password) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Compare password hashes
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // A self-registered account waits for its emailed link (it carries a pending token).
        // Without this gate anyone could register someone else's address and, skipping the
        // link, sign in to Teamwo as that person. Accounts a teacher or partner app provisioned
        // never had a token, so they keep working as before.
        if (!user.emailVerified && user.verificationToken) {
            return NextResponse.json({ error: 'Email not verified', code: 'unverified' }, { status: 403 });
        }
        if (user.active === false) {
            return NextResponse.json({ error: 'Account disabled', code: 'disabled' }, { status: 403 });
        }

        // Optional signed token for partner apps. Only issued with a real secret: the old
        // hardcoded fallback let anyone forge it whenever NEXTAUTH_SECRET was missing.
        const jwtSecret = process.env.EXTERNAL_JWT_SECRET || process.env.NEXTAUTH_SECRET;
        const userToken = jwtSecret
            ? jwt.sign({ id: user._id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '30d' })
            : null;

        // Sanitize response
        const userProfile = {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            studentId: user.studentId
        };

        return NextResponse.json({
            success: true,
            user: userProfile,
            userToken // Enables external apps to issue a sub-token for this user
        });

    } catch (error) {
        console.error('Error in external auth login:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
