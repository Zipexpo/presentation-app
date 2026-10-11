import { NextResponse } from 'next/server';
import { registerAccount } from '@/lib/registration';

/** Self-registration from the /register page. See lib/registration.js for the rules. */
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const r = await registerAccount({
    email: body.email,
    name: body.name,
    password: body.password,
    studentId: body.studentId,
  });
  if (!r.ok) return NextResponse.json({ error: r.message, code: r.code }, { status: r.status });
  return NextResponse.json({ ok: true, email: r.email }, { status: 201 });
}
