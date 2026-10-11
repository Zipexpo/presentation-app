import { NextResponse } from 'next/server';
import { connectToDB } from '@/lib/db';
import User from '@/models/User';
import { validateApiKey } from '@/lib/apiAuth';
import bcrypt from 'bcryptjs';
import { PUBLIC_USER_FIELDS, WRITABLE_USER_FIELDS } from '@/lib/publicUser';

// GET: Fetch a specific user
export async function GET(req, { params }) {
    const authResult = await validateApiKey(req, 'users:read');
    if (!authResult.isValid) return authResult.errorResponse;

    try {
        await connectToDB();
        const user = await User.findById(params.id).select(PUBLIC_USER_FIELDS).lean();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, user });
    } catch (error) {
        console.error('Error fetching external user by ID:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT: Update a specific user (e.g., role, name, studentId)
export async function PUT(req, { params }) {
    const authResult = await validateApiKey(req, 'users:write');
    if (!authResult.isValid) return authResult.errorResponse;

    try {
        const body = await req.json();
        await connectToDB();

        // Only profile fields: `$set: body` let a key holder set role 'admin', emailVerified or
        // the linked accounts.
        const update = {};
        for (const k of WRITABLE_USER_FIELDS) if (body[k] !== undefined) update[k] = body[k];
        // Student ↔ teacher is a normal change; making someone admin is not an API matter.
        if (body.role !== undefined) {
            if (!['student', 'teacher'].includes(body.role)) {
                return NextResponse.json({ error: 'role must be student or teacher' }, { status: 400 });
            }
            update.role = body.role;
        }
        if (update.password !== undefined) {
            if (String(update.password).length < 8) {
                return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
            }
            update.password = await bcrypt.hash(String(update.password), 12);
        }

        const updatedUser = await User.findByIdAndUpdate(
            params.id,
            { $set: update },
            { new: true, runValidators: true }
        ).select(PUBLIC_USER_FIELDS).lean();

        if (!updatedUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error('Error updating external user:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE: Permanently delete a specific user account
export async function DELETE(req, { params }) {
    const authResult = await validateApiKey(req, 'users:delete');
    if (!authResult.isValid) return authResult.errorResponse;

    try {
        await connectToDB();

        // Warning: This permanently deletes the user. In a real app, 
        // you might want to consider cascade logic or soft deletes depending on relationships.
        const deletedUser = await User.findByIdAndDelete(params.id);

        if (!deletedUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: `User ${deletedUser.email} completely deleted.` });
    } catch (error) {
        console.error('Error deleting external user:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
