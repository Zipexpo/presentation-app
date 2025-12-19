'use client';
import { Button } from '@/components/ui/button';

export function SessionList({ onSelectSession }) {
    // Placeholder data
    const sessions = [
        { id: '1', name: 'Demo Session', code: '1234' }
    ];

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">Active Sessions</h2>
            {sessions.length === 0 ? (
                <p className="text-gray-500">No active sessions found.</p>
            ) : (
                <div className="grid gap-4">
                    {sessions.map(session => (
                        <div key={session.id} className="p-4 border rounded-lg flex justify-between items-center bg-white shadow-sm">
                            <div>
                                <h3 className="font-bold">{session.name}</h3>
                                <p className="text-sm text-gray-500">Code: {session.code}</p>
                            </div>
                            <Button onClick={() => onSelectSession(session)}>Manage</Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
