'use client';

import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipForward, FastForward, Video, FileText, Code, Folder, Link as LinkIcon, ExternalLink, ListMusic, QrCode, Trash2, ChevronDown, ChevronRight, GripHorizontal } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { QRCodeCanvas } from 'qrcode.react';
import { isEmbeddable } from '@/lib/utils';
import { Allotment } from "allotment";
import ResourceLinkItem from './ResourceLinkItem';
import ScoreBeeswarmViz from './ScoreBeeswarmViz';

const PresentationSidebar = memo(function PresentationSidebar({
    isSidebarOpen,
    topic,
    currentProject,
    activeResource,
    projects,
    handleControl,
    handleJump,
    handleSwitchResource,
    reviews = [],
    onDeleteReview
}) {
    const [showQR, setShowQR] = useState(false);
    const [isMaterialsOpen, setIsMaterialsOpen] = useState(true);
    const [isPlaylistOpen, setIsPlaylistOpen] = useState(true);
    const [filterType, setFilterType] = useState('all');
    const liveLink = typeof window !== 'undefined' ? `${window.location.origin}/student/live/${topic._id}` : '';

    const projectReviews = reviews.filter(r => String(r.projectId) === String(currentProject?._id));
    const filteredReviews = projectReviews.filter(r => filterType === 'all' || r.feedbackType === filterType);

    // Calculate Dynamic Max Score based on Config
    // Helper to calc max per question
    const calculateMaxPerQuestion = (questions) => {
        if (!questions || !questions.length) return 10;
        let totalMax = 0;
        let itemCount = 0;
        questions.forEach(q => {
            if (q.type === 'matrix') {
                const maxBase = Math.max(...(q.columns?.map(c => c.baseScore ?? c.score ?? 0) || [0]));
                const rows = q.rows || [];
                rows.forEach(r => {
                    const w = r.weight ?? 1;
                    totalMax += maxBase * w;
                    itemCount++;
                });
            } else if (q.type === 'rubric') {
                const max = Math.max(...(q.options?.map(o => o.score) || [0]));
                totalMax += max;
                itemCount++;
            } else if (q.type === 'scale') {
                totalMax += (q.scaleConfig?.max || 5);
                itemCount++;
            } else if (q.type === 'rating') {
                totalMax += 5;
                itemCount++;
            } else if (q.type === 'choice') {
                const max = Math.max(...(q.options?.map(o => o.score) || [0]));
                totalMax += max;
                itemCount++;
            }
        });
        return itemCount > 0 ? (totalMax / itemCount) : 10;
    };

    // 1. Standard Config Max
    let standardQuestions = topic.presentationConfig?.surveyQuestions || [];
    if (!standardQuestions.length && topic.presentationConfig?.gradingRubric?.length) {
        standardQuestions = topic.presentationConfig.gradingRubric.map(r => ({ type: 'rubric', options: [{ score: r.maxScore || 10 }] }));
    }
    const standardMax = calculateMaxPerQuestion(standardQuestions);

    // 2. Special Config Max
    const specialConfig = topic.presentationConfig?.specialEvaluationConfig || topic.specialEvaluationConfig;
    const specialQuestions = specialConfig?.enabled ? specialConfig.surveyQuestions : [];
    const specialMax = calculateMaxPerQuestion(specialQuestions);

    // 3. Normalize Reviews to 0-10 Scale
    const processedReviews = projectReviews.map(r => {
        if (!r.scores || r.scores.length === 0) return { ...r, normalizedScore: 0 };

        const totalScore = r.scores.reduce((acc, s) => acc + (Number(s.score) || 0), 0);
        const rawAvg = totalScore / r.scores.length;

        // Heuristic to detect Special Config
        let maxForReview = standardMax;
        if (specialConfig?.enabled) {
            if (r.userType === 'teacher') maxForReview = specialMax;
            else if (rawAvg > standardMax && specialMax > standardMax) maxForReview = specialMax;
        }

        return {
            ...r,
            normalizedScore: (rawAvg / maxForReview) * 10
        };
    });

    const maxScoreDomain = 10;
    const reviewCount = projectReviews.length;

    return (
        <div className="w-full h-full bg-slate-900 border-l border-slate-700/50 flex flex-col overflow-hidden">
            {/* Controls (Fixed Top) */}
            <div className="p-6 border-b border-slate-700/50 bg-slate-800/30 shrink-0">
                <div className="flex justify-center gap-4 items-center">
                    {topic.activeSession?.status === 'active' ? (
                        <Button size="lg" variant="outline" className="h-16 w-16 rounded-full border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10" onClick={() => handleControl('pause')}>
                            <Pause className="w-8 h-8 fill-current" />
                        </Button>
                    ) : (
                        <Button size="lg" className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20" onClick={() => handleControl(topic.activeSession?.status === 'paused' ? 'resume' : 'start')}>
                            <Play className="w-8 h-8 fill-current ml-1" />
                        </Button>
                    )}

                    {/* Phase Controls */}
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex gap-1">
                            <Button
                                size="icon"
                                variant={topic.activeSession?.currentPhase === 'presentation' ? 'default' : 'outline'}
                                className={`h-8 w-8 rounded-full ${topic.activeSession?.currentPhase === 'presentation' ? 'bg-cyan-500 hover:bg-cyan-600 border-none' : 'border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10'}`}
                                onClick={() => handleControl('setPhase', 'presentation')}
                                title="Presentation"
                            >
                                <span className="font-bold text-xs">P</span>
                            </Button>
                            <Button
                                size="icon"
                                variant={topic.activeSession?.currentPhase === 'qa' ? 'default' : 'outline'}
                                className={`h-8 w-8 rounded-full ${topic.activeSession?.currentPhase === 'qa' ? 'bg-orange-500 hover:bg-orange-600 border-none' : 'border-orange-500/30 text-orange-500 hover:bg-orange-500/10'}`}
                                onClick={() => handleControl('setPhase', 'qa')}
                                title="Q&A"
                            >
                                <span className="font-bold text-xs">Q</span>
                            </Button>
                            <Button
                                size="icon"
                                variant={topic.activeSession?.currentPhase === 'break' ? 'default' : 'outline'}
                                className={`h-8 w-8 rounded-full ${topic.activeSession?.currentPhase === 'break' ? 'bg-green-500 hover:bg-green-600 border-none' : 'border-green-500/30 text-green-500 hover:bg-green-500/10'}`}
                                onClick={() => handleControl('setPhase', 'break')}
                                title="Break"
                            >
                                <span className="font-bold text-xs">B</span>
                            </Button>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                            Phase
                        </span>
                    </div>

                    {/* Next Project (Skip) */}
                    <div className="flex flex-col items-center gap-1">
                        <Button size="lg" variant="outline" className="h-16 w-16 rounded-full border-slate-700 text-slate-500 hover:text-white hover:bg-white/10" onClick={() => handleControl('next')}>
                            <SkipForward className="w-8 h-8" />
                        </Button>
                        <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">
                            Skip
                        </span>
                    </div>
                </div>
            </div>

            {/* Resizable Main Content */}
            <div className="flex-1 min-h-0 w-full relative">
                <Allotment vertical>
                    {/* Panel 1: Playlist */}
                    <Allotment.Pane
                        minSize={isPlaylistOpen ? 100 : 49}
                        preferredSize={isPlaylistOpen ? "40%" : 49}
                        maxSize={isPlaylistOpen ? Number.MAX_SAFE_INTEGER : 49}
                    >
                        <div className="h-full flex flex-col bg-slate-900">
                            {/* Playlist Header */}
                            <div
                                className="sticky top-0 bg-slate-900/90 backdrop-blur p-3 border-b border-slate-700/50 flex items-center justify-between z-10 cursor-pointer hover:bg-slate-800/50 transition-colors"
                                onClick={() => setIsPlaylistOpen(!isPlaylistOpen)}
                            >
                                <div className="flex items-center gap-2">
                                    <ListMusic className="w-4 h-4 text-slate-400" />
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Playlist</h3>
                                </div>
                                {isPlaylistOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                            </div>

                            {/* Scrollable Playlist */}
                            {isPlaylistOpen && (
                                <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
                                    {projects.map((p, i) => (
                                        <div
                                            key={p._id}
                                            className={`p-3 flex items-center justify-between hover:bg-slate-800/50 transition cursor-pointer group ${currentProject?._id === p._id ? 'bg-blue-500/10 border-l-2 border-blue-500' : 'border-l-2 border-transparent'}`}
                                            onClick={() => handleJump(p)}
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${currentProject?._id === p._id ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                                        {p.groupNumber}
                                                    </span>
                                                    <span className={`text-sm truncate font-medium ${currentProject?._id === p._id ? 'text-blue-300' : 'text-slate-300'}`}>
                                                        {p.projectName}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-500 truncate pl-8">
                                                    {p.members?.map(m => m.name).join(', ')}
                                                </div>
                                            </div>

                                            {currentProject?._id === p._id && topic.activeSession?.status === 'active' ? (
                                                <div className="w-8 h-8 flex items-center justify-center">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                                </div>
                                            ) : (
                                                <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white">
                                                    <Play className="w-4 h-4 fill-current" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Allotment.Pane>

                    {/* Panel 2: Materials & Live Feedback */}
                    {/* Panel 2: Materials (Conditional) */}
                    {currentProject && (
                        <Allotment.Pane
                            minSize={isMaterialsOpen ? 100 : 49}
                            preferredSize={isMaterialsOpen ? "30%" : 49}
                            maxSize={isMaterialsOpen ? Number.MAX_SAFE_INTEGER : 49}
                        >
                            <div className="h-full flex flex-col bg-slate-900">
                                <div
                                    className="p-3 shrink-0 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors border-b border-slate-700/50 bg-slate-900/90 backdrop-blur sticky top-0 z-10"
                                    onClick={() => setIsMaterialsOpen(!isMaterialsOpen)}
                                >
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Materials</h3>
                                    {isMaterialsOpen ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
                                </div>
                                {isMaterialsOpen && (
                                    <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-slate-800/20">
                                        {currentProject.videoLink && (
                                            <ResourceLinkItem url={currentProject.videoLink} label="Video" type="YouTube" active={activeResource?.url === currentProject.videoLink} onShow={() => handleSwitchResource('iframe', currentProject.videoLink)} />
                                        )}
                                        {currentProject.presentationLink && (
                                            <ResourceLinkItem url={currentProject.presentationLink} label="Slides" active={activeResource?.url === currentProject.presentationLink} onShow={() => handleSwitchResource('iframe', currentProject.presentationLink)} />
                                        )}
                                        {currentProject.sourceCodeLink && (
                                            <ResourceLinkItem url={currentProject.sourceCodeLink} label="Code" active={activeResource?.url === currentProject.sourceCodeLink} onShow={() => handleSwitchResource('iframe', currentProject.sourceCodeLink)} />
                                        )}
                                        {currentProject.resources?.map((res, i) => (
                                            <ResourceLinkItem key={i} url={res.url} label={res.label || res.name} type={res.type} active={activeResource?.url === res.url} onShow={() => handleSwitchResource('iframe', res.url)} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Allotment.Pane>
                    )}

                    {/* Panel 3: Live Feedback */}
                    <Allotment.Pane minSize={150}>
                        <div className="h-full flex flex-col bg-slate-900">
                            <div className="p-3 border-b border-slate-700/50 bg-slate-800/30 shrink-0 flex items-center justify-between sticky top-0 z-10 backdrop-blur">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Feedback</h3>
                                    <div className="flex bg-slate-800 rounded p-0.5 border border-slate-700">
                                        <button
                                            onClick={() => setFilterType('all')}
                                            className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded transition-all ${filterType === 'all' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            All
                                        </button>
                                        <button
                                            onClick={() => setFilterType('question')}
                                            className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded transition-all ${filterType === 'question' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            Q&A
                                        </button>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="h-6 text-slate-400 hover:text-white gap-1" onClick={() => setShowQR(true)}>
                                    <QrCode className="w-3 h-3" /> <span className="text-xs">Share</span>
                                </Button>
                            </div>

                            {/* Comments Stream */}
                            <div className="flex-1 min-h-0 overflow-y-auto p-3">
                                <div className="space-y-3">
                                    {filteredReviews.filter(r => r.comment).length === 0 ? (
                                        <div className="text-center py-10 text-slate-600 italic text-sm">
                                            {filterType === 'question' ? 'No questions yet...' : 'Waiting for comments...'}
                                        </div>
                                    ) : (
                                        filteredReviews
                                            .filter(r => r.comment)
                                            .map((review, i) => {
                                                const userType = review.userType || 'student';
                                                const visibility = topic?.presentationConfig?.feedbackVisibility || { teacher: true, student: true, guest: true };
                                                const showName = visibility[userType] !== false;
                                                const displayName = showName ? (review.reviewerName || 'Anonymous') : 'Anonymous';

                                                return (
                                                    <div key={i} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 group relative">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className={`font-bold text-xs ${userType === 'teacher' ? 'text-purple-400' : 'text-slate-300'}`}>
                                                                {displayName}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-slate-500">
                                                                    {new Date(review.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                {onDeleteReview && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onDeleteReview(review._id);
                                                                        }}
                                                                        className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                                                                        title="Delete Comment"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-slate-400 leading-snug">
                                                            {review.feedbackType === 'question' && (
                                                                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-500/30 mr-2 align-middle inline-block">
                                                                    QUESTION
                                                                </span>
                                                            )}
                                                            {review.comment}
                                                        </p>
                                                    </div>
                                                );
                                            })
                                    )}
                                </div>
                            </div>

                            {/* Viz Footer */}
                            <div className="shrink-0 pt-2 pb-4 bg-slate-900 border-t border-slate-700/50">
                                <div className="text-[10px] text-slate-500 uppercase mb-2 text-center flex items-center justify-center gap-2">
                                    <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                    Live Scores
                                    <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                </div>
                                <ScoreBeeswarmViz reviews={processedReviews} width={340} height={100} maxScore={maxScoreDomain} />
                            </div>
                        </div>
                    </Allotment.Pane>
                </Allotment>
            </div>

            <Dialog open={showQR} onOpenChange={setShowQR}>
                <DialogContent className="bg-white text-slate-900 border-none sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-center text-xl font-bold">Join Live Feedback</DialogTitle>
                        <DialogDescription className="text-center text-slate-500">
                            Scan to rate and comment on projects
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-6 py-4">
                        <div className="p-4 bg-white rounded-xl shadow-lg border border-slate-100">
                            <QRCodeCanvas value={liveLink} size={200} level="H" />
                        </div>
                        <div className="w-full overflow-hidden">
                            <div className="grid grid-cols-[1fr_auto] gap-2 p-2 bg-slate-100 rounded-lg border border-slate-200">
                                <div className="min-w-0 flex items-center">
                                    <code className="block text-xs truncate text-slate-600 font-mono px-1">
                                        {liveLink}
                                    </code>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 hover:bg-white hover:shadow-sm"
                                    onClick={() => {
                                        navigator.clipboard.writeText(liveLink);
                                        // Optional toast
                                    }}
                                >
                                    <LinkIcon className="w-4 h-4 text-slate-500" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
});

export default PresentationSidebar;
