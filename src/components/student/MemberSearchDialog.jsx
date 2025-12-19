'use client';

import { useState, useEffect } from 'react';
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
    const [searchType, setSearchType] = useState('studentId'); // 'studentId', 'email', 'name'
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null); // Single selected result
    const [nameResults, setNameResults] = useState([]); // List for autocomplete
    const [manualEntry, setManualEntry] = useState(null);

    // reset state when type changes
    useEffect(() => {
        setSearchQuery('');
        setResult(null);
        setNameResults([]);
        setManualEntry(null);
    }, [searchType]);

    // Debounce for Name Autocomplete
    useEffect(() => {
        if (searchType !== 'name' || !searchQuery || searchQuery.length < 2) {
            setNameResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                let param = `name=${encodeURIComponent(searchQuery)}`;
                if (topicId) param += `&topicId=${topicId}`;

                const res = await fetch(`/api/student/check-user?${param}`);
                const data = await res.json();

                if (data.users) {
                    setNameResults(data.users);
                } else {
                    setNameResults([]);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, searchType, topicId]);

    const handleSearch = async () => {
        if (!searchQuery) return;
        setLoading(true);
        setResult(null);
        setManualEntry(null);
        setNameResults([]);

        try {
            let param = '';
            if (searchType === 'studentId') param = `studentId=${encodeURIComponent(searchQuery)}`;
            if (searchType === 'email') param = `email=${encodeURIComponent(searchQuery)}`;

            if (topicId) param += `&topicId=${topicId}`;

            const res = await fetch(`/api/student/check-user?${param}`);
            const data = await res.json();

            if (data.found && data.user) {
                setResult(data.user);
            } else {
                // Not found, enable manual entry
                setResult(null);
                setManualEntry({
                    studentId: searchType === 'studentId' ? searchQuery : '',
                    email: searchType === 'email' ? searchQuery : '',
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
        setNameResults([]);
        setManualEntry(null);
    };

    const selectNameResult = (user) => {
        setResult(user);
        setNameResults([]);
        setSearchQuery(''); // Clear query to show selected result state
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setOpen(true)}>+ Add Member</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] overflow-visible">
                <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                    <DialogDescription>
                        Search for a registered student to add them to your group.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex gap-2">
                        <div className="w-[120px] shrink-0">
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={searchType}
                                onChange={(e) => setSearchType(e.target.value)}
                            >
                                <option value="studentId">Student ID</option>
                                <option value="name">Name</option>
                                <option value="email">Email</option>
                            </select>
                        </div>
                        <div className="relative flex-1">
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={
                                    searchType === 'studentId' ? "Enter exact ID..." :
                                        searchType === 'email' ? "Enter exact Email..." :
                                            "Start typing name..."
                                }
                                onKeyDown={(e) => e.key === 'Enter' && searchType !== 'name' && handleSearch()}
                            />
                        </div>
                        {searchType !== 'name' && (
                            <Button onClick={handleSearch} disabled={loading}>
                                {loading ? '...' : 'Search'}
                            </Button>
                        )}
                    </div>

                    {/* Name Autocomplete Results List (Quick Add) */}
                    {searchType === 'name' && nameResults.length > 0 && (
                        <div className="border border-gray-200 rounded-md overflow-hidden max-h-60 overflow-y-auto">
                            {nameResults.map(user => (
                                <div key={user._id} className="flex items-center justify-between p-3 hover:bg-gray-50 border-b last:border-0">
                                    <div className="min-w-0 flex-1 mr-3">
                                        <div className="font-medium text-sm truncate">{user.name}</div>
                                        <div className="text-xs text-gray-500 truncate">{user.studentId} • {user.email}</div>
                                    </div>
                                    <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => {
                                        onAddMember({
                                            name: user.name,
                                            email: user.email,
                                            studentId: user.studentId || '',
                                            isRegistered: true
                                        });
                                        // Optional: Disable button or show "Added" state? 
                                        // For now, let's just add. User can see it in background list.
                                    }}>
                                        Add
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Result Display */}
                    {result && (
                        <div className="bg-green-50 p-4 rounded-md border border-green-200 relative">
                            <div className="font-semibold text-green-700 flex items-center justify-between">
                                <span className="flex items-center gap-2">✓ User Found</span>
                                <Button variant="ghost" size="sm" className="h-6 text-green-700 hover:text-green-800 hover:bg-green-100" onClick={() => setResult(null)}>Clear</Button>
                            </div>
                            <div className="text-sm mt-2 space-y-1">
                                <p><strong>Name:</strong> {result.name}</p>
                                <p><strong>Email:</strong> {result.email}</p>
                                <p><strong>ID:</strong> {result.studentId}</p>
                            </div>
                        </div>
                    )}

                    {/* Manual Entry Fallback */}
                    {manualEntry && (
                        <div className="space-y-3 bg-gray-50 p-4 rounded-md border">
                            <p className="text-sm text-yellow-600 mb-2 font-medium">User not found. Enter details manually:</p>
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
                        <Button onClick={handleAdd} className="w-full sm:w-auto">Add to Team</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
