import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/route';
import { connectToDB } from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only a password: sign-in is by email, so the username this used to require was never usable.
  const { password } = await request.json().catch(() => ({}));
  if (!password || String(password).length < 8) {
    return NextResponse.json({ error: 'Mật khẩu cần ít nhất 8 ký tự.' }, { status: 400 });
  }

  await connectToDB();

  const hashedPassword = await bcrypt.hash(password, 12);

  await User.findByIdAndUpdate(
    session.user.id,
    {
      password: hashedPassword,
      profileCompleted: true,
    },
  );

  return NextResponse.json({ success: true });
}


