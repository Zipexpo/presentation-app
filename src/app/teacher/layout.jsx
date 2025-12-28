'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BookOpen, Users, LogOut, Settings } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function TeacherLayout({ children }) {
    const pathname = usePathname();

    const navItems = [
        { label: 'Dashboard', href: '/teacher', icon: LayoutDashboard },
        { label: 'Classes', href: '/teacher/classes', icon: Users },
        { label: 'Topics', href: '/teacher/topics', icon: BookOpen },
    ];

    return (
        <div className="flex min-h-screen bg-transparent font-sans text-slate-800">
            {/* Glass Sidebar */}
            <aside className="w-64 glass-sidebar fixed h-full z-20 hidden md:flex flex-col">
                <div className="p-8">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                        EduGlass
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold">Teacher Panel</p>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                        ? 'bg-blue-500/10 text-blue-700 shadow-sm border border-blue-200/50'
                                        : 'text-slate-600 hover:bg-white/40 hover:text-slate-900'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'}`} />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/20">
                    <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="flex items-center gap-3 w-full px-4 py-3 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                    >
                        <LogOut className="w-5 h-5 opacity-70" />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto space-y-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
