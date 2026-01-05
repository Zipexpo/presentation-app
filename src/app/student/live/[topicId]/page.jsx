'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Star, MessageSquare, Check, RefreshCw, Loader2, Video, FileText, Code, ExternalLink, X, Maximize2, Link as LinkIcon, Pencil, Trash2, Pause } from 'lucide-react'
import { useSession } from 'next-auth/react'
import StudentTimer from '@/components/student/StudentTimer'
import { getEmbedUrl, isEmbeddable } from '@/lib/utils'

export default function StudentLivePage() {
    const { topicId } = useParams()
    const router = useRouter()
    const { data: session, status } = useSession()

    const [loading, setLoading] = useState(true)
    const [liveState, setLiveState] = useState(null)
    const [submittingScores, setSubmittingScores] = useState(false)
    const [submittingComment, setSubmittingComment] = useState(false)
    const [scoreSuccess, setScoreSuccess] = useState(false)
    const [commentSuccess, setCommentSuccess] = useState(false)

    // Viewer State
    const [activeResource, setActiveResource] = useState(null);

    // Form State
    const [scores, setScores] = useState({}) // { [label]: number }
    const [comment, setComment] = useState('')
    const [reviews, setReviews] = useState([]) // unused?
    const [feedbackType, setFeedbackType] = useState('comment')
    const [showMobileScores, setShowMobileScores] = useState(false)

    // Reviews State
    const [myReviews, setMyReviews] = useState([])
    const [editingReview, setEditingReview] = useState(null) // { id: string, text: string }

    // Guest Identity State
    const [guestName, setGuestName] = useState('')
    const [guestId, setGuestId] = useState('')

    // Load/Create Guest Identity
    useEffect(() => {
        if (typeof window !== 'undefined') {
            let gid = localStorage.getItem('presentation_guest_id');
            if (!gid) {
                gid = 'guest_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
                localStorage.setItem('presentation_guest_id', gid);
            }
            setGuestId(gid);

            const savedName = localStorage.getItem('presentation_guest_name');
            if (savedName) setGuestName(savedName);
        }
    }, []);

    // Refs to track previous project ID to reset state
    const prevProjectIdRef = useRef(null)

    // Fetch My Reviews
    const fetchMyReviews = useCallback(async () => {
        if (!liveState?.currentProject?._id) return;
        const pid = liveState.currentProject._id;

        // Only fetch if we have a way to identify (session or guestId)
        if (status === 'unauthenticated' && !guestId) return;

        let url = `/api/student/topics/${topicId}/review?projectId=${pid}`;
        if (status === 'unauthenticated' && guestId) url += `&guestId=${guestId}`;

        try {
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setMyReviews(data);
            }
        } catch (err) { console.error("Error fetching reviews", err); }
    }, [liveState?.currentProject?._id, guestId, status, topicId]);

    // Poll for State
    useEffect(() => {
        // Relaxed Auth Check: Allow if guest mode is enabled for the topic

        const poll = async () => {
            try {
                const res = await fetch(`/api/student/topics/${topicId}/live`);
                if (res.ok) {
                    const data = await res.json();
                    setLiveState(data);

                    // Strict Auth Check if NOT guest mode
                    if (status === 'unauthenticated' && !data.config?.allowGuest) {
                        router.push('/login');
                        return;
                    }

                    // Reset if project changed
                    const pid = data.currentProject?._id;
                    if (pid && pid !== prevProjectIdRef.current) {
                        setScores({});
                        setComment('');
                        setActiveResource(null); // Reset viewer
                        prevProjectIdRef.current = pid;
                        setMyReviews([]); // Clear reviews for new project
                    }
                } else if (res.status === 401) {
                    if (status === 'unauthenticated') router.push('/login');
                }
            } catch (err) {
                console.error("Polling error", err);
            } finally {
                setLoading(false);
            }
        };

        poll(); // Initial
        const timer = setInterval(poll, 5000); // Every 5s
        return () => clearInterval(timer);
    }, [topicId, status, router]);

    // Fetch reviews when project or identity changes
    useEffect(() => {
        fetchMyReviews();
    }, [liveState?.currentProject?._id, guestId, status, fetchMyReviews]);

    // PRE-CALCULATE CONFIG & GROUPS (Must be before early returns)
    let config = liveState?.config;
    let currentProject = liveState?.currentProject;

    // Targeted Evaluation Override logic
    if (config?.specialEvaluationConfig?.enabled && session?.user?.email) {
        const isEvaluator = config.specialEvaluationConfig.evaluatorEmails?.some(e => e.trim().toLowerCase() === session.user.email.toLowerCase());
        if (isEvaluator) {
            config = {
                ...config,
                gradingType: 'survey',
                surveyQuestions: config.specialEvaluationConfig.surveyQuestions
            };
        }
    }

    const groupedQuestions = useMemo(() => {
        const qs = config?.surveyQuestions || [];
        const res = [];
        let currentGroup = null;

        qs.forEach(q => {
            if (q.type === 'rubric') {
                if (!currentGroup) {
                    currentGroup = { type: 'rubric-group', questions: [q] };
                    res.push(currentGroup);
                } else {
                    currentGroup.questions.push(q);
                }
            } else {
                currentGroup = null;
                res.push(q);
            }
        });
        return res;
    }, [config?.surveyQuestions]);

    const submitScores = async (e) => {
        e.preventDefault();
        if (!liveState?.currentProject?._id) return;

        // Guest Validation
        if (status === 'unauthenticated' && !guestName.trim()) {
            alert('Please enter your name before submitting.');
            return;
        }

        setSubmittingScores(true);
        try {
            // Transform scores object to array, handling text values
            const scoresArray = Object.entries(scores).map(([label, value]) => {
                const isText = typeof value === 'string';
                return {
                    label,
                    score: isText ? 0 : value,
                    textValue: isText ? value : undefined
                };
            });

            const res = await fetch(`/api/student/topics/${topicId}/review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: liveState.currentProject._id,
                    scores: scoresArray,
                    guestId: status === 'unauthenticated' ? guestId : undefined,
                    reviewerName: status === 'unauthenticated' ? guestName : undefined
                    // comment is omitted
                })
            });

            if (res.ok) {
                setScoreSuccess(true);
                setTimeout(() => setScoreSuccess(false), 2000);
            } else {
                alert('Failed to save scores.');
            }
        } catch (err) {
            console.error(err);
            alert('Error submitting scores');
        } finally {
            setSubmittingScores(false);
        }
    };

    const submitComment = async () => {
        if (!liveState?.currentProject?._id || !comment.trim()) return;

        // Guest Validation
        if (status === 'unauthenticated' && !guestName.trim()) {
            alert('Please enter your name to comment.');
            return;
        }

        setSubmittingComment(true);
        try {
            // Send ONLY comment
            const res = await fetch(`/api/student/topics/${topicId}/review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: liveState.currentProject._id,
                    comment,
                    guestId: status === 'unauthenticated' ? guestId : undefined,
                    reviewerName: status === 'unauthenticated' ? guestName : undefined,
                    feedbackType
                })
            });

            if (res.ok) {
                setCommentSuccess(true);
                setComment(''); // Clear input
                fetchMyReviews(); // Refresh list
                setTimeout(() => setCommentSuccess(false), 2000);
            } else {
                alert('Failed to send comment.');
            }
        } catch (err) {
            console.error(err);
            alert('Error sending comment');
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!confirm('Are you sure you want to delete this comment?')) return;
        try {
            let url = `/api/student/topics/${topicId}/review?reviewId=${reviewId}`;
            if (status === 'unauthenticated') url += `&guestId=${guestId}`;

            const res = await fetch(url, { method: 'DELETE' });
            if (res.ok) fetchMyReviews();
            else alert('Failed to delete');
        } catch (e) { console.error(e); }
    };

    const handleUpdateReview = async (reviewId, newComment) => {
        if (!newComment.trim()) return;
        try {
            const res = await fetch(`/api/student/topics/${topicId}/review`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reviewId,
                    comment: newComment,
                    guestId: status === 'unauthenticated' ? guestId : undefined
                })
            });
            if (res.ok) {
                setEditingReview(null);
                fetchMyReviews();
            } else alert('Failed to update');
        } catch (e) { console.error(e); }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Loading...</div>;

    // Idle State
    if (!liveState?.session || liveState.session.status === 'idle' || !liveState.currentProject) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <div className="glass-card p-8 max-w-md w-full">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Waiting for Presentation</h2>
                    <p className="text-slate-500">The teacher hasn&apos;t started a project yet. Sit tight!</p>
                </div>
            </div>
        );
    }

    // Paused State
    if (liveState?.session?.status === 'paused') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <div className="glass-card p-8 max-w-md w-full border-yellow-200 bg-yellow-50/50">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Pause className="w-8 h-8 text-yellow-600 fill-yellow-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Presentation Paused</h2>
                    <p className="text-slate-500">The presenter has paused the session.<br />Hang tight, we&apos;ll be back shortly!</p>
                </div>
            </div>
        );
    }

    // (State is already derived at the top of the component)

    return (
        <div className="min-h-screen pb-20 bg-slate-50/50">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-white/60 sticky top-0 z-20 px-4 py-3 shadow-sm transition-all">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <div className="text-xs text-blue-600 font-bold uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Now Presenting
                        </div>
                        <h1 className="font-bold text-slate-900 text-lg md:text-xl leading-tight truncate max-w-[200px] md:max-w-md">{currentProject.projectName}</h1>
                        {status === 'unauthenticated' && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 font-bold uppercase tracking-wider ml-0 mt-1 inline-block">Guest Mode</span>}
                    </div>
                    <div className="text-right flex items-center gap-3">
                        <div className="bg-blue-100/80 text-blue-700 font-bold px-3 py-1 rounded-full text-sm shadow-sm whitespace-nowrap">
                            Grp {currentProject.groupNumber}
                        </div>
                        {liveState.session.startTime && (
                            <div className="font-mono text-xl font-bold text-slate-700 hidden sm:block">
                                <StudentTimer activeSession={liveState.session} config={config} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">

                    {/* LEFT COLUMN: Context & Materials (Sticky on Desktop) */}
                    <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-24 h-fit">
                        {/* Timer Mobile */}
                        {liveState.session.startTime && (
                            <div className="font-mono text-2xl font-bold text-slate-700 sm:hidden text-center glass-card p-2 mb-4">
                                <StudentTimer activeSession={liveState.session} config={config} />
                            </div>
                        )}

                        {/* Team Info */}
                        <div className="glass-card p-5">
                            <h3 className="text-xs text-slate-500 uppercase font-bold mb-3 flex items-center gap-2">
                                <div className="p-1 bg-slate-100 rounded text-slate-500"><Check className="w-3 h-3" /></div> Presenters
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {currentProject.members?.map((m, i) => (
                                    <span key={i} className="bg-white/80 text-slate-700 border border-slate-100 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm">{m.name}</span>
                                ))}
                            </div>
                        </div>

                        {/* Project Materials */}
                        <div className="glass-card p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs text-slate-500 uppercase font-bold flex items-center gap-2">
                                    <div className="p-1 bg-slate-100 rounded text-slate-500"><FileText className="w-3 h-3" /></div> Materials
                                </h3>
                            </div>

                            {/* Resource Viewer */}
                            {activeResource && (
                                <div className="mb-4 bg-slate-900 rounded-xl overflow-hidden relative group shadow-2xl ring-4 ring-slate-100/50">
                                    <div className="aspect-video w-full">
                                        <iframe
                                            src={getEmbedUrl(activeResource.url, activeResource.type)}
                                            className="w-full h-full"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            referrerPolicy="no-referrer"
                                            title="Resource Viewer"
                                        />
                                    </div>
                                    <div className="bg-slate-900/90 text-white text-xs p-2 flex justify-between items-center absolute top-0 w-full opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="truncate font-medium px-2">{activeResource.label}</span>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 text-white hover:bg-white/20 rounded-full"
                                            onClick={() => setActiveResource(null)}
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                {[
                                    { url: currentProject.videoLink, label: 'Video Submission', icon: Video, color: 'text-red-500', bg: 'bg-red-50' },
                                    { url: currentProject.presentationLink, label: 'Presentation Slides', icon: FileText, color: 'text-orange-500', bg: 'bg-orange-50' },
                                    { url: currentProject.sourceCodeLink, label: 'Source Code', icon: Code, color: 'text-slate-600', bg: 'bg-slate-100' },
                                    ...(currentProject.resources?.map(r => ({ ...r, label: r.label || r.name, icon: LinkIcon, color: 'text-blue-500', bg: 'bg-blue-50' })) || []),
                                    ...(currentProject.additionalMaterials?.map(m => ({ url: m.url, label: m.label, icon: LinkIcon, color: 'text-yellow-500', bg: 'bg-yellow-50' })) || [])
                                ].filter(r => r.url).map((res, i) => (
                                    <div key={i} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${activeResource?.url === res.url ? 'bg-blue-50/80 border-blue-200 shadow-inner' : 'bg-white/60 border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm'}`}>
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`p-2 rounded-lg ${res.bg} ${res.color} shadow-sm`}>
                                                <res.icon className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-semibold text-slate-700 truncate">{res.label || 'Resource'}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            {isEmbeddable(res.url) && (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className={`h-8 text-xs font-medium rounded-lg ${activeResource?.url === res.url ? 'bg-blue-200/50 text-blue-700' : ''}`}
                                                    onClick={() => setActiveResource(activeResource?.url === res.url ? null : res)}
                                                >
                                                    {activeResource?.url === res.url ? 'Close' : 'View'}
                                                </Button>
                                            )}
                                            <a href={res.url} target="_blank" rel="noopener noreferrer" className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white text-slate-400 hover:text-blue-600 transition-colors border border-transparent hover:border-slate-100 hover:shadow-sm">
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                                {[
                                    { url: currentProject.videoLink },
                                    { url: currentProject.presentationLink },
                                    { url: currentProject.sourceCodeLink },
                                    ...(currentProject.resources || []),
                                    ...(currentProject.additionalMaterials || [])
                                ].every(r => !r.url) && (
                                        <div className="text-center py-8 text-slate-400 text-sm italic border-dashed border-2 border-slate-200 rounded-xl bg-slate-50/50">
                                            No materials available for this project.
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Grading Form & Comments */}
                    <div className="lg:col-span-7 xl:col-span-8 space-y-8">

                        {/* 1. GRADING FORM */}
                        <form onSubmit={submitScores} className="space-y-6">
                            <div className="flex items-center gap-2 mb-2 lg:hidden">
                                <div className="h-px bg-slate-200 flex-1"></div>
                                <span className="text-xs uppercase font-bold text-slate-400">Grading Form</span>
                                <button type="button" onClick={() => setShowMobileScores(!showMobileScores)} className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${showMobileScores ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                    {showMobileScores ? 'Hide Points' : 'Show Points'}
                                </button>
                                <div className="h-px bg-slate-200 flex-1"></div>
                            </div>

                            {/* Survey / Rubric Container */}
                            <div className="space-y-6">
                                {config?.gradingType === 'survey' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {groupedQuestions.map((item, idx) => {
                                            // -------------------------
                                            // RUBRIC GROUP (MATRIX)
                                            // -------------------------
                                            // -------------------------
                                            // RUBRIC GROUP (MATRIX)
                                            // -------------------------
                                            if (item.type === 'rubric-group' || item.type === 'matrix') {
                                                const isNativeMatrix = item.type === 'matrix';
                                                const headers = isNativeMatrix ? (item.columns || []) : (item.questions[0]?.options || []);
                                                const rows = isNativeMatrix ? (item.rows || []) : (item.questions || []);

                                                return (
                                                    <div key={idx} className="md:col-span-2 glass-card overflow-hidden border border-white/60 shadow-sm animate-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                                                        {isNativeMatrix && item.question && (
                                                            <div className="px-6 py-4 border-b border-slate-200/60 bg-white/50">
                                                                <h3 className="font-bold text-lg text-slate-800">{item.question}</h3>
                                                            </div>
                                                        )}

                                                        {/* A. DESKTOP VIEW (Table) */}
                                                        <div className="hidden md:block overflow-x-auto">
                                                            <table className="w-full text-sm text-left">
                                                                <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                                                                    <tr>
                                                                        <th className="px-4 py-3 font-bold w-1/4 min-w-[150px] bg-slate-50/80 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Criteria</th>
                                                                        {headers.map((h, i) => (
                                                                            <th key={i} className="px-4 py-3 font-bold text-center min-w-[180px] align-top bg-slate-50/80">
                                                                                <div className="flex flex-col gap-0.5 items-center">
                                                                                    {(h.label || h.columnLabel) && <span className="text-xs md:text-sm font-extrabold text-slate-800 uppercase tracking-tight">{h.label || h.columnLabel}</span>}
                                                                                    <span className="text-[10px] text-slate-500 font-mono">({h.score ?? h.baseScore} pts)</span>
                                                                                </div>
                                                                            </th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {rows.map((q, qIdx) => {
                                                                        const questionText = isNativeMatrix ? q.text : q.question;
                                                                        const options = isNativeMatrix ? q.cells : q.options;

                                                                        return (
                                                                            <tr key={qIdx} className={`hover:bg-slate-50/50 transition-colors ${qIdx % 2 === 0 ? 'bg-white/40' : 'bg-transparent'}`}>
                                                                                <td className="px-4 py-4 font-bold text-slate-700 align-top sticky left-0 bg-white/95 backdrop-blur-sm shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-10">
                                                                                    {questionText}
                                                                                </td>
                                                                                {options?.map((opt, oIdx) => {
                                                                                    const isSelected = scores[questionText] === opt.score;
                                                                                    return (
                                                                                        <td key={oIdx} className="p-2 align-top h-full">
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => setScores({ ...scores, [questionText]: opt.score })}
                                                                                                className={`w-full h-full p-4 rounded-lg text-left transition-all duration-200 border leading-relaxed min-h-[120px] flex flex-col justify-start ${isSelected
                                                                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-200'
                                                                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50/30'}`}
                                                                                            >
                                                                                                <div
                                                                                                    className={`text-xs md:text-sm prose prose-sm max-w-none ${isSelected ? 'prose-invert text-white' : 'text-slate-600'}`}
                                                                                                    dangerouslySetInnerHTML={{ __html: opt.label }}
                                                                                                    style={{ margin: 0 }}
                                                                                                />
                                                                                            </button>
                                                                                        </td>
                                                                                    );
                                                                                })}
                                                                            </tr>
                                                                        )
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>

                                                        {/* B. MOBILE VIEW (Card Stack) */}
                                                        <div className="md:hidden space-y-4 p-4 bg-slate-50/50">
                                                            {rows.map((q, qIdx) => {
                                                                const questionText = isNativeMatrix ? q.text : q.question;
                                                                const options = isNativeMatrix ? q.cells : q.options;

                                                                return (
                                                                    <div key={qIdx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                                                        {/* Criteria Header */}
                                                                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10 backdrop-blur-sm bg-slate-50/90">
                                                                            <span className="font-bold text-sm text-slate-800 leading-tight pr-2">{questionText}</span>
                                                                            {scores[questionText] !== undefined && (
                                                                                <span className="shrink-0 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 whitespace-nowrap">
                                                                                    {scores[questionText]} pts
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {/* Options/Cells */}
                                                                        <div className="divide-y divide-slate-50">
                                                                            {options?.map((opt, oIdx) => {
                                                                                const isSelected = scores[questionText] === opt.score;
                                                                                // Fallback for column header
                                                                                const colHeader = headers[oIdx]?.label || headers[oIdx]?.columnLabel || `Option ${oIdx + 1}`;

                                                                                return (
                                                                                    <button
                                                                                        key={oIdx}
                                                                                        type="button"
                                                                                        onClick={() => setScores({ ...scores, [questionText]: opt.score })}
                                                                                        className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors active:bg-slate-100 ${isSelected ? 'bg-blue-50/60' : 'bg-transparent hover:bg-slate-50'}`}
                                                                                    >
                                                                                        {/* Custom Radio Circle */}
                                                                                        <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300 bg-white'}`}>
                                                                                            {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                                                        </div>

                                                                                        <div className="flex-1 min-w-0">
                                                                                            {showMobileScores && (
                                                                                                <div className="flex justify-between items-baseline mb-1">
                                                                                                    <span className={`text-[10px] uppercase font-bold tracking-wider truncate mr-2 ${isSelected ? 'text-blue-700' : 'text-slate-500'}`}>
                                                                                                        {colHeader}
                                                                                                    </span>
                                                                                                    <span className="text-[10px] font-mono font-bold text-slate-400">
                                                                                                        {opt.score} pts
                                                                                                    </span>
                                                                                                </div>
                                                                                            )}
                                                                                            <div
                                                                                                className={`text-sm prose prose-sm max-w-none leading-relaxed ${isSelected ? 'text-slate-800' : 'text-slate-600'}`}
                                                                                                dangerouslySetInnerHTML={{ __html: opt.label }}
                                                                                            />
                                                                                        </div>
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // -------------------------
                                            // REGULAR ITEMS
                                            // -------------------------
                                            const q = item;
                                            return (
                                                <div key={idx} className={`glass-card p-5 animate-in slide-in-from-bottom-2 duration-500 border border-white/60 shadow-sm hover:shadow-md transition-shadow ${q.type === 'section' ? 'md:col-span-2 bg-slate-100/50 !border-none !shadow-none !p-0 mt-4' : ''} ${q.type === 'text' || q.type === 'scale' ? 'md:col-span-2' : ''}`} style={{ animationDelay: `${idx * 50}ms` }}>

                                                    {/* SECTION HEADER */}
                                                    {q.type === 'section' ? (
                                                        <div className="flex items-center gap-4 py-2">
                                                            <div className="h-px bg-slate-300 flex-1"></div>
                                                            <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wide">{q.title || q.question}</h3>
                                                            <div className="h-px bg-slate-300 flex-1"></div>
                                                        </div>
                                                    ) : (
                                                        // STANDARD QUESTION HEADER
                                                        <div className="flex justify-between items-start gap-4 mb-3">
                                                            <Label className="text-base font-bold text-slate-800 leading-snug">{q.question}</Label>
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100 shrink-0">
                                                                {q.type || 'choice'}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Choice */}
                                                    {(!q.type || q.type === 'choice') && (
                                                        <div className="space-y-2">
                                                            {q.options?.map((opt, oIdx) => (
                                                                <button
                                                                    type="button"
                                                                    key={oIdx}
                                                                    onClick={() => setScores({ ...scores, [q.question]: opt.score })}
                                                                    className={`w-full relative p-3 pl-4 pr-12 rounded-xl border text-left transition-all duration-200 group flex items-center justify-between ${scores[q.question] === opt.score ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.01]' : 'bg-white/50 border-slate-200 hover:bg-white hover:border-blue-300 text-slate-700 hover:shadow-sm'}`}
                                                                >
                                                                    <div className="font-semibold text-sm">{opt.label}</div>
                                                                    {scores[q.question] === opt.score && <Check className="w-5 h-5 text-white/90" />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Rating */}
                                                    {q.type === 'rating' && (
                                                        <div className="flex justify-center gap-3 py-4 bg-white/30 rounded-xl">
                                                            {[1, 2, 3, 4, 5].map((val) => (
                                                                <button
                                                                    key={val}
                                                                    type="button"
                                                                    onClick={() => setScores({ ...scores, [q.question]: val })}
                                                                    className="transition-transform hover:scale-110 focus:outline-none group"
                                                                >
                                                                    <Star
                                                                        className={`w-8 h-8 md:w-10 md:h-10 transition-colors ${scores[q.question] >= val ? 'fill-yellow-400 text-yellow-400 drop-shadow-sm' : 'text-slate-200 group-hover:text-slate-300'}`}
                                                                        strokeWidth={scores[q.question] >= val ? 0 : 2}
                                                                    />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Scale */}
                                                    {q.type === 'scale' && (
                                                        <div className="py-2 px-2">
                                                            <div className="relative mb-6">
                                                                <div className="absolute top-1/2 left-0 w-full h-2 bg-slate-100 rounded-full -z-10"></div>
                                                                <input
                                                                    type="range"
                                                                    min={q.scaleConfig?.min || 1}
                                                                    max={q.scaleConfig?.max || 5}
                                                                    step="1"
                                                                    value={scores[q.question] || (q.scaleConfig?.min || 1)}
                                                                    onChange={(e) => setScores({ ...scores, [q.question]: Number(e.target.value) })}
                                                                    className="w-full h-2 bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110"
                                                                />
                                                            </div>
                                                            <div className="flex justify-between items-end">
                                                                <div className="text-xs font-semibold text-slate-400 uppercase">{q.scaleConfig?.minLabel || 'Low'}</div>
                                                                <div className="text-2xl font-bold text-blue-600 font-mono bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                                                                    {scores[q.question] || (q.scaleConfig?.min || 1)}
                                                                </div>
                                                                <div className="text-xs font-semibold text-slate-400 uppercase">{q.scaleConfig?.maxLabel || 'High'}</div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Text */}
                                                    {q.type === 'text' && (
                                                        <textarea
                                                            className="w-full p-4 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition min-h-[100px] shadow-inner font-medium"
                                                            placeholder="Type your answer here..."
                                                            value={scores[q.question] || ''}
                                                            onChange={(e) => setScores({ ...scores, [q.question]: e.target.value })}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {(!groupedQuestions || groupedQuestions.length === 0) && (
                                            <div className="md:col-span-2 text-center text-slate-500 italic p-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">No survey questions configured.</div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {config?.gradingRubric?.map((criteria, idx) => (
                                            <div key={idx} className="glass-card p-5 border border-white/60 shadow-sm">
                                                <div className="flex justify-between items-center mb-4">
                                                    <Label className="text-base font-semibold text-slate-700">{criteria.label || `Question ${idx + 1}`}</Label>
                                                    <span className="text-2xl font-bold text-blue-600 w-16 text-right font-mono bg-blue-50 rounded px-1">
                                                        {scores[criteria.label] || 0}<span className="text-sm text-slate-400 font-normal">/{criteria.maxScore}</span>
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max={criteria.maxScore}
                                                    step="1"
                                                    value={scores[criteria.label] || 0}
                                                    onChange={(e) => setScores({ ...scores, [criteria.label]: Number(e.target.value) })}
                                                    className="w-full h-2 bg-slate-200/80 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                />
                                                <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium uppercase tracking-wider">
                                                    <span>Poor</span>
                                                    <span>Excellent</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Score Submit Button */}
                            <div className="pt-4 border-t border-slate-200">
                                <div className="mb-4">
                                    {status === 'authenticated' ? (
                                        <div className="text-xs text-center text-slate-500 font-medium">
                                            Submitting as <span className="font-bold text-blue-600">{session?.user?.name}</span>
                                        </div>
                                    ) : (
                                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                                            <Label className="text-xs font-bold text-amber-800 uppercase mb-1 block">Your Name (Required)</Label>
                                            <Input
                                                placeholder="Enter your name..."
                                                value={guestName}
                                                onChange={(e) => {
                                                    setGuestName(e.target.value);
                                                    localStorage.setItem('presentation_guest_name', e.target.value);
                                                }}
                                                className="bg-white border-amber-300 focus:ring-amber-500/20 text-amber-900 placeholder:text-amber-400/70"
                                            />
                                        </div>
                                    )}
                                </div>
                                <Button
                                    type="submit"
                                    size="lg"
                                    disabled={submittingScores}
                                    className={`w-full font-bold h-14 text-lg shadow-lg rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 ${scoreSuccess ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'}`}
                                >
                                    {submittingScores ? <Loader2 className="animate-spin w-5 h-5" /> : (scoreSuccess ? <Check className="w-6 h-6" /> : <RefreshCw className="w-5 h-5" />)}
                                    {submittingScores ? 'Submitting Scores...' : (scoreSuccess ? 'Scores Saved!' : 'Update Evaluation')}
                                </Button>
                            </div>
                        </form>


                        {/* 2. COMMENT / QUESTION SECTION */}
                        {(config?.allowComments !== false) && (
                            <div className="glass-card p-6 border-t-4 border-t-purple-500 shadow-md">
                                <div className="flex items-center justify-between mb-4">
                                    <Label className="flex items-center gap-2 text-base font-bold text-slate-800">
                                        <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg"><MessageSquare className="w-4 h-4" /></div>
                                        Feedback
                                    </Label>
                                    <div className="flex bg-slate-100 p-1 rounded-lg">
                                        <button
                                            type="button"
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${feedbackType === 'comment' ? 'bg-white shadow text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
                                            onClick={() => setFeedbackType('comment')}
                                        >
                                            Comment
                                        </button>
                                        <button
                                            type="button"
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${feedbackType === 'question' ? 'bg-white shadow text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}
                                            onClick={() => setFeedbackType('question')}
                                        >
                                            Question
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    className="w-full p-4 rounded-xl border border-slate-200 bg-white/80 text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition min-h-[100px] placeholder:text-slate-400 shadow-sm mb-4"
                                    placeholder={feedbackType === 'question' ? "What's your question for the team?" : "Share your thoughts or feedback..."}
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                />
                                <div className="flex justify-end">
                                    <Button
                                        onClick={submitComment}
                                        disabled={submittingComment || !comment.trim()}
                                        className={`bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-200 transition-all ${commentSuccess ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                    >
                                        {submittingComment ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : (commentSuccess ? <Check className="w-4 h-4 mr-2" /> : <MessageSquare className="w-4 h-4 mr-2" />)}
                                        {submittingComment ? 'Sending...' : (commentSuccess ? 'Sent!' : 'Send Comment')}
                                    </Button>
                                </div>

                                {/* My Comments List */}
                                {myReviews.length > 0 && (
                                    <div className="mt-8 pt-6 border-t border-purple-100">
                                        <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span> Your History
                                        </h4>
                                        <div className="space-y-3">
                                            {myReviews.map(r => (
                                                <div key={r._id} className="bg-white/80 p-4 rounded-xl border border-purple-100 shadow-sm transition-all hover:shadow-md hover:border-purple-200 group">
                                                    {editingReview?.id === r._id ? (
                                                        <div className="space-y-2">
                                                            <textarea
                                                                value={editingReview.text}
                                                                onChange={e => setEditingReview({ ...editingReview, text: e.target.value })}
                                                                className="w-full p-2 text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500/20"
                                                                rows={2}
                                                            />
                                                            <div className="flex gap-2 justify-end">
                                                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingReview(null)}>Cancel</Button>
                                                                <Button size="sm" className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white" onClick={() => handleUpdateReview(r._id, editingReview.text)}>Save</Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                                                                {r.feedbackType === 'question' && (
                                                                    <span className="inline-block bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded mr-2 align-middle border border-amber-200">
                                                                        QUESTION
                                                                    </span>
                                                                )}
                                                                {r.comment}
                                                            </div>
                                                            <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100/50">
                                                                <span className="text-[10px] text-slate-400 font-medium">
                                                                    {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => setEditingReview({ id: r._id, text: r.comment })}
                                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                        title="Edit"
                                                                    >
                                                                        <Pencil className="w-3 h-3" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteReview(r._id)}
                                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
