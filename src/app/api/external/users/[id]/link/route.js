import { NextResponse } from 'next/server';
import { connectToDB } from '@/lib/db';
import User from '@/models/User';
import { validateApiKey } from '@/lib/apiAuth';

// POST: Link a third-party provider (e.g., google, azure-ad) to a specific user
export async function POST(req, { params }) {
    const authResult = await validateApiKey(req);
    if (!authResult.isValid) return authResult.errorResponse;

    try {
        const body = await req.json();
        const { provider, providerAccountId, email, accessToken, refreshToken } = body;

        if (!provider || !providerAccountId) {
            return NextResponse.json(
                { error: 'Provider and providerAccountId are required to link an account' }, 
                { status: 400 }
            );
        }

        await connectToDB();
        
        // 1. Verify user exists
        const user = await User.findById(params.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 2. Check if this specific provider account is already linked to anyone
        const accountAlreadyLinked = await User.findOne({
            'accounts.provider': provider,
            'accounts.providerAccountId': providerAccountId
        });

        if (accountAlreadyLinked) {
            if (accountAlreadyLinked._id.toString() === user._id.toString()) {
                return NextResponse.json({ success: true, message: 'Account is already linked' });
            } else {
                return NextResponse.json(
                    { error: 'This provider account is already linked to a different Presentation App user.' }, 
                    { status: 409 }
                );
            }
        }

        // 3. Prevent duplicate links of the same provider type (optional strict rule, though NextAuth sometimes handles it)
        const hasProvider = user.accounts?.some(acc => acc.provider === provider);
        if (hasProvider) {
            return NextResponse.json(
                { error: `User already has a completely different ${provider} account linked.` }, 
                { status: 409 }
            );
        }

        // 4. Link the new account
        const updatedUser = await User.findByIdAndUpdate(
            params.id,
            {
                $push: {
                    accounts: {
                        provider,
                        providerAccountId,
                        email: email || undefined,
                        accessToken: accessToken || undefined,
                        refreshToken: refreshToken || undefined
                    }
                }
            },
            { new: true }
        ).select('-password').lean();

        return NextResponse.json({ 
            success: true, 
            message: `Successfully linked ${provider} account.`,
            user: updatedUser
        }, { status: 201 });

    } catch (error) {
        console.error('Error linking external provider account:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
