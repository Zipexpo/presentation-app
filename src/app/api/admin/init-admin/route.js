import { NextResponse } from 'next/server';
import { connectToDB } from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  await connectToDB();

  const body = await request.json().catch(() => ({}));
  const {
    email = process.env.ADMIN_EMAIL,
    password = process.env.ADMIN_PASSWORD,
    name = process.env.ADMIN_NAME || 'Administrator',
  } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Admin email and password are required (in body or env)' },
      { status: 400 }
    );
  }

  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) {
    return NextResponse.json(
      { message: 'Admin already exists' },
      { status: 200 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const admin = await User.create({
    name,
    email,
    password: hashedPassword,
    role: 'admin',
    emailVerified: true,
    profileCompleted: true,
  });

  return NextResponse.json(
    {
      message: 'Admin account created',
      admin: { id: admin._id, email: admin.email, role: admin.role },
    },
    { status: 201 }
  );
}


