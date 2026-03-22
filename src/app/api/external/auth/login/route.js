import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { validateApiKey } from '@/lib/apiAuth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req) {
    const authResult = await validateApiKey(req);
    if (!authResult.isValid) return authResult.errorResponse;

    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        await connectDB();

        // Find user and explicitly select password (which is often correctly deselected by default)
        const user = await User.findOne({ email }).select('+password');
        
        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Compare password hashes
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Create an optional JWT so the external app can represent the user securely 
        // without constantly needing the API key if they choose that architecture path.
        const jwtSecret = process.env.NEXTAUTH_SECRET || 'fallback-secret-for-external-jwt';
        const userToken = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            jwtSecret,
            { expiresIn: '30d' }
        );

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
