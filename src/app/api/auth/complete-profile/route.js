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

  // Only for an account that has no password yet (first Google/Microsoft sign-in). Otherwise any
  // open session could set a new password without knowing the current one.
  const user = await User.findById(session.user.id).select('password profileCompleted');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.password && user.profileCompleted !== false) {
    return NextResponse.json({ error: 'Tài khoản đã có mật khẩu. Đổi mật khẩu trong Hồ sơ.' }, { status: 403 });
  }

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


