'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function CompleteProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
    if (status === 'authenticated' && session?.user?.profileCompleted) {
      router.replace('/')
    }
  }, [status, session, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Mật khẩu cần ít nhất 8 ký tự.')
      return
    }
    if (password !== confirmPassword) {
      setError('Hai mật khẩu chưa khớp.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Không lưu được, thử lại.')
      }

      // Profile saved; sign out so the user can log in with the new password
      await signOut({ callbackUrl: '/login?profileCompleted=1' })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-6 bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-center">Đặt mật khẩu</h1>
        <p className="text-sm text-gray-600 text-center">
          Đặt mật khẩu để đăng nhập bằng email {session?.user?.email ? <b>{session.user.email}</b> : null} (cả ở Teamwo),
          ngoài Google/Microsoft. {/* The old form also asked for a username nothing could sign in with. */}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Nhập lại mật khẩu</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Đang lưu…' : 'Lưu và tiếp tục'}
          </Button>
        </form>
      </div>
    </div>
  )
}


