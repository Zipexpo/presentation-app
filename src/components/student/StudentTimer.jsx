'use client'
import { useEffect, useState } from 'react';

export default function StudentTimer({ activeSession, config }) {
    const [timeLeft, setTimeLeft] = useState(0);

    const currentPhase = activeSession?.currentPhase || 'presentation';

    // Helper: Contextual Colors & Labels
    const getPhaseInfo = (phase) => {
        switch (phase) {
            case 'qa': return { label: 'Q&A', color: 'text-orange-500', labelColor: 'bg-orange-100/80 text-orange-700 border border-orange-200' };
            case 'break': return { label: 'Break', color: 'text-green-500', labelColor: 'bg-green-100/80 text-green-700 border border-green-200' };
            default: return { label: 'Presentation', color: 'text-cyan-600', labelColor: 'bg-cyan-100/80 text-cyan-700 border border-cyan-200' };
        }
    };

    const phaseInfo = getPhaseInfo(currentPhase);

    useEffect(() => {
        if (!activeSession?.startTime || activeSession.status !== 'active') {
            setTimeLeft(0);
            return;
        }

        // Determine Duration based on Phase
        let durationMinutes = config?.durationPerProject || 10;
        if (currentPhase === 'qa') durationMinutes = config?.questionDuration || 5;
        if (currentPhase === 'break') durationMinutes = config?.breakDuration || 2;

        const durationMs = durationMinutes * 60 * 1000;

        const interval = setInterval(() => {
            const now = new Date();
            const start = new Date(activeSession.startTime);
            const elapsed = now - start;
            const remaining = Math.max(0, durationMs - elapsed);
            setTimeLeft(remaining);
        }, 1000);
        return () => clearInterval(interval);
    }, [activeSession, config, currentPhase]);

    const formatTime = (ms) => {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    if (activeSession?.status !== 'active') return <span className="text-slate-400 font-mono">--:--</span>;

    return (
        <div className="flex items-center gap-2">
            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wider ${phaseInfo.labelColor}`}>
                {phaseInfo.label}
            </span>
            <span className={`font-mono font-bold ${phaseInfo.color}`}>
                {formatTime(timeLeft)}
            </span>
        </div>
    );
}
