import { NextResponse } from 'next/server';
import { requestPasswordReset } from '@/lib/registration';

export async function POST(request) {
  const { email } = await request.json().catch(() => ({}));
  const r = await requestPasswordReset(email);
  if (!r.ok) return NextResponse.json({ error: r.message, code: r.code }, { status: r.status });
  return NextResponse.json({ ok: true });
}
