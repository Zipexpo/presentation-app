'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FileText, ArrowRight, Shield, RefreshCw, Key, Link as LinkIcon, Users, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ApiDocsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated' || (session && session.user.role !== 'admin')) {
            router.push('/dashboard');
        }
    }, [status, session, router]);

    if (status === 'loading') return <div className="p-8 text-center text-slate-500">Loading Docs...</div>;

    const hostname = typeof window !== 'undefined' ? window.location.origin : 'https://your-app.com';

    return (
        <div className="p-8 max-w-5xl mx-auto pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <FileText className="w-8 h-8 text-indigo-500" />
                        External API Documentation
                    </h1>
                    <p className="text-slate-500 mt-2">Integrate your external applications with the Presentation App securely.</p>
                </div>
                <Link href="/admin/api-keys">
                    <Button className="bg-slate-800 hover:bg-slate-900 text-white gap-2">
                        <Key className="w-4 h-4" /> Manage API Keys <ArrowRight className="w-4 h-4" />
                    </Button>
                </Link>
            </div>

            <div className="space-y-12">

                {/* Authentication Section */}
                <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-indigo-500" /> Authentication
                    </h2>
                    <p className="text-slate-600 mb-6 leading-relaxed">
                        Every request to the <code className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-sm">/api/external/*</code> endpoints must include your secret API Key (generated in the Admin Dashboard). Treat this key like a password and NEVER expose it in client-side applications (like front-end web apps or iOS apps). All requests should be routed through your external backend server.
                    </p>
                    
                    <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                        <div className="text-xs text-slate-400 mb-2 uppercase tracking-widest font-bold">Header Format</div>
                        <pre className="text-green-400 font-mono text-sm leading-relaxed">
{`x-api-key: ext_YOUR_SECRET_KEY_HERE`}
                        </pre>
                    </div>
                </section>

                {/* 1. Account Linking */}
                <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <LinkIcon className="w-6 h-6 text-blue-500" /> 1. Auth & Account Linking
                    </h2>
                    <p className="text-slate-600 mb-4 leading-relaxed">
                        Use this POST endpoint to log a user in from your external app and securely link their Presentation App ID to your system.
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                        <span className="bg-emerald-100 text-emerald-700 font-bold px-3 py-1 rounded text-sm uppercase tracking-wider">POST</span>
                        <code className="bg-slate-100 text-slate-700 font-mono px-3 py-1 rounded text-sm">{hostname}/api/external/auth/login</code>
                    </div>

                    <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto mb-6">
                        <div className="text-xs text-slate-400 mb-2 uppercase tracking-widest font-bold">Request Body JSON</div>
                        <pre className="text-slate-300 font-mono text-sm">
{`{
  "email": "student@example.com",
  "password": "mypassword123"
}`}
                        </pre>
                    </div>

                    <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                        <div className="text-xs text-slate-400 mb-2 uppercase tracking-widest font-bold">Success Response JSON</div>
                        <pre className="text-slate-300 font-mono text-sm">
{`{
  "success": true,
  "user": {
    "id": "60d5ecb8b3...", // <-- STORE THIS IN YOUR DB TO LINK ACCOUNTS
    "email": "student@example.com",
    "name": "Jane Doe",
    "role": "student"
  },
  "userToken": "eyJhb..."   // Optional 30-day JWT specific to this user
}`}
                        </pre>
                    </div>
                </section>

                {/* 2. Bulk Sync */}
                <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <RefreshCw className="w-6 h-6 text-orange-500" /> 2. Bulk User Sync
                    </h2>
                    <p className="text-slate-600 mb-4 leading-relaxed">
                        Fetch a complete list of users. You can append the <code className="px-1 text-slate-800 bg-slate-100 rounded">?role=student</code> query parameter to filter results.
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                        <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded text-sm uppercase tracking-wider">GET</span>
                        <code className="bg-slate-100 text-slate-700 font-mono px-3 py-1 rounded text-sm">{hostname}/api/external/users</code>
                    </div>

                    <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                        <div className="text-xs text-slate-400 mb-2 uppercase tracking-widest font-bold">Success Response JSON</div>
                        <pre className="text-slate-300 font-mono text-sm">
{`{
  "success": true,
  "count": 42,
  "users": [
    {
      "_id": "60d5ec...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "student"
    }
  ]
}`}
                        </pre>
                    </div>
                </section>

                {/* 3. Account Management */}
                <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Users className="w-6 h-6 text-emerald-500" /> 3. Account CRUD Management
                    </h2>
                    <p className="text-slate-600 mb-6 leading-relaxed">
                        Your external application can act as the master system by creating, updating, or deleting accounts directly in the Presentation App database.
                    </p>

                    <div className="space-y-6">
                        {/* LINK ACCOUNT */}
                        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl mt-6">
                            <div className="flex flex-wrap gap-2 mb-2 items-center">
                                <span className="bg-indigo-200 text-indigo-800 font-bold px-2 py-0.5 rounded text-xs uppercase tracking-wider">POST</span>
                                <code className="bg-white text-slate-700 font-mono px-2 py-0.5 rounded text-sm border border-slate-200">/api/external/users/[id]/link</code>
                                <span className="text-sm font-semibold text-indigo-800 ml-2">Push External Provider (Two-Way Link)</span>
                            </div>
                            <p className="text-slate-600 text-sm mb-2">Link a third-party OAuth provider (e.g., Google, Microsoft) directly to an existing Presentation App user.</p>
                            <pre className="text-slate-600 text-sm font-mono bg-slate-100 p-2 rounded border border-slate-200">
{`{ 
  "provider": "google", 
  "providerAccountId": "104230492304923049",
  "email": "user.google@example.com"
}`}
                            </pre>
                        </div>

                        {/* CREATE */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                            <div className="flex flex-wrap gap-2 mb-2 items-center">
                                <span className="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded text-xs uppercase tracking-wider">POST</span>
                                <code className="bg-white text-slate-700 font-mono px-2 py-0.5 rounded text-sm border border-slate-200">/api/external/users</code>
                                <span className="text-sm font-semibold text-slate-600 ml-2">Create User</span>
                            </div>
                            <pre className="text-slate-600 text-sm font-mono mt-2 bg-slate-100 p-2 rounded">
{`{ "email": "new@app.com", "name": "Name", "password": "Pass!", "role": "student" }`}
                            </pre>
                        </div>

                        {/* FETCH SPECIFIC */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                            <div className="flex flex-wrap gap-2 items-center">
                                <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded text-xs uppercase tracking-wider">GET</span>
                                <code className="bg-white text-slate-700 font-mono px-2 py-0.5 rounded text-sm border border-slate-200">/api/external/users/[id]</code>
                                <span className="text-sm font-semibold text-slate-600 ml-2">Fetch Specific User</span>
                            </div>
                        </div>

                        {/* UPDATE */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                            <div className="flex flex-wrap gap-2 mb-2 items-center">
                                <span className="bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded text-xs uppercase tracking-wider">PUT</span>
                                <code className="bg-white text-slate-700 font-mono px-2 py-0.5 rounded text-sm border border-slate-200">/api/external/users/[id]</code>
                                <span className="text-sm font-semibold text-slate-600 ml-2">Update User</span>
                            </div>
                             <pre className="text-slate-600 text-sm font-mono mt-2 bg-slate-100 p-2 rounded">
{`{ "role": "teacher", "name": "Updated Name" }`}
                            </pre>
                        </div>

                        {/* DELETE */}
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                            <div className="flex flex-wrap gap-2 items-center">
                                <span className="bg-red-200 text-red-800 font-bold px-2 py-0.5 rounded text-xs uppercase tracking-wider">DELETE</span>
                                <code className="bg-white text-slate-700 font-mono px-2 py-0.5 rounded text-sm border border-slate-200">/api/external/users/[id]</code>
                                <span className="text-sm font-semibold text-red-700 ml-2">Delete User Forever</span>
                            </div>
                        </div>

                    </div>
                </section>

                <div className="text-center">
                    <Link href="/admin/api-keys">
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 px-8 py-6 text-lg rounded-xl shadow-lg shadow-indigo-500/20">
                            Create Your API Key Now <ArrowRight className="w-5 h-5" />
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
