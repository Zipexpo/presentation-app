
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDB } from '@/lib/db';
import User from '@/models/User';

export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { provider } = await request.json();

        await connectToDB();
        const user = await User.findById(session.user.id);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check if account exists
        const accountIndex = user.accounts.findIndex(acc => acc.provider === provider);
        if (accountIndex === -1) {
            return NextResponse.json({ error: 'Account not linked' }, { status: 400 });
        }

        // Prevent unlinking if it's the only login method AND no password set
        // (Assuming credentials provider requires a password)
        const hasPassword = !!user.password;
        const linkedAccountsCount = user.accounts.length;

        if (!hasPassword && linkedAccountsCount <= 1) {
            return NextResponse.json({ error: 'Cannot unlink the only login method' }, { status: 400 });
        }

        // Remove the account
        user.accounts.splice(accountIndex, 1);
        await user.save();

        return NextResponse.json({ success: true, message: 'Account unlinked successfully' });

    } catch (error) {
        console.error('Unlink error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
