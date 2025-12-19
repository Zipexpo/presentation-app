'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export function Navbar() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  // Hide on root landing which has its own hero nav
  if (pathname === '/') return null

  const role = session?.user?.role

  return (
    <header className="w-full border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="hidden sm:inline-flex"
          >
            Back
          </Button>
          <Link href="/">
            <span className="font-semibold text-gray-900 cursor-pointer">
              PresentX
            </span>
          </Link>
          {role === 'admin' && (
            <Link href="/admin" className="text-sm text-gray-600 hover:underline">
              Admin
            </Link>
          )}
          {role === 'teacher' && (
            <>
              <Link href="/teacher/topics" className="text-sm text-gray-600 hover:underline">
                Topics
              </Link>
              <Link href="/teacher/classes" className="text-sm text-gray-600 hover:underline">
                Classes
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm">
          {status === 'authenticated' ? (
            <>
              <span className="hidden sm:inline text-gray-500">
                {session?.user?.email}
              </span>
              <Link href="/logout">
                <Button variant="outline" size="sm">
                  Logout
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Register</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}


