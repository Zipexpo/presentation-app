import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import connectDB from '@/lib/db';
import User from '@/models/User';
import AccountLinker from './AccountLinker';
import { User as UserIcon, Mail, ShieldAlert } from 'lucide-react';

export default async function ProfilePage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    await connectDB();
    const user = await User.findById(session.user.id).lean();

    if (!user) {
        redirect('/login');
    }

    // Map existing accounts to an array of provider names to pass to the client component
    const linkedProviders = user.accounts?.map(acc => acc.provider) || [];

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="max-w-4xl mx-auto px-6">
                <div className="mb-10">
                    <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">Your Profile</h1>
                    <p className="text-slate-500 mt-2 text-lg">Manage your personal information and login methods.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: Personal Info */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-6">
                                <UserIcon className="w-8 h-8" />
                            </div>
                            
                            <h2 className="text-xl font-bold text-slate-800 mb-4">Personal Details</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Full Name</label>
                                    <p className="font-medium text-slate-800">{user.name || 'Not provided'}</p>
                                </div>
                                
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase flex items-center gap-1">
                                        <Mail className="w-3 h-3" /> Email Address
                                    </label>
                                    <p className="font-medium text-slate-800 break-all">{user.email}</p>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Role</label>
                                    <p className="font-medium text-slate-800 capitalize">
                                        <span className={`inline-block px-2 py-1 rounded-md text-sm ${
                                            user.role === 'admin' ? 'bg-red-100 text-red-700' :
                                            user.role === 'teacher' ? 'bg-amber-100 text-amber-700' :
                                            'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </p>
                                </div>

                                {user.studentId && (
                                    <div>
                                        <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Student/Staff ID</label>
                                        <p className="font-medium text-slate-800">{user.studentId}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Account Linking */}
                    <div className="md:col-span-2">
                        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">Connected Accounts</h2>
                            <p className="text-slate-500 mb-8">
                                Link your external accounts to easily sign in without remembering a password. 
                                Linking a provider will merge it seamlessly with your current profile.
                            </p>
                            
                            <AccountLinker linkedProviders={linkedProviders} />
                            
                            <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-200 flex gap-4 items-start">
                                <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-amber-800 text-sm">Security Note</h4>
                                    <p className="text-sm text-amber-700 mt-1">
                                        Once an account is successfully linked, you can automatically log into this exact profile using that provider. 
                                        Ensure you only link trusted personal accounts.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
