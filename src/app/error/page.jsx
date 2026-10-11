'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

/** NextAuth's error codes, in words. The raw codes were shown, and decodeURIComponent on an
 *  already-decoded value threw on a stray "%", crashing the error page itself. */
const MESSAGES = {
  Configuration: 'Phương thức đăng nhập này chưa được cấu hình. Dùng email và mật khẩu.',
  AccessDenied: 'Đăng nhập bị từ chối.',
  Verification: 'Liên kết đăng nhập đã hết hạn hoặc đã được dùng.',
  OAuthAccountNotLinked: 'Email này đã có tài khoản. Đăng nhập bằng mật khẩu rồi liên kết Google/Microsoft trong Hồ sơ.',
  OAuthSignin: 'Không mở được trang đăng nhập của nhà cung cấp. Thử lại.',
  OAuthCallback: 'Nhà cung cấp trả về lỗi. Thử lại.',
  CredentialsSignin: 'Email hoặc mật khẩu không đúng.',
  SessionRequired: 'Cần đăng nhập để xem trang này.',
}

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <div className="max-w-md w-full space-y-6 text-center">
      <h1 className="text-3xl font-bold text-gray-900">Lỗi đăng nhập</h1>
      <p className="text-gray-600">
        {MESSAGES[error] || 'Có lỗi khi đăng nhập. Thử lại.'}
      </p>
      <a
        href="/login"
        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
      >
        Về trang đăng nhập
      </a>
    </div>
  )
}

export default function ErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Suspense fallback={<div>Loading...</div>}>
        <ErrorContent />
      </Suspense>
    </div>
  )
}
