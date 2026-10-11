'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(token ? '' : 'Thiếu liên kết đặt lại. Mở lại liên kết trong email.');
  const ready = token && password.length >= 8 && password === confirm;

  async function submit(e) {
    e.preventDefault();
    if (!ready) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || 'Không đặt được mật khẩu, thử lại.');
      else router.push('/login?reset=1');
    } catch {
      setError('Lỗi mạng, thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">Đặt mật khẩu mới</h2>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error} <Link href="/forgot-password" className="font-semibold underline">Gửi liên kết mới</Link>
          </AlertDescription>
        </Alert>
      )}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="password">Mật khẩu mới</Label>
          <Input id="password" type="password" autoComplete="new-password" value={password} minLength={8}
            onChange={(e) => setPassword(e.target.value)} className="mt-1" placeholder="Ít nhất 8 ký tự" />
        </div>
        <div>
          <Label htmlFor="confirm">Nhập lại mật khẩu</Label>
          <Input id="confirm" type="password" autoComplete="new-password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} className="mt-1" />
          {confirm && password !== confirm && <p className="mt-1 text-sm text-red-500">Hai mật khẩu chưa khớp.</p>}
        </div>
        <Button type="submit" className="w-full" disabled={loading || !ready}>
          {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang lưu…</>) : 'Lưu mật khẩu'}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-indigo-600" />}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
