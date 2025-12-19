'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Layers3, CalendarDays, FileText } from 'lucide-react'

const cards = [
  {
    href: '/teacher/topics',
    title: 'My Topics',
    description: 'Create and manage presentation topics for your classes.',
    icon: Layers3,
  },
  {
    href: '/admin/management',
    title: 'Submissions & Overview',
    description: 'Review student submissions and overall presentation data.',
    icon: FileText,
  },
  {
    href: '/admin/presentation-sections',
    title: 'Presentation Sessions',
    description: 'Run and monitor live presentation sessions.',
    icon: CalendarDays,
  },
]

export default function TeacherDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    } else if (status === 'authenticated' && session?.user.role !== 'teacher') {
      router.replace('/')
    }
  }, [status, session, router])

  if (status === 'loading') {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Teacher Dashboard</h1>
          <span className="text-sm text-gray-500">
            Signed in as {session?.user?.email}
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Welcome
          </h2>
          <p className="text-sm text-gray-600">
            Use the tools below to manage your topics, review student projects,
            and run presentation sessions.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ href, title, description, icon: Icon }) => (
            <Link key={href} href={href}>
              <div className="group cursor-pointer rounded-lg border bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center mb-3">
                  <div className="p-2 rounded-full bg-indigo-50 text-indigo-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="ml-3 text-base font-semibold text-gray-900">
                    {title}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">{description}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="group-hover:bg-indigo-50"
                >
                  Open
                </Button>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  )
}


