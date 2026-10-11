import { NextResponse } from 'next/server';
import { verifyEmailToken } from '@/lib/registration';

/**
 * Consume the token from the verification email (called by the /verify-email page). This route
 * used to be a second copy of the register handler, so no link could ever activate an account.
 */
export async function POST(request) {
  const { token } = await request.json().catch(() => ({}));
  const r = await verifyEmailToken(token);
  if (!r.ok) return NextResponse.json({ error: r.message, code: r.code }, { status: r.status });
  return NextResponse.json({ ok: true, email: r.email, returnTo: r.returnTo });
}
