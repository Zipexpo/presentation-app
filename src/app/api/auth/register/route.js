import { NextResponse } from 'next/server';
import { connectToDB } from '@/lib/db';
import User from '@/models/User';
import DomainRole from '@/models/DomainRole';
import { sendVerificationEmail } from '@/lib/email';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  const { email, name, password } = await request.json();

  try {
    await connectToDB();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    const domain = email.split('@')[1];
    const domainRole = await DomainRole.findOne({ domain });

    if (!domainRole) {
      return NextResponse.json(
        { error: 'Unrecognized institutional email domain' },
        { status: 400 }
      );
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date();
    verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24);

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      email,
      name,
      password: hashedPassword,
      role: domainRole.role,
      emailVerified: false,
      verificationToken,
      verificationTokenExpires
    });

    await sendVerificationEmail(email, verificationToken);

    return NextResponse.json(
      { message: 'Verification email sent' },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}