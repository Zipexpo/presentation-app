'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, MailCheck, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Two states:
 *   ?email=…  right after registering: "check your inbox", with a resend button.
 *   ?token=…  the link from the email: activates the account, then sends the person on (back to
 *             Teamwo when they registered there, otherwise to sign in).
 */
function VerifyEmail() {
  const params = useSearchParams();
  const token = params.get('token');
  const email = params.get('email') || '';

  if (token) return <ConsumeToken token={token} />;
  return <CheckInbox email={email} />;
}

function ConsumeToken({ token }) {
  const [state, setState] = useState({ status: 'working' });
  const ran = useRef(false);

  useEffect(() => {
    // Strict mode runs effects twice in dev; the token is single-use, so only send it once.
    if (ran.current) return;
    ran.current = true;
    fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) setState({ status: 'error', message: data.error || 'Không xác nhận được.', code: data.code });
        else setState({ status: 'done', email: data.email, returnTo: data.returnTo });
      })
      .catch(() => setState({ status: 'error', message: 'Lỗi mạng, thử lại.' }));
  }, [token]);

  useEffect(() => {
    if (state.status === 'done' && state.returnTo) {
      const t = setTimeout(() => { window.location.href = state.returnTo; }, 2500);
      return () => clearTimeout(t);
    }
  }, [state]);

  if (state.status === 'working') {
    return (
      <Card>
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-gray-600">Đang xác nhận email…</p>
      </Card>
    );
  }
  if (state.status === 'error') {
    return (
      <Card>
        <XCircle className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="text-2xl font-bold text-gray-900">Chưa xác nhận được</h2>
        <p className="text-gray-600">{state.message}</p>
        {state.code === 'expired_token' && <ResendBox email="" />}
        <Link href="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">Về trang đăng nhập</Link>
      </Card>
    );
  }
  return (
    <Card>
      <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
      <h2 className="text-2xl font-bold text-gray-900">Đã kích hoạt tài khoản</h2>
      <p className="text-gray-600">
        <b>{state.email}</b> đã được xác nhận.{' '}
        {state.returnTo ? 'Đang đưa bạn quay lại Teamwo để đăng nhập…' : 'Bạn có thể đăng nhập ngay.'}
      </p>
      {state.returnTo ? (
        <Button className="w-full" onClick={() => { window.location.href = state.returnTo; }}>Quay lại Teamwo</Button>
      ) : (
        <Button asChild className="w-full"><Link href="/login">Đăng nhập</Link></Button>
      )}
    </Card>
  );
}

function CheckInbox({ email }) {
  return (
    <Card>
      <MailCheck className="mx-auto h-12 w-12 text-indigo-600" />
      <h2 className="text-2xl font-bold text-gray-900">Kiểm tra hộp thư</h2>
      <p className="text-gray-600">
        Đã gửi liên kết kích hoạt tới {email ? <b>{email}</b> : 'email của bạn'}. Mở email và bấm
        <b> Xác nhận email</b> (hiệu lực 24 giờ). Không thấy thì xem cả thư mục Spam / Quảng cáo.
      </p>
      <ResendBox email={email} />
      <Link href="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">Về trang đăng nhập</Link>
    </Card>
  );
}

function ResendBox({ email: initial }) {
  const [email, setEmail] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function resend() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      setMsg(res.ok ? { ok: true, text: 'Đã gửi lại. Kiểm tra hộp thư.' } : { ok: false, text: data.error || 'Gửi lại thất bại.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full space-y-2">
      {!initial && (
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email đã đăng ký"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      )}
      <Button variant="outline" className="w-full" disabled={busy || !email} onClick={resend}>
        {busy ? 'Đang gửi…' : 'Gửi lại email'}
      </Button>
      {msg && <p className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-500'}`}>{msg.text}</p>}
    </div>
  );
}

function Card({ children }) {
  return (
    <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-8 text-center shadow-md">{children}</div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-indigo-600" />}>
        <VerifyEmail />
      </Suspense>
    </div>
  );
}
