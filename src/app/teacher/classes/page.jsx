'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import Link from 'next/link';

export default function ClassesPage() {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newClassName, setNewClassName] = useState('');
    const [createOpen, setCreateOpen] = useState(false);

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
        if (!newClassName) return;
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

            {loading ? (
                <p>Loading...</p>
            ) : classes.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed rounded-lg text-gray-500">
                    No classes found. Create one to get started.
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {classes.map((cls) => (
                        <Card key={cls._id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <CardTitle>{cls.name}</CardTitle>
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
        </div>
    );
}
