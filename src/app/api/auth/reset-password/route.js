import { NextResponse } from 'next/server';
import { resetPassword } from '@/lib/registration';

export async function POST(request) {
  const { token, password } = await request.json().catch(() => ({}));
  const r = await resetPassword(token, password);
  if (!r.ok) return NextResponse.json({ error: r.message, code: r.code }, { status: r.status });
  return NextResponse.json({ ok: true });
}
