'use client';

import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipForward, FastForward, Video, FileText, Code, Folder, Link as LinkIcon, ExternalLink, ListMusic, QrCode, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { QRCodeCanvas } from 'qrcode.react';
import { isEmbeddable } from '@/lib/utils';
import ResourceLinkItem from './ResourceLinkItem';

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
    const liveLink = typeof window !== 'undefined' ? `${window.location.origin}/student/live/${topic._id}` : '';

    return (
        <div className={`${isSidebarOpen ? 'w-96' : 'w-0'} transition-all duration-300 bg-slate-900 border-l border-slate-700/50 flex flex-col overflow-hidden`}>
            {/* Controls */}
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

                    {/* Next Project Button (Skip) */}
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

            {/* Playlist (Queue) */}
            <div className="flex-1 overflow-y-auto min-h-0 border-b border-slate-700/50">
                <div className="sticky top-0 bg-slate-900/90 backdrop-blur p-3 border-b border-slate-700/50 flex items-center gap-2 z-10">
                    <ListMusic className="w-4 h-4 text-slate-400" />
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Presentation Playlist</h3>
                </div>
                <div className="divide-y divide-slate-800">
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

                            {/* Play Icon on Hover/Active */}
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
            </div>

            {/* Material List Control */}
            {currentProject && (
                <div className="p-4 border-b border-slate-700/50 bg-slate-800/30 shrink-0">
                    <h3 className="text-sm font-bold text-slate-400 uppercase mb-3 text-center tracking-wider">Project Materials</h3>
                    <div className="space-y-2">
                        {/* Video */}
                        <ResourceLinkItem
                            url={currentProject.videoLink}
                            label="Video Submission"
                            type="YouTube"
                            active={activeResource?.url === currentProject.videoLink}
                            onShow={() => handleSwitchResource('iframe', currentProject.videoLink)}
                        />

                        {/* Presentation */}
                        <ResourceLinkItem
                            url={currentProject.presentationLink}
                            label="Presentation/Post"
                            active={activeResource?.url === currentProject.presentationLink}
                            onShow={() => handleSwitchResource('iframe', currentProject.presentationLink)}
                        />

                        {/* Source Code */}
                        <ResourceLinkItem
                            url={currentProject.sourceCodeLink}
                            label="Source Code"
                            active={activeResource?.url === currentProject.sourceCodeLink}
                            onShow={() => handleSwitchResource('iframe', currentProject.sourceCodeLink)}
                        />

                        {/* Storage / Drive */}
                        <ResourceLinkItem
                            url={currentProject.storageLink}
                            label="Project Files"
                            active={activeResource?.url === currentProject.storageLink}
                            onShow={() => handleSwitchResource('iframe', currentProject.storageLink)}
                        />

                        {/* Other Resources */}
                        {currentProject.resources?.map((res, i) => (
                            <ResourceLinkItem
                                key={i}
                                url={res.url}
                                label={res.label || res.name || `Resource ${i + 1}`}
                                type={res.type}
                                active={activeResource?.url === res.url}
                                onShow={() => handleSwitchResource('iframe', res.url)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Live Feedback Stream */}
            <div className="flex-1 p-4 overflow-y-auto min-h-0">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Live Feedback</h3>
                    <Button variant="ghost" size="sm" className="h-6 text-slate-400 hover:text-white gap-1" onClick={() => setShowQR(true)}>
                        <QrCode className="w-3 h-3" /> <span className="text-xs">Share</span>
                    </Button>
                </div>
                <div className="space-y-3">
                    {reviews.filter(r => String(r.projectId) === String(currentProject?._id) && r.comment).length === 0 ? (
                        <div className="text-center py-10 text-slate-600 italic text-sm">
                            Waiting for feedback...
                        </div>
                    ) : (
                        reviews
                            .filter(r => String(r.projectId) === String(currentProject?._id) && r.comment)
                            .map((review, i) => {
                                const userType = review.userType || 'student';
                                const visibility = topic?.presentationConfig?.feedbackVisibility || { teacher: true, student: true, guest: true };
                                const showName = visibility[userType] !== false;
                                const displayName = showName ? (review.reviewerName || 'Anonymous') : 'Anonymous';

                                return (
                                    <div key={i} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 group relative">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`font-bold text-sm ${userType === 'teacher' ? 'text-purple-400' : 'text-slate-300'}`}>
                                                {displayName} {showName && userType === 'teacher' && '(Teacher)'} {showName && userType === 'guest' && '(Guest)'}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500">
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
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-400 mb-2">{review.comment}</p>
                                    </div>
                                );
                            })
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="p-4 bg-slate-800/80 border-t border-slate-700/50 shrink-0">
                {(() => {
                    const projectReviews = reviews.filter(r => String(r.projectId) === String(currentProject?._id));
                    const count = projectReviews.length;

                    // Simple average calculation across all score fields
                    let totalScore = 0;
                    let scoreCount = 0;
                    projectReviews.forEach(r => {
                        r.scores?.forEach(s => {
                            if (typeof s.score === 'number' && s.score > 0) {
                                totalScore += s.score;
                                scoreCount++;
                            }
                        });
                    });
                    const avg = scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : '-';

                    return (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900/50 p-3 rounded-lg text-center">
                                <div className="text-xs text-slate-500 uppercase">Avg Score</div>
                                <div className="text-2xl font-bold text-blue-400">{avg}</div>
                            </div>
                            <div className="bg-slate-900/50 p-3 rounded-lg text-center">
                                <div className="text-xs text-slate-500 uppercase">Reviews</div>
                                <div className="text-2xl font-bold text-purple-400">{count}</div>
                            </div>
                        </div>
                    );
                })()}
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
