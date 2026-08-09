'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import Link from 'next/link';
import { Pencil, Users, Link2, Copy, Check } from 'lucide-react';

export default function ClassesPage() {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newClassName, setNewClassName] = useState('');
    const [createOpen, setCreateOpen] = useState(false);

    // Search & Edit State
    const [searchQuery, setSearchQuery] = useState('');
    const [editingClass, setEditingClass] = useState(null);
    const [editName, setEditName] = useState('');

    // External sync (Teamwo) — one-time confirmation code per class + direction
    const [syncClass, setSyncClass] = useState(null);
    const [syncCode, setSyncCode] = useState(null);
    const [syncBusy, setSyncBusy] = useState(false);
    const [syncErr, setSyncErr] = useState('');
    const [copied, setCopied] = useState(false);

    const openSync = (cls) => {
        setSyncClass(cls);
        setSyncCode(null);
        setSyncErr('');
        setCopied(false);
    };

    const mintCode = async (kind) => {
        setSyncBusy(true);
        setSyncErr('');
        try {
            const res = await fetch('/api/teacher/sync-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kind, classId: syncClass?._id })
            });
            const data = await res.json();
            if (res.ok) setSyncCode({ code: data.code, kind, minutes: data.expiresInMinutes });
            else setSyncErr(data.error || 'Could not create a code');
        } catch (error) {
            console.error(error);
            setSyncErr('Could not create a code');
        } finally {
            setSyncBusy(false);
        }
    };

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            const res = await fetch('/api/teacher/classes');
            const data = await res.json();
            if (res.ok) {
                setClasses(data);
            }
        } catch (error) {
            console.error('Failed to fetch classes', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClass = async () => {
        if (!newClassName.trim()) return;
        try {
            const res = await fetch('/api/teacher/classes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newClassName })
            });
            if (res.ok) {
                setNewClassName('');
                setCreateOpen(false);
                fetchClasses();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdateClass = async () => {
        if (!editName.trim() || !editingClass) return;
        try {
            const res = await fetch(`/api/teacher/classes/${editingClass._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editName })
            });

            if (res.ok) {
                setEditingClass(null);
                setEditName('');
                fetchClasses();
            } else {
                alert('Failed to update class name');
            }
        } catch (error) {
            console.error(error);
            alert('Error updating class');
        }
    };

    const filteredClasses = classes.filter(cls =>
        cls.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">My Classes</h1>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>+ Create Class</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Class</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <Label>Class Name</Label>
                            <Input
                                value={newClassName}
                                onChange={(e) => setNewClassName(e.target.value)}
                                placeholder="e.g. CS101 - Intro to AI"
                            />
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreateClass}>Create</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <Input
                    placeholder="Search classes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-md"
                />
            </div>

            {loading ? (
                <p>Loading...</p>
            ) : classes.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed rounded-lg text-gray-500">
                    No classes found. Create one to get started.
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredClasses.map((cls) => (
                        <Card key={cls._id} className="hover:shadow-md transition-shadow relative group">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex justify-between items-center gap-2">
                                    <span className="truncate" title={cls.name}>{cls.name}</span>
                                    <span className="flex items-center gap-0.5 shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-slate-400 hover:text-blue-600"
                                            title="Sync with Teamwo"
                                            onClick={(e) => { e.preventDefault(); openSync(cls); }}
                                        >
                                            <Link2 className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-slate-400 hover:text-blue-600"
                                            title="Rename class"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setEditingClass(cls);
                                                setEditName(cls.name);
                                            }}
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                    </span>
                                </CardTitle>
                                <CardDescription>{cls.students?.length || 0} Students</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Link href={`/teacher/classes/${cls._id}`}>
                                    <Button variant="outline" className="w-full">Manage Class</Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Teamwo sync — mint a one-time confirmation code for this class */}
            <Dialog open={!!syncClass} onOpenChange={(open) => !open && setSyncClass(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Sync “{syncClass?.name}” with Teamwo</DialogTitle>
                    </DialogHeader>
                    {!syncCode ? (
                        <div className="py-2 space-y-3">
                            <p className="text-sm text-slate-600">
                                Pick a direction. A single-use code is generated — give it to the Teamwo
                                manager, who enters it there. It expires in 30 minutes.
                            </p>
                            <Button className="w-full" disabled={syncBusy} onClick={() => mintCode('export')}>
                                Send this class → Teamwo
                            </Button>
                            <Button className="w-full" variant="outline" disabled={syncBusy} onClick={() => mintCode('import')}>
                                Receive a Teamwo group → this class
                            </Button>
                            <p className="text-xs text-slate-500">
                                Mentors don’t present, so a mentor coming from Teamwo is stored as a class note,
                                not as a student.
                            </p>
                            {syncErr && <p className="text-sm text-red-600">{syncErr}</p>}
                        </div>
                    ) : (
                        <div className="py-2 space-y-3">
                            <Label>Confirmation code</Label>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 rounded-md bg-slate-100 px-3 py-2 text-lg font-bold tracking-widest">
                                    {syncCode.code}
                                </code>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        navigator.clipboard?.writeText(syncCode.code);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 1600);
                                    }}
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                            <p className="text-sm text-slate-600">
                                {syncCode.kind === 'export'
                                    ? 'In Teamwo, choose “Nhập lớp từ Presentation” and enter this code.'
                                    : 'In Teamwo, choose “Gửi nhóm sang Presentation” and enter this code.'}
                                {' '}Single use · expires in {syncCode.minutes} minutes.
                            </p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSyncClass(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Class Dialog */}
            <Dialog open={!!editingClass} onOpenChange={(open) => !open && setEditingClass(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Class Name</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>Class Name</Label>
                        <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="e.g. CS101 - Intro to AI"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingClass(null)}>Cancel</Button>
                        <Button onClick={handleUpdateClass}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
