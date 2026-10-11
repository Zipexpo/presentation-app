'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

/** The "Quên mật khẩu?" link on /login used to lead to a page that did not exist. */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || 'Gửi thất bại, thử lại.');
      else setSent(true);
    } catch {
      setError('Lỗi mạng, thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        {sent ? (
          <div className="space-y-4 rounded-lg bg-white p-8 text-center shadow-md">
            <MailCheck className="mx-auto h-12 w-12 text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-900">Kiểm tra hộp thư</h2>
            <p className="text-gray-600">
              Nếu <b>{email}</b> có tài khoản, một liên kết đặt lại mật khẩu vừa được gửi tới đó (hiệu lực 1 giờ). Xem cả thư mục Spam.
            </p>
            <Link href="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">Về trang đăng nhập</Link>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">Quên mật khẩu</h2>
              <p className="mt-2 text-sm text-gray-600">Nhập email tài khoản, chúng tôi sẽ gửi liên kết để đặt mật khẩu mới.</p>
            </div>
            {error && (
              <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
            )}
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required autoComplete="email" value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }} className="mt-1" />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !email}>
                {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang gửi…</>) : 'Gửi liên kết'}
              </Button>
            </form>
            <p className="text-center text-sm text-gray-600">
              <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">← Về trang đăng nhập</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
