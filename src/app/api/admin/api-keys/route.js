import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDB } from '@/lib/db';
import ApiKey from '@/models/ApiKey';
import crypto from 'crypto';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDB();
        
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

        const { name, scopes } = await req.json();
        if (!name || typeof name !== 'string') {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        await connectToDB();

        // Least privilege: only the scopes explicitly ticked are granted. Reject unknown ones
        // rather than silently dropping them, so a typo can't quietly widen or narrow a key.
        const valid = ApiKey.ALL_SCOPES.map((s) => s.id);
        const granted = Array.isArray(scopes) && scopes.length > 0 ? scopes : undefined;
        if (granted) {
            const bad = granted.filter((s) => !valid.includes(s));
            if (bad.length) {
                return NextResponse.json({ error: `Unknown scope(s): ${bad.join(', ')}` }, { status: 400 });
            }
        }

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
            createdBy: session.user.id,
            ...(granted ? { scopes: granted } : {})
        });

        // We only return the RAW key ONCE. The client MUST copy it now.
        return NextResponse.json({
            success: true,
            apiKey: rawKey,
            record: {
                _id: apiKeyRecord._id,
                name: apiKeyRecord.name,
                prefix: apiKeyRecord.prefix,
                scopes: apiKeyRecord.scopes,
                createdAt: apiKeyRecord.createdAt
            }
        });

    } catch (error) {
        console.error('Error generating API key:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/** Narrow (or widen) an existing key's scopes — the only way to lock down legacy full-access keys. */
export async function PATCH(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, scopes } = await req.json();
        if (!id || !Array.isArray(scopes)) {
            return NextResponse.json({ error: 'id and scopes[] are required' }, { status: 400 });
        }

        await connectToDB();

        const valid = ApiKey.ALL_SCOPES.map((s) => s.id);
        const bad = scopes.filter((s) => !valid.includes(s));
        if (bad.length) {
            return NextResponse.json({ error: `Unknown scope(s): ${bad.join(', ')}` }, { status: 400 });
        }

        const updated = await ApiKey.findByIdAndUpdate(id, { scopes }, { new: true })
            .select('-keyHash')
            .lean();
        if (!updated) {
            return NextResponse.json({ error: 'API Key not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, record: updated });
    } catch (error) {
        console.error('Error updating API key scopes:', error);
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

        await connectToDB();

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
