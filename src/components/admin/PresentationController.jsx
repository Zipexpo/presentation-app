'use client';
import { Button } from '@/components/ui/button';

export function PresentationController({ session, onClose }) {
    return (
        <div className="space-y-6 bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center border-b pb-4">
                <div>
                    <h2 className="text-xl font-bold">{session.name}</h2>
                    <p className="text-sm text-gray-500">Code: {session.code}</p>
                </div>
                <Button variant="outline" onClick={onClose}>Close Session</Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="p-4 border rounded bg-gray-50">
                    <h3 className="font-semibold mb-2">Current Slide</h3>
                    <div className="aspect-video bg-gray-200 rounded flex items-center justify-center text-gray-400">
                        Slide Visual Placeholder
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="font-semibold">Controls</h3>
                    <div className="flex gap-2">
                        <Button className="flex-1">Previous</Button>
                        <Button className="flex-1">Next</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
