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

  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json(
      { error: 'Username and password are required' },
      { status: 400 }
    );
  }

  await connectToDB();

  const existingUsername = await User.findOne({ username });
  if (existingUsername) {
    return NextResponse.json(
      { error: 'Username is already taken' },
      { status: 400 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await User.findByIdAndUpdate(
    session.user.id,
    {
      username,
      password: hashedPassword,
      profileCompleted: true,
    },
  );

  return NextResponse.json({ success: true });
}


