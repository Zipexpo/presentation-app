'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function JoinSessionForm({ onJoin }) {
    const [code, setCode] = useState('');
    const [name, setName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (code && name) {
            // Simulate join
            onJoin({ id: '1', name: 'Demo Session', code }, { name });
        }
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-center">Join Session</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="code">Session Code</Label>
                    <Input
                        id="code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Enter 4-digit code"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="name">Your Name</Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        required
                    />
                </div>
                <Button type="submit" className="w-full">Join</Button>
            </form>
        </div>
    );
}
