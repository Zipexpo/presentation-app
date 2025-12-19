'use client';
import { Button } from '@/components/ui/button';

export function LiveFeedbackInterface({ session, studentInfo, onLeave }) {
    return (
        <div className="max-w-xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                <div>
                    <h2 className="font-bold">{session.name}</h2>
                    <p className="text-xs text-gray-500">Joined as {studentInfo.name}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={onLeave}>Leave</Button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg text-center space-y-4">
                <h3 className="text-lg font-medium">Waiting for presentation to start...</h3>
                <p className="text-gray-500 text-sm">Use this interface to provide live feedback during the presentation.</p>
                <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" className="h-20 flex flex-col gap-1">
                        <span>👍</span>
                        <span className="text-xs">Like</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex flex-col gap-1">
                        <span>🤔</span>
                        <span className="text-xs">Confused</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex flex-col gap-1">
                        <span>🔥</span>
                        <span className="text-xs">Great!</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
