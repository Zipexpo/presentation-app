import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { connectToDB } from '@/lib/db';
import User from '@/models/User';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectToDB();
  const users = await User.find({}, 'name email role active createdAt').sort({
    createdAt: -1,
  });

  return NextResponse.json(users);
}

export async function PATCH(request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id, role, active } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'User id is required' }, { status: 400 });
  }

  await connectToDB();

  const updates = {};
  if (role) updates.role = role;
  if (typeof active === 'boolean') updates.active = active;

  const user = await User.findByIdAndUpdate(id, updates, { new: true });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
  });
}


