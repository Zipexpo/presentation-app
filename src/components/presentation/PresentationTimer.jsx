'use client';

import { useEffect, useState } from 'react';

export default function PresentationTimer({ activeSession, config, onTimeUp, onTick }) {
    const [timeLeft, setTimeLeft] = useState(0);

    const formatTime = (ms) => {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const currentPhase = activeSession?.currentPhase || 'presentation';

    // Helper: Contextual Colors & Labels
    const getPhaseInfo = (phase) => {
        switch (phase) {
            case 'qa': return { label: 'Q&A', color: 'text-orange-400', labelColor: 'bg-orange-500/10 text-orange-400' };
            case 'break': return { label: 'Break', color: 'text-green-400', labelColor: 'bg-green-500/10 text-green-400' };
            default: return { label: 'Presentation', color: 'text-cyan-400', labelColor: 'bg-blue-500/10 text-cyan-400' };
        }
    };

    const phaseInfo = getPhaseInfo(currentPhase);

    // Handle Time Up Trigger
    const [hasTriggered, setHasTriggered] = useState(false);

    // Reset trigger when phase/session changes
    useEffect(() => {
        setHasTriggered(false);
    }, [activeSession?.startTime, currentPhase]);

    // Re-implementation of the interval Effect with Trigger Logic
    useEffect(() => {
        if (!activeSession?.startTime || activeSession.status !== 'active') {
            setTimeLeft(0);
            return;
        }

        let durationMinutes = config?.durationPerProject || 10;
        if (currentPhase === 'qa') durationMinutes = config?.questionDuration || 5;
        if (currentPhase === 'break') durationMinutes = config?.breakDuration || 2;
        const durationMs = durationMinutes * 60 * 1000;

        const interval = setInterval(() => {
            const now = new Date();
            const start = new Date(activeSession.startTime);
            const elapsed = now - start;
            const remaining = durationMs - elapsed;

            setTimeLeft(remaining);
            if (onTick) onTick(remaining);

            if (remaining <= 0 && !hasTriggered) {
                setHasTriggered(true);
                if (onTimeUp) onTimeUp();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [activeSession, config, currentPhase, onTick, hasTriggered, onTimeUp]);

    // Trigger onTimeUp only once when crossing 0? 
    // Simplified: logic remains in useEffect interval usually, but doing it in render is cleaner for "status" check.
    // Let's stick to the visual update here.

    if (activeSession?.status !== 'active') {
        return (
            <div className="flex flex-col items-end">
                <span className="text-xs uppercase font-bold text-slate-500 mb-1 tracking-wider">Timer</span>
                <div className="font-mono text-2xl font-bold text-slate-600 tracking-wider">
                    --:--
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-end">
            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded mb-1 tracking-wider ${phaseInfo.labelColor}`}>
                {phaseInfo.label}
            </span>
            <div className={`font-mono text-2xl font-bold tracking-wider ${phaseInfo.color}`}>
                {timeLeft > 0 ? formatTime(timeLeft) : "00:00"}
            </div>
        </div>
    );
}
