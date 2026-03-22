import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import ApiKey from '@/models/ApiKey';
import crypto from 'crypto';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        
        // Return keys without the actual hash for security, plus stringify ObjectIds if needed
        const keys = await ApiKey.find()
            .select('-keyHash')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json(keys);
    } catch (error) {
        console.error('Error fetching API keys:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name } = await req.json();
        if (!name || typeof name !== 'string') {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        await connectDB();

        // 1. Generate a secure random API key. Format: ext_ + 32 random hex chars
        const rawKey = `ext_${crypto.randomBytes(24).toString('hex')}`;
        
        // 2. Hash it for storage
        const keyHash = ApiKey.hashKey(rawKey);
        
        // 3. Keep exactly the prefix + first 8 characters to display as a hint ("ext_abcdef12...")
        const prefix = rawKey.substring(0, 12) + '...';

        const apiKeyRecord = await ApiKey.create({
            keyHash,
            prefix,
            name,
            createdBy: session.user.id
        });

        // We only return the RAW key ONCE. The client MUST copy it now.
        return NextResponse.json({
            success: true,
            apiKey: rawKey,
            record: {
                _id: apiKeyRecord._id,
                name: apiKeyRecord.name,
                prefix: apiKeyRecord.prefix,
                createdAt: apiKeyRecord.createdAt
            }
        });

    } catch (error) {
        console.error('Error generating API key:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(req.url);
        const id = url.searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'API Key ID is required' }, { status: 400 });
        }

        await connectDB();

        const deleted = await ApiKey.findByIdAndDelete(id);
        if (!deleted) {
             return NextResponse.json({ error: 'API Key not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error revoking API key:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
