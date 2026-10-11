'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Self-registration. It used to post to /api/register (which does not exist) and redirect to a
 * /verify-email page that was never built, so no student could ever sign themselves up.
 */
export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', studentId: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setError(''); };
  const mismatch = form.confirm && form.password !== form.confirm;
  const ready = form.name.trim() && form.email.trim() && form.password.length >= 8 && form.password === form.confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ready) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, studentId: form.studentId, password: form.password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Đăng ký thất bại, thử lại.');
      router.push(`/verify-email?email=${encodeURIComponent(data.email || form.email)}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">Tạo tài khoản</h2>
          <p className="mt-2 text-sm text-gray-600">
            Một tài khoản dùng cho cả hệ thống thuyết trình và Teamwo.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Họ và tên</Label>
            <Input id="name" value={form.name} onChange={set('name')} required autoComplete="name" className="mt-1" placeholder="Nguyễn Văn A" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={set('email')} required autoComplete="email" className="mt-1"
              placeholder="mssv@student.hcmus.edu.vn" />
            <p className="mt-1 text-xs text-gray-500">Nên dùng email trường. Bạn sẽ nhận một liên kết để kích hoạt tài khoản.</p>
          </div>
          <div>
            <Label htmlFor="studentId">MSSV <span className="font-normal text-gray-400">(không bắt buộc)</span></Label>
            <Input id="studentId" value={form.studentId} onChange={set('studentId')} className="mt-1" placeholder="VD: 24130001" />
          </div>
          <div>
            <Label htmlFor="password">Mật khẩu</Label>
            <Input id="password" type="password" value={form.password} onChange={set('password')} required minLength={8}
              autoComplete="new-password" className="mt-1" placeholder="Ít nhất 8 ký tự" />
          </div>
          <div>
            <Label htmlFor="confirm">Nhập lại mật khẩu</Label>
            <Input id="confirm" type="password" value={form.confirm} onChange={set('confirm')} required autoComplete="new-password" className="mt-1" />
            {mismatch && <p className="mt-1 text-sm text-red-500">Hai mật khẩu chưa khớp.</p>}
          </div>

          <Button type="submit" className="w-full" disabled={loading || !ready}>
            {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang tạo tài khoản…</>) : 'Đăng ký'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Đã có tài khoản?{' '}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
