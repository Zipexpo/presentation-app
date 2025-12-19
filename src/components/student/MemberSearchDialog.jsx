'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';

export default function MemberSearchDialog({ onAddMember, topicId }) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [manualEntry, setManualEntry] = useState(null);

    const handleSearch = async () => {
        if (!searchQuery) return;
        setLoading(true);
        setResult(null);
        setManualEntry(null);

        try {
            // Check query as Student ID first, then Email
            const isEmail = searchQuery.includes('@');
            let param = isEmail ? `email=${encodeURIComponent(searchQuery)}` : `studentId=${encodeURIComponent(searchQuery)}`;

            if (topicId) {
                param += `&topicId=${topicId}`;
            }

            const res = await fetch(`/api/student/check-user?${param}`);
            const data = await res.json();

            if (data.found && data.user) {
                setResult(data.user);
            } else {
                // Not found, enable manual entry
                setResult(null);
                setManualEntry({
                    studentId: isEmail ? '' : searchQuery,
                    email: isEmail ? searchQuery : '',
                    name: ''
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        if (result) {
            onAddMember({
                name: result.name,
                email: result.email,
                studentId: result.studentId || '',
                isRegistered: true
            });
        } else if (manualEntry) {
            onAddMember({
                name: manualEntry.name,
                email: manualEntry.email,
                studentId: manualEntry.studentId,
                isRegistered: false
            });
        }
        setOpen(false);
        // Reset state
        setSearchQuery('');
        setResult(null);
        setManualEntry(null);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setOpen(true)}>+ Add Member</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                    <DialogDescription>
                        Search by Student ID or Email.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex gap-2">
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Enter Student ID or Email"
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <Button onClick={handleSearch} disabled={loading}>
                            {loading ? '...' : 'Search'}
                        </Button>
                    </div>

                    {result && (
                        <div className="bg-green-50 p-4 rounded-md border border-green-200">
                            <div className="font-semibold text-green-700 flex items-center gap-2">
                                ✓ User Found
                            </div>
                            <div className="text-sm mt-1">
                                <p><strong>Name:</strong> {result.name}</p>
                                <p><strong>Email:</strong> {result.email}</p>
                                <p><strong>ID:</strong> {result.studentId}</p>
                            </div>
                        </div>
                    )}

                    {manualEntry && (
                        <div className="space-y-3 bg-gray-50 p-4 rounded-md border">
                            <p className="text-sm text-yellow-600 mb-2">User not found. Enter details manually:</p>
                            <div>
                                <Label className="text-xs">Student ID *</Label>
                                <Input
                                    value={manualEntry.studentId}
                                    onChange={e => setManualEntry({ ...manualEntry, studentId: e.target.value })}
                                    placeholder="ID..."
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Name *</Label>
                                <Input
                                    value={manualEntry.name}
                                    onChange={e => setManualEntry({ ...manualEntry, name: e.target.value })}
                                    placeholder="Full Name"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Email</Label>
                                <Input
                                    value={manualEntry.email}
                                    onChange={e => setManualEntry({ ...manualEntry, email: e.target.value })}
                                    placeholder="Email Address"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    {(result || manualEntry) && (
                        <Button onClick={handleAdd}>Add to Team</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
