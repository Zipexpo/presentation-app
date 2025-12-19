'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function StudentDashboard() {
    const { data: session } = useSession();
    const [data, setData] = useState({ classes: [], submissions: [], linkedProviders: [] });
    const [loading, setLoading] = useState(true);

    // Profile State
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [passResult, setPassResult] = useState(null);
    const [passLoading, setPassLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/student/dashboard');
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            } finally {
                setLoading(false);
            }
        };

        if (session?.user?.role === 'student') {
            fetchData();
        }
    }, [session]);

    const handleLink = (provider) => {
        signIn(provider, { callbackUrl: '/student' });
    };

    const handleUnlink = async (provider) => {
        if (!confirm(`Are you sure you want to unlink your ${provider} account?`)) return;

        try {
            const res = await fetch('/api/user/unlink', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider })
            });

            if (res.ok) {
                // Refresh data
                const updatedProviders = data.linkedProviders.filter(p => p !== provider);
                setData(prev => ({ ...prev, linkedProviders: updatedProviders }));
                alert('Account unlinked successfully');
            } else {
                const json = await res.json();
                alert(json.error || 'Failed to unlink account');
            }
        } catch (error) {
            console.error('Unlink error', error);
            alert('An error occurred');
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPassResult(null);
        if (passwords.new !== passwords.confirm) {
            setPassResult({ error: 'New passwords do not match' });
            return;
        }

        setPassLoading(true);
        try {
            const res = await fetch('/api/user/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: passwords.current,
                    newPassword: passwords.new
                })
            });
            const data = await res.json();
            if (res.ok) {
                setPassResult({ success: 'Password updated successfully!' });
                setPasswords({ current: '', new: '', confirm: '' });
            } else {
                setPassResult({ error: data.error || 'Failed to update password' });
            }
        } catch (err) {
            setPassResult({ error: 'An error occurred' });
        } finally {
            setPassLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading dashboard...</div>;

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Welcome, {session?.user?.name}</h1>
                <p className="text-gray-500">Student Dashboard</p>
            </div>

            <Tabs defaultValue="dashboard" className="w-full">
                <TabsList className="mb-8">
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="profile">My Profile</TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="space-y-8">
                    {/* Enrolled Classes */}
                    <section>
                        <h2 className="text-2xl font-semibold mb-4">My Classes</h2>
                        {data.classes.length === 0 ? (
                            <div className="text-gray-500 italic border p-6 rounded-md bg-gray-50">
                                You are not enrolled in any classes yet.
                            </div>
                        ) : (
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {data.classes.map((cls) => (
                                    <div key={cls._id} className="border p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition">
                                        <h3 className="font-bold text-lg">{cls.name}</h3>
                                        <p className="text-sm text-gray-600 mb-4">Teacher: {cls.teacherId?.name}</p>
                                        <Button variant="outline" className="w-full" disabled>
                                            View Details (Coming Soon)
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Project Submissions */}
                    <section>
                        <h2 className="text-2xl font-semibold mb-4">My Submissions</h2>
                        {data.submissions.length === 0 ? (
                            <div className="text-gray-500 italic border p-6 rounded-md bg-gray-50">
                                You have not submitted any projects yet.
                            </div>
                        ) : (
                            <div className="border rounded-md overflow-hidden bg-white">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="p-3 font-medium">Project Name</th>
                                            <th className="p-3 font-medium">Topic</th>
                                            <th className="p-3 font-medium">Submitted Date</th>
                                            <th className="p-3 font-medium text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.submissions.map((sub) => (
                                            <tr key={sub._id} className="border-b last:border-0 hover:bg-gray-50">
                                                <td className="p-3 font-medium">{sub.projectName}</td>
                                                <td className="p-3 text-gray-600">{sub.topicId?.title || 'Unknown Topic'}</td>
                                                <td className="p-3 text-gray-600">
                                                    {new Date(sub.submittedAt).toLocaleDateString()}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <Link href={`/student/submit-project/${sub.topicId?._id}`}>
                                                        <Button variant="outline" size="sm">Edit</Button>
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </TabsContent>

                <TabsContent value="profile">
                    <Card className="max-w-xl mx-auto">
                        <CardHeader>
                            <CardTitle>Security Settings</CardTitle>
                            <CardDescription>Manage your password and account details.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Account Info Read-only */}
                            <div className="grid grid-cols-2 gap-4 border-b pb-6">
                                <div>
                                    <Label className="text-xs text-gray-500">Name</Label>
                                    <p className="font-medium">{session?.user?.name}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500">Email</Label>
                                    <p className="font-medium">{session?.user?.email}</p>
                                </div>
                            </div>

                            {/* Change Password Form */}
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <h3 className="font-semibold text-lg">Change Password</h3>
                                <div className="space-y-2">
                                    <Label htmlFor="current-pass">Current Password</Label>
                                    <Input
                                        id="current-pass"
                                        type="password"
                                        value={passwords.current}
                                        onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="new-pass">New Password</Label>
                                    <Input
                                        id="new-pass"
                                        type="password"
                                        value={passwords.new}
                                        onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm-pass">Confirm New Password</Label>
                                    <Input
                                        id="confirm-pass"
                                        type="password"
                                        value={passwords.confirm}
                                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                        required
                                    />
                                </div>

                                {passResult && (
                                    <div className={`text-sm p-2 rounded ${passResult.error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                        {passResult.error || passResult.success}
                                    </div>
                                )}

                                <Button type="submit" className="w-full" disabled={passLoading}>
                                    {passLoading ? 'Updating...' : 'Update Password'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Linked Accounts */}
                    <Card className="max-w-xl mx-auto mt-8">
                        <CardHeader>
                            <CardTitle>Linked Accounts</CardTitle>
                            <CardDescription>Connect other login methods for easier access.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Google */}
                            <div className="flex items-center justify-between border p-3 rounded-md">
                                <div className="flex items-center gap-3">
                                    <span className="font-medium">Google</span>
                                    {data.linkedProviders?.includes('google') && <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">Connected</Badge>}
                                </div>
                                {data.linkedProviders?.includes('google') ? (
                                    <Button variant="outline" size="sm" onClick={() => handleUnlink('google')}>Unlink</Button>
                                ) : (
                                    <Button size="sm" onClick={() => handleLink('google')}>Connect</Button>
                                )}
                            </div>

                            {/* Microsoft (Azure AD) */}
                            <div className="flex items-center justify-between border p-3 rounded-md">
                                <div className="flex items-center gap-3">
                                    <span className="font-medium">Microsoft</span>
                                    {data.linkedProviders?.includes('azure-ad') && <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">Connected</Badge>}
                                </div>
                                {data.linkedProviders?.includes('azure-ad') ? (
                                    <Button variant="outline" size="sm" onClick={() => handleUnlink('azure-ad')}>Unlink</Button>
                                ) : (
                                    <Button size="sm" onClick={() => handleLink('azure-ad')}>Connect</Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
