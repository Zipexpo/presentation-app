'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { BookOpen, Users, FileText, Layers3 } from 'lucide-react'

export default function TeacherDashboardPage() {
  const { data: session } = useSession()

  return (
    <div className="space-y-8">
      <div className="relative">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent mb-2">
          Dashboard
        </h1>
        <p className="text-slate-600 font-medium">
          Welcome back, {session?.user?.name || 'Teacher'}! Here&apos;s what&apos;s happening today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/teacher/classes" className="group">
          <div className="glass-card p-6 h-full transition-all duration-300 hover:scale-[1.02] hover:bg-white/70 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users className="w-32 h-32 -mr-8 -mt-8 rotate-12 text-blue-900" />
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-100/50 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                <Users className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">My Classes</h2>
            </div>
            <p className="text-slate-600 mb-6 font-medium leading-relaxed">
              Manage your class rosters, add new students, and organize groups.
            </p>
            <div className="flex items-center text-sm font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
              View Classes &rarr;
            </div>
          </div>
        </Link>

        <Link href="/teacher/topics" className="group">
          <div className="glass-card p-6 h-full transition-all duration-300 hover:scale-[1.02] hover:bg-white/70 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <BookOpen className="w-32 h-32 -mr-8 -mt-8 rotate-12 text-indigo-900" />
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-indigo-100/50 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm">
                <BookOpen className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Topics</h2>
            </div>
            <p className="text-slate-600 mb-6 font-medium leading-relaxed">
              Create presentation topics, set deadlines, and manage requirements.
            </p>
            <div className="flex items-center text-sm font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
              Manage Topics &rarr;
            </div>
          </div>
        </Link>

        <div className="glass-card p-6 h-full flex flex-col items-center justify-center text-center opacity-80 hover:opacity-100 transition-opacity relative overflow-hidden border-dashed border-2 border-white/60">
          <div className="w-16 h-16 bg-white/40 rounded-full flex items-center justify-center mb-4 animate-float shadow-inner">
            <span className="text-3xl filter drop-shadow">✨</span>
          </div>
          <h3 className="font-bold text-slate-700 text-lg">Quick Stats</h3>
          <p className="text-sm text-slate-500 mt-2 font-medium">Analytics coming soon</p>
        </div>
      </div>

      {/* Recent Activity Section (Mockup) */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-500" />
          Recent Activity
        </h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/40 transition-colors">
              <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-sm shadow-sm">
                S{i}
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Student submitted a project</p>
                <p className="text-xs text-slate-500">Just now</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
