import { NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/apiAuth';
import { registerAccount } from '@/lib/registration';

/**
 * Create an account on behalf of a partner app (Teamwo's sign-up form), scope `auth:register`.
 *
 * The account is unverified exactly like one made on /register: the owner still has to click the
 * emailed link, so a key holder cannot mint working accounts for addresses it does not control.
 * `returnTo` (absolute https URL) is where the verify page sends them afterwards.
 */
export async function POST(req) {
  const authResult = await validateApiKey(req, 'auth:register');
  if (!authResult.isValid) return authResult.errorResponse;

  const body = await req.json().catch(() => ({}));
  let returnTo;
  if (body.returnTo) {
    try {
      const u = new URL(body.returnTo);
      if (u.protocol !== 'https:' && u.hostname !== 'localhost') throw new Error('protocol');
      returnTo = u.toString();
    } catch {
      return NextResponse.json({ error: 'returnTo must be an absolute https URL', code: 'invalid_return' }, { status: 400 });
    }
  }

  const r = await registerAccount({
    email: body.email,
    name: body.name,
    password: body.password,
    studentId: body.studentId,
    returnTo,
    via: typeof body.via === 'string' ? body.via.slice(0, 40) : undefined,
  });
  if (!r.ok) return NextResponse.json({ error: r.message, code: r.code }, { status: r.status });
  return NextResponse.json({ ok: true, email: r.email }, { status: 201 });
}
