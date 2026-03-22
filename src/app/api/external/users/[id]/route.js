import { NextResponse } from 'next/server';
import { connectToDB } from '@/lib/db';
import User from '@/models/User';
import { validateApiKey } from '@/lib/apiAuth';
import bcrypt from 'bcryptjs';

// GET: Fetch a specific user
export async function GET(req, { params }) {
    const authResult = await validateApiKey(req);
    if (!authResult.isValid) return authResult.errorResponse;

    try {
        await connectToDB();
        const user = await User.findById(params.id).select('-password').lean();

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
    const authResult = await validateApiKey(req);
    if (!authResult.isValid) return authResult.errorResponse;

    try {
        const body = await req.json();
        await connectToDB();

        // Prevent password from being updated via this plain mechanism without careful handling
        if (body.password) {
             body.password = await bcrypt.hash(body.password, 10);
        }

        const updatedUser = await User.findByIdAndUpdate(
            params.id,
            { $set: body },
            { new: true, runValidators: true }
        ).select('-password').lean();

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
    const authResult = await validateApiKey(req);
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
