import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { connectToDB } from '@/lib/db';
import User from '@/models/User';
import DomainRole from '@/models/DomainRole';
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/email';

/**
 * Self-service registration, shared by the /register page and the external API Teamwo calls.
 *
 * An account is created unverified and cannot sign in (here or through Teamwo SSO) until the
 * owner clicks the emailed link. That is what stops someone registering a lecturer's address and
 * signing in as them.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STUDENT_ID = /^[A-Za-z0-9]{4,20}$/;
const TOKEN_HOURS = 24;
const RESEND_SECONDS = 60;

export const REGISTER_ERRORS = {
  invalid_email: { status: 400, message: 'Email không hợp lệ.' },
  invalid_name: { status: 400, message: 'Nhập họ và tên (2–100 ký tự).' },
  weak_password: { status: 400, message: 'Mật khẩu cần ít nhất 8 ký tự.' },
  invalid_student_id: { status: 400, message: 'MSSV chỉ gồm chữ và số (4–20 ký tự).' },
  exists: { status: 409, message: 'Email này đã có tài khoản. Hãy đăng nhập (hoặc dùng “Quên mật khẩu?” ở trang đăng nhập).' },
  student_id_taken: { status: 409, message: 'MSSV này đã gắn với một tài khoản khác.' },
  too_soon: { status: 429, message: 'Vừa gửi email xác nhận. Đợi một phút rồi thử lại.' },
  email_failed: { status: 502, message: "Gửi email thất bại. Thử lại sau ít phút (hoặc dùng “Gửi lại email”)." },
  invalid_token: { status: 400, message: 'Liên kết xác nhận không đúng hoặc đã được dùng.' },
  expired_token: { status: 400, message: 'Liên kết xác nhận đã hết hạn. Gửi lại email để nhận liên kết mới.' },
  invalid_reset: { status: 400, message: 'Liên kết đặt lại mật khẩu không đúng, đã dùng hoặc đã hết hạn. Yêu cầu liên kết mới.' },
  server: { status: 500, message: 'Lỗi hệ thống, thử lại.' },
};

const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');
const baseUrl = () => (process.env.NEXTAUTH_URL || '').replace(/\/+$/, '');
const fail = (code) => ({ ok: false, code, ...REGISTER_ERRORS[code] });

/** The person's existing account, matching the address however its case was stored. */
async function findByEmail(email) {
  const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return User.findOne({ email: new RegExp(`^${escaped}$`, 'i') }).select('+password');
}

/** True when a link went out less than RESEND_SECONDS ago (the expiry is sent-at + 24h). */
function sentRecently(user) {
  if (!user.verificationTokenExpires) return false;
  const sentAt = user.verificationTokenExpires.getTime() - TOKEN_HOURS * 3600 * 1000;
  return Date.now() - sentAt < RESEND_SECONDS * 1000;
}

async function issueAndSend(user, via) {
  const token = crypto.randomBytes(32).toString('hex');
  user.verificationToken = hash(token);
  user.verificationTokenExpires = new Date(Date.now() + TOKEN_HOURS * 3600 * 1000);
  await user.save();
  const url = `${baseUrl()}/verify-email?token=${token}`;
  const r = await sendVerificationEmail({ email: user.email, name: user.name, url, via });
  return r.success;
}

/**
 * @param {{ email: string, name: string, password: string, studentId?: string,
 *           returnTo?: string, via?: string }} input
 *   returnTo/via are only passed by trusted API-key callers (see api/external/auth/register).
 */
export async function registerAccount(input) {
  const email = String(input.email || '').trim().toLowerCase();
  const name = String(input.name || '').trim().replace(/\s+/g, ' ');
  const password = String(input.password || '');
  const studentId = String(input.studentId || '').trim().toUpperCase();

  if (!EMAIL.test(email)) return fail('invalid_email');
  if (name.length < 2 || name.length > 100) return fail('invalid_name');
  if (password.length < 8) return fail('weak_password');
  if (studentId && !STUDENT_ID.test(studentId)) return fail('invalid_student_id');

  try {
    await connectToDB();
    let user = await findByEmail(email);
    if (user?.emailVerified) return fail('exists');
    if (user && sentRecently(user)) return fail('too_soon');

    if (studentId) {
      const owner = await User.findOne({ studentId }).select('_id');
      if (owner && (!user || String(owner._id) !== String(user._id))) return fail('student_id_taken');
    }

    const hashed = await bcrypt.hash(password, 12);
    if (user) {
      // Unverified: a previous attempt, or a student a class sync mirrored without a password.
      // Re-registering is safe because nothing unlocks until the email link is clicked.
      user.name = user.name || name;
      user.password = hashed;
      if (studentId && !user.studentId) user.studentId = studentId;
      user.profileCompleted = true;
    } else {
      const domainRole = await DomainRole.findOne({ domain: email.split('@')[1] });
      user = new User({
        email,
        name,
        password: hashed,
        ...(studentId ? { studentId } : {}),
        role: domainRole?.role || 'student',
        emailVerified: false,
        profileCompleted: true,
        accounts: [],
      });
    }
    user.verificationReturnTo = input.returnTo || undefined;

    const sent = await issueAndSend(user, input.via);
    if (!sent) return fail('email_failed');
    return { ok: true, email: user.email };
  } catch (e) {
    console.error('registerAccount failed:', e);
    return fail('server');
  }
}

/** Send a fresh link. Answers ok for unknown or verified addresses too, so it can't probe accounts. */
export async function resendVerification(rawEmail) {
  const email = String(rawEmail || '').trim().toLowerCase();
  if (!EMAIL.test(email)) return fail('invalid_email');
  try {
    await connectToDB();
    const user = await findByEmail(email);
    if (!user || user.emailVerified || !user.password) return { ok: true };
    if (sentRecently(user)) return fail('too_soon');
    return (await issueAndSend(user)) ? { ok: true } : fail('email_failed');
  } catch (e) {
    console.error('resendVerification failed:', e);
    return fail('server');
  }
}

/** Consume an emailed token. Returns where to go next when the account came from a partner app. */
export async function verifyEmailToken(rawToken) {
  const token = String(rawToken || '').trim();
  if (!/^[a-f0-9]{64}$/.test(token)) return fail('invalid_token');
  try {
    await connectToDB();
    const user = await User.findOne({ verificationToken: hash(token) });
    if (!user) return fail('invalid_token');
    if (!user.verificationTokenExpires || user.verificationTokenExpires < new Date()) return fail('expired_token');
    const returnTo = user.verificationReturnTo || null;
    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    user.verificationReturnTo = undefined;
    await user.save();
    return { ok: true, email: user.email, returnTo };
  } catch (e) {
    console.error('verifyEmailToken failed:', e);
    return fail('server');
  }
}

const RESET_MINUTES = 60;

/**
 * Email a reset link. Answers ok whatever the address, so the form can't be used to find out who
 * has an account. One link per minute per account; a new link replaces the previous one.
 */
export async function requestPasswordReset(rawEmail) {
  const email = String(rawEmail || '').trim().toLowerCase();
  if (!EMAIL.test(email)) return fail('invalid_email');
  try {
    await connectToDB();
    const user = await findByEmail(email);
    if (!user || user.active === false) return { ok: true };
    if (user.resetTokenExpires && user.resetTokenExpires.getTime() - RESET_MINUTES * 60000 > Date.now() - RESEND_SECONDS * 1000) {
      return fail('too_soon');
    }
    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = hash(token);
    user.resetTokenExpires = new Date(Date.now() + RESET_MINUTES * 60000);
    await user.save();
    const r = await sendPasswordResetEmail({ email: user.email, name: user.name, url: `${baseUrl()}/reset-password?token=${token}` });
    return r.success ? { ok: true } : fail('email_failed');
  } catch (e) {
    console.error('requestPasswordReset failed:', e);
    return fail('server');
  }
}

/**
 * Set a new password from an emailed link. Opening the link proves the address, so it also
 * activates an account that was still waiting for its verification email.
 */
export async function resetPassword(rawToken, password) {
  const token = String(rawToken || '').trim();
  if (!/^[a-f0-9]{64}$/.test(token)) return fail('invalid_reset');
  if (String(password || '').length < 8) return fail('weak_password');
  try {
    await connectToDB();
    const user = await User.findOne({ resetToken: hash(token) });
    if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) return fail('invalid_reset');
    user.password = await bcrypt.hash(String(password), 12);
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    user.mustChangePassword = false;
    user.profileCompleted = true;
    if (!user.emailVerified) {
      user.emailVerified = true;
      user.verificationToken = undefined;
      user.verificationTokenExpires = undefined;
      user.verificationReturnTo = undefined;
    }
    await user.save();
    return { ok: true, email: user.email };
  } catch (e) {
    console.error('resetPassword failed:', e);
    return fail('server');
  }
}
