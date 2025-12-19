import { NextResponse } from 'next/server';
import { connectToDB } from '@/lib/db';
import DomainRole from '@/models/DomainRole';

export async function GET() {
  await connectToDB();

  const domains = await DomainRole.find({}).sort({ createdAt: -1 });
  return NextResponse.json(domains);
}

export async function POST(request) {
  await connectToDB();

  const { domain, role, requiresVerification } = await request.json();

  if (!domain || !role) {
    return NextResponse.json(
      { error: 'Domain and role are required' },
      { status: 400 }
    );
  }

  try {
    const existing = await DomainRole.findOne({ domain });
    if (existing) {
      return NextResponse.json(
        { error: 'Domain already exists' },
        { status: 400 }
      );
    }

    const doc = await DomainRole.create({
      domain,
      role,
      requiresVerification: typeof requiresVerification === 'boolean'
        ? requiresVerification
        : true,
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    console.error('Error creating domain role:', err);
    return NextResponse.json(
      { error: 'Failed to create domain' },
      { status: 500 }
    );
  }
}


