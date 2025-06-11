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

    // 1. Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // 2. Validate institutional domain and get role
    const domain = email.split('@')[1];
    const domainRole = await DomainRole.findOne({ domain });
    
    if (!domainRole) {
      return NextResponse.json(
        { error: 'Unrecognized institutional email domain' },
        { status: 400 }
      );
    }

    // 3. Generate verification token (expires in 24 hours)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date();
    verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24);

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 5. Create new user according to your exact schema
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      emailVerified: false,
      verificationToken,
      verificationTokenExpires,
      role: domainRole.role,
      accounts: [] // Initialize empty accounts array
    });

    await newUser.save();

    // 6. Send verification email
    await sendVerificationEmail(email, verificationToken);

    return NextResponse.json(
      { 
        message: 'Verification email sent',
        user: {
          id: newUser._id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}