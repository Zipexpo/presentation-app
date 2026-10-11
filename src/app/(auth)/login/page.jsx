'use client'

import { useEffect, useState, Suspense } from 'react'
import { signIn, getProviders } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

/** Codes thrown by authorize() (api/auth/[...nextauth]) and the flags other pages send here. */
const ERRORS = {
  invalid: 'Email hoặc mật khẩu không đúng.',
  unverified: 'Email chưa được kích hoạt. Mở thư “Xác nhận email” trong hộp thư (xem cả Spam).',
  no_password: 'Tài khoản này đăng nhập bằng Google/Microsoft. Dùng nút bên dưới, hoặc “Quên mật khẩu” để đặt mật khẩu.',
  disabled: 'Tài khoản đã bị vô hiệu hoá. Liên hệ giảng viên hoặc quản trị viên.',
  not_student_email: 'Chưa có tài khoản cho email này. Sinh viên đăng ký bằng email sinh viên; giảng viên liên hệ quản trị viên để được cấp tài khoản.',
  OAuthAccountNotLinked: 'Email này đã có tài khoản. Đăng nhập bằng mật khẩu rồi liên kết Google/Microsoft trong Hồ sơ.',
}

const NOTICES = {
  profileCompleted: 'Đã lưu hồ sơ. Đăng nhập lại bằng mật khẩu vừa đặt.',
  reset: 'Đã đặt mật khẩu mới. Đăng nhập bằng mật khẩu đó.',
}

/** Same-site paths only, or /login?callbackUrl=https://elsewhere would forward people off-site. */
function safePath(p) {
  // Parsed, not prefix-checked: "/\evil.com" or "/<tab>/evil.com" start with "/" but browsers
  // read them as another site.
  if (!p || !p.startsWith('/')) return '/'
  try {
    const u = new URL(p, 'http://site.invalid')
    return u.origin === 'http://site.invalid' ? u.pathname + u.search + u.hash : '/'
  } catch {
    return '/'
  }
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = safePath(searchParams.get('callbackUrl'))
  const flagError = searchParams.get('error')
  const notice = searchParams.get('profileCompleted') ? NOTICES.profileCompleted : searchParams.get('reset') ? NOTICES.reset : null

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(flagError ? (ERRORS[flagError] || 'Đăng nhập không thành công, thử lại.') : '')
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [social, setSocial] = useState([])

  // Only the providers this deployment configured (Google/Microsoft buttons used to show
  // regardless and end on an error page).
  useEffect(() => {
    getProviders().then((p) => setSocial(Object.values(p || {}).filter((x) => x.type === 'oauth'))).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setCode('')

    try {
      const result = await signIn('credentials', { email, password, redirect: false, callbackUrl })
      if (result?.error) {
        setCode(result.error)
        setError(ERRORS[result.error] || 'Đăng nhập không thành công, thử lại.')
      } else {
        router.push(callbackUrl)
      }
    } catch {
      setError('Có lỗi xảy ra, thử lại.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">Đăng nhập</h2>
        <p className="mt-2 text-sm text-gray-600">
          Chưa có tài khoản?{' '}
          <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">Đăng ký</Link>
        </p>
      </div>

      {notice && !error && (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error}
            {code === 'unverified' && (
              <> <Link href={`/verify-email?email=${encodeURIComponent(email)}`} className="font-semibold underline">Gửi lại email</Link></>
            )}
          </AlertDescription>
        </Alert>
      )}

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Mật khẩu</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required value={password}
              onChange={(e) => setPassword(e.target.value)} className="mt-1" />
          </div>
        </div>

        <div className="flex justify-end text-sm">
          <Link href="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">Quên mật khẩu?</Link>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang đăng nhập…</>) : 'Đăng nhập'}
        </Button>
      </form>

      {social.length > 0 && (
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-gray-50 px-2 text-gray-500">Hoặc tiếp tục với</span>
            </div>
          </div>
          <div className={`mt-6 grid gap-3 ${social.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {social.map((p) => (
              <Button key={p.id} variant="outline" onClick={() => signIn(p.id, { callbackUrl })}>
                {p.id === 'azure-ad' ? 'Microsoft' : p.name}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
