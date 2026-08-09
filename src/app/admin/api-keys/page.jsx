'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Key, Plus, Trash2, Copy, Check, Eye, AlertTriangle, FileText, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Link from 'next/link';

/** Mirrors ApiKey.ALL_SCOPES (models/ApiKey.js) — keep the two in step. */
const SCOPES = [
    { id: 'users:read', label: 'Read accounts', hint: 'GET /api/external/users' },
    { id: 'users:write', label: 'Create / update accounts', hint: 'POST + PUT /api/external/users' },
    { id: 'users:delete', label: 'Delete accounts', hint: 'DELETE — permanent, grant sparingly' },
    { id: 'auth:login', label: 'Verify passwords (SSO)', hint: 'POST /api/external/auth/login' },
    { id: 'sync:class', label: 'Sync groups', hint: 'Still needs a per-class confirmation code' },
];
const DEFAULT_SCOPES = ['users:read', 'auth:login', 'sync:class'];

export default function ApiKeysPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    
    // UI State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyScopes, setNewKeyScopes] = useState(DEFAULT_SCOPES);
    const [generatedKey, setGeneratedKey] = useState(null); // The raw key
    const [copied, setCopied] = useState(false);
    const [editingKey, setEditingKey] = useState(null); // { _id, name, scopes }

    const toggleScope = (list, id) =>
        list.includes(id) ? list.filter((s) => s !== id) : [...list, id];

    const saveScopes = async () => {
        if (!editingKey) return;
        try {
            const res = await fetch('/api/admin/api-keys', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingKey._id, scopes: editingKey.scopes })
            });
            if (res.ok) {
                setKeys(keys.map((k) => (k._id === editingKey._id ? { ...k, scopes: editingKey.scopes } : k)));
                setEditingKey(null);
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.error || 'Failed to update scopes.');
            }
        } catch (error) {
            console.error(error);
            alert('Network error updating scopes.');
        }
    };
    
    const [feedback, setFeedback] = useState({ isOpen: false, type: '', title: '', message: '' });

    useEffect(() => {
        if (status === 'unauthenticated' || (session && session.user.role !== 'admin')) {
            router.push('/dashboard');
            return;
        }

        if (status === 'authenticated') {
            fetchKeys();
        }
    }, [status, session, router]);

    const fetchKeys = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/api-keys');
            if (res.ok) {
                const data = await res.json();
                setKeys(data);
            }
        } catch (error) {
            console.error('Failed to fetch keys:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateKey = async (e) => {
        e.preventDefault();
        if (!newKeyName.trim()) return;

        try {
            setGenerating(true);
            const res = await fetch('/api/admin/api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newKeyName.trim(), scopes: newKeyScopes })
            });

            if (res.ok) {
                const data = await res.json();
                setGeneratedKey({ raw: data.apiKey, name: data.record.name });
                setKeys([data.record, ...keys]);
                setNewKeyName('');
                setNewKeyScopes(DEFAULT_SCOPES);
                setShowCreateModal(false);
            } else {
                alert('Failed to generate key.');
            }
        } catch (error) {
            console.error(error);
            alert('Network error generating key.');
        } finally {
            setGenerating(false);
        }
    };

    const handleRevokeKey = async (id) => {
        if (!window.confirm('Are you absolutely sure you want to revoke this API Key? Applications using it will immediately lose access.')) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/api-keys?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setKeys(keys.filter(k => k._id !== id));
            } else {
                alert('Failed to revoke key.');
            }
        } catch (error) {
            console.error(error);
            alert('Network error revoking key.');
        }
    };

    const copyToClipboard = () => {
        if (!generatedKey) return;
        navigator.clipboard.writeText(generatedKey.raw);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return <div className="p-8 flex items-center justify-center text-slate-500">Loading API Keys...</div>;
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <Key className="w-8 h-8 text-indigo-500" />
                        API Keys
                    </h1>
                    <p className="text-slate-500 mt-2">Manage external application access to your Presentation App API.</p>
                </div>
                <div className="flex gap-3">
                    <Link href="/admin/api-docs">
                        <Button variant="outline" className="gap-2 text-slate-700 bg-white">
                            <FileText className="w-4 h-4" /> View API Docs
                        </Button>
                    </Link>
                    <Button onClick={() => setShowCreateModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                        <Plus className="w-4 h-4" /> Generate New Key
                    </Button>
                </div>
            </div>

            {/* Generated Key Modal (CRITICAL: Show only once) */}
            <Dialog open={!!generatedKey} onOpenChange={(open) => {
                if (!open && window.confirm("Have you copied your API Key? You will NOT be able to see it again!")) {
                    setGeneratedKey(null);
                }
            }}>
                <DialogContent className="max-w-md sm:max-w-lg bg-white border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-green-600">
                            <Check className="w-6 h-6" /> Key Generated!
                        </DialogTitle>
                        <DialogDescription className="text-slate-600 pt-2 text-base">
                            Please copy your new API key for <strong>{generatedKey?.name}</strong>. 
                            <br/><br/>
                            <strong className="text-red-500 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4"/> 
                                Save it now! You won&apos;t be able to view it again.
                            </strong>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl my-4 text-center">
                        <code className="text-lg font-mono text-slate-800 tracking-wider break-all">
                            {generatedKey?.raw}
                        </code>
                        <div className="mt-4 flex justify-center">
                             <Button onClick={copyToClipboard} variant="outline" className={`gap-2 ${copied ? 'bg-green-50 text-green-600 border-green-200' : ''}`}>
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copied to Clipboard!' : 'Copy Key'}
                            </Button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-2">
                        <Button 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white" 
                            onClick={() => {
                                if (window.confirm("I have securely saved this API key.")) {
                                    setGeneratedKey(null);
                                }
                            }}
                        >
                            I&apos;ve Saved My Key
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                            <th className="p-4 font-semibold">Name</th>
                            <th className="p-4 font-semibold">Prefix</th>
                            <th className="p-4 font-semibold">Scopes</th>
                            <th className="p-4 font-semibold">Created</th>
                            <th className="p-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {keys.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                                    No API Keys generated yet.
                                </td>
                            </tr>
                        ) : (
                            keys.map((k) => (
                                <tr key={k._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 font-medium text-slate-800 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500">
                                            <Key className="w-4 h-4" />
                                        </div>
                                        {k.name}
                                    </td>
                                    <td className="p-4 font-mono text-sm text-slate-500">
                                        {k.prefix}••••••••
                                    </td>
                                    <td className="p-4">
                                        {!k.scopes || k.scopes.length === 0 ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                                                <AlertTriangle className="w-3 h-3" /> Full access (legacy)
                                            </span>
                                        ) : (
                                            <span className="flex flex-wrap gap-1">
                                                {k.scopes.map((s) => (
                                                    <span
                                                        key={s}
                                                        title={SCOPES.find((x) => x.id === s)?.hint}
                                                        className={`rounded-full px-2 py-0.5 text-xs font-mono border ${
                                                            s === 'users:delete'
                                                                ? 'bg-red-50 text-red-600 border-red-200'
                                                                : 'bg-slate-100 text-slate-600 border-slate-200'
                                                        }`}
                                                    >
                                                        {s}
                                                    </span>
                                                ))}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-slate-500">
                                        {new Date(k.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right whitespace-nowrap">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setEditingKey({ _id: k._id, name: k.name, scopes: k.scopes ?? [] })}
                                            className="text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 gap-2"
                                        >
                                            <ShieldCheck className="w-4 h-4" /> Scopes
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRevokeKey(k._id)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" /> Revoke
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="max-w-md sm:max-w-lg bg-white border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            Generate API Key
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 pt-2">
                           Provide a descriptive name to identify the application using this key.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateKey} className="space-y-6 mt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Application Name</label>
                            <Input
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                placeholder="e.g. Mobile App Frontend"
                                required
                                autoFocus
                                className="bg-slate-50"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Permissions</label>
                            <p className="text-xs text-slate-500">
                                Grant only what this integration needs. Teamwo group sync needs just{' '}
                                <code className="font-mono">sync:class</code> and <code className="font-mono">auth:login</code>.
                            </p>
                            <div className="space-y-1.5 rounded-lg border border-slate-200 p-3 bg-slate-50">
                                {SCOPES.map((s) => (
                                    <label key={s.id} className="flex items-start gap-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="mt-1"
                                            checked={newKeyScopes.includes(s.id)}
                                            onChange={() => setNewKeyScopes((cur) => toggleScope(cur, s.id))}
                                        />
                                        <span>
                                            <span className={`font-medium ${s.id === 'users:delete' ? 'text-red-600' : 'text-slate-700'}`}>
                                                {s.label}
                                            </span>
                                            <span className="block text-xs text-slate-500">{s.hint}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={generating || !newKeyName.trim() || newKeyScopes.length === 0} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                {generating ? 'Generating...' : 'Generate Key'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit scopes — the only way to lock down a legacy full-access key */}
            <Dialog open={!!editingKey} onOpenChange={(open) => !open && setEditingKey(null)}>
                <DialogContent className="max-w-md sm:max-w-lg bg-white border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <ShieldCheck className="w-6 h-6 text-indigo-500" /> Permissions
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 pt-2">
                            What <strong>{editingKey?.name}</strong> is allowed to do. Takes effect immediately.
                        </DialogDescription>
                    </DialogHeader>

                    {editingKey?.scopes.length === 0 && (
                        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                            This key has no scopes stored, so it currently has <strong>full access</strong>.
                            Tick the ones it actually needs to lock it down.
                        </p>
                    )}

                    <div className="space-y-1.5 rounded-lg border border-slate-200 p-3 bg-slate-50">
                        {SCOPES.map((s) => (
                            <label key={s.id} className="flex items-start gap-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="mt-1"
                                    checked={editingKey?.scopes.includes(s.id) ?? false}
                                    onChange={() => setEditingKey((cur) => ({ ...cur, scopes: toggleScope(cur.scopes, s.id) }))}
                                />
                                <span>
                                    <span className={`font-medium ${s.id === 'users:delete' ? 'text-red-600' : 'text-slate-700'}`}>
                                        {s.label}
                                    </span>
                                    <span className="block text-xs text-slate-500">{s.hint}</span>
                                </span>
                            </label>
                        ))}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button type="button" variant="ghost" onClick={() => setEditingKey(null)}>Cancel</Button>
                        <Button
                            onClick={saveScopes}
                            disabled={!editingKey || editingKey.scopes.length === 0}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            Save permissions
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
