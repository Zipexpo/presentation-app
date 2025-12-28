'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ExternalLink, PanelRightClose, PanelRightOpen, Maximize2, Minimize2, Settings, Check } from 'lucide-react'
import { useSession } from 'next-auth/react'

import PresentationTimer from '@/components/presentation/PresentationTimer'
import PresentationViewer from '@/components/presentation/PresentationViewer'
import PresentationSidebar from '@/components/presentation/PresentationSidebar'
import PresentationSettingsDialog from '@/components/presentation/PresentationSettingsDialog'

export default function PresentationPage() {
    const { id } = useParams()
    const router = useRouter()
    const { data: session } = useSession()

    // Data State
    const [topic, setTopic] = useState(null)
    const [projects, setProjects] = useState([])
    const [currentProject, setCurrentProject] = useState(null)
    const [currentIndex, setCurrentIndex] = useState(-1)
    const [reviews, setReviews] = useState([]) // [NEW]

    // UI State
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [showUpcoming, setShowUpcoming] = useState(false) // Still needed for Overlay? Or move to Timer?
    const [showSettings, setShowSettings] = useState(false)

    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [activeResource, setActiveResource] = useState(null)
    const [isCopied, setIsCopied] = useState(false)

    // ... (Existing useEffects) ...

    // Load Data
    useEffect(() => {
        const fetchInitial = async () => {
            const res = await fetch(`/api/teacher/topics/${id}`);
            const data = await res.json();
            if (res.ok) {
                setTopic(data.topic);
                const sortedProjects = data.projects.sort((a, b) => (a.groupNumber || 999) - (b.groupNumber || 999));
                setProjects(sortedProjects);

                if (data.topic.activeSession?.currentProjectId) {
                    const idx = sortedProjects.findIndex(p => p._id === data.topic.activeSession.currentProjectId);
                    if (idx !== -1) {
                        setCurrentIndex(idx);
                        setCurrentProject(sortedProjects[idx]);
                    }
                }
            }
        };
        fetchInitial();
    }, [id]);

    // [NEW] Poll Reviews
    useEffect(() => {
        const fetchReviews = async () => {
            try {
                // Fetch all reviews for this topic
                const res = await fetch(`/api/teacher/topics/${id}/reviews`);
                if (res.ok) {
                    const data = await res.json();
                    setReviews(data);
                }
            } catch (err) {
                console.error("Failed to fetch reviews", err);
            }
        };

        fetchReviews(); // Initial
        const timer = setInterval(fetchReviews, 5000); // Poll every 5s
        return () => clearInterval(timer);
    }, [id]);

    // Resource Sync Logic
    useEffect(() => {
        if (!currentProject) {
            setActiveResource(null);
            return;
        }

        const defaultRes = topic?.presentationConfig?.defaultResource || 'presentation';

        // Helper to check resource existence
        const hasVideo = !!currentProject.videoLink;
        const hasSlides = !!currentProject.presentationLink;

        if (defaultRes === 'video') {
            if (hasVideo) {
                setActiveResource({ type: 'video', url: currentProject.videoLink });
            } else if (hasSlides) {
                setActiveResource({ type: 'presentation', url: currentProject.presentationLink });
            } else {
                setActiveResource(null);
            }
        } else {
            // Default "presentation" or anything else -> prioritization: Slides > Video
            if (hasSlides) {
                setActiveResource({ type: 'presentation', url: currentProject.presentationLink });
            } else if (hasVideo) {
                setActiveResource({ type: 'video', url: currentProject.videoLink });
            } else {
                setActiveResource(null);
            }
        }
    }, [currentProject, topic?.presentationConfig?.defaultResource]);

    // Sync Client State with Server Transition (e.g. after Break -> Next Project)
    useEffect(() => {
        if (!topic?.activeSession?.currentProjectId || projects.length === 0) return;

        const serverProjectId = topic.activeSession.currentProjectId;
        if (currentProject && currentProject._id === serverProjectId) return;

        const idx = projects.findIndex(p => p._id === serverProjectId);
        if (idx !== -1) {
            setCurrentIndex(idx);
            setCurrentProject(projects[idx]);
        }
    }, [topic?.activeSession?.currentProjectId, projects, currentProject]);

    // Controls
    const handleControl = useCallback(async (action, value) => {
        // debugger; // Removed
        let payload = { action };
        if (action === 'setPhase') {
            payload.phase = value;
        }

        let newIndex = currentIndex;
        let pIndex = currentIndex; // local var for logic

        if (action === 'next' || action === 'prev' || action === 'nextPhase') {
            if (action === 'next') newIndex = Math.min(pIndex + 1, projects.length - 1);
            if (action === 'prev') newIndex = Math.max(pIndex - 1, 0);

            // For nextPhase with switch project
            if (action === 'nextPhase') newIndex = Math.min(pIndex + 1, projects.length - 1);

            if (pIndex === -1 && (action === 'next' || action === 'nextPhase')) newIndex = 0;

            if (newIndex >= 0 && newIndex < projects.length) {
                payload.action = action; // next, prev, or nextPhase
                payload.projectId = projects[newIndex]._id;

                // Only update local state immediately if we are sure (for next/prev), 
                // but for nextPhase the server decides. 
                // Actually, if we are just passing projectId blindly, it handles the logic.
                if (action !== 'nextPhase') {
                    setCurrentIndex(newIndex);
                    setCurrentProject(projects[newIndex]);
                }
            } else if (action === 'nextPhase') {
                // Determine payload for nextPhase
                // Should we switch project?
                // If we are currently in 'break' phase (implies we are about to switch to next project)
                // AND there is no next project, we should STOP.

                // IMPORTANT: The timer just calls 'nextPhase'. It doesn't know the phase.
                // We assume the server knows the progression P -> Q -> B -> P(next).
                // If we are in 'break', the next step IS Next Project.

                const isBreakPhase = topic?.activeSession?.currentPhase === 'break';
                const hasNextProject = currentIndex + 1 < projects.length;

                if (isBreakPhase && !hasNextProject) {
                    // End of entire session
                    handleControl('stop');
                    return;
                }

                payload.action = 'nextPhase';
                // Pass correct next project ID just in case
                if (projects[currentIndex + 1]) {
                    payload.projectId = projects[currentIndex + 1]._id;
                }
            } else {
                return;
            }
        }
        else if (action === 'start') {
            if (pIndex === -1 && projects.length > 0) {
                payload.projectId = projects[0]._id;
                setCurrentIndex(0);
                setCurrentProject(projects[0]);
            } else if (currentProject) {
                payload.action = 'resume';
            }
        }

        const res = await fetch(`/api/teacher/topics/${id}/presentation`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const updatedTopic = await res.json();
        setTopic(updatedTopic);
    }, [currentIndex, projects, currentProject, id, topic]); // dependencies

    const handleJump = useCallback(async (project) => {
        const newIndex = projects.findIndex(p => p._id === project._id);
        if (newIndex === -1) return;

        setCurrentIndex(newIndex);
        setCurrentProject(project);

        const res = await fetch(`/api/teacher/topics/${id}/presentation`, {
            method: 'POST',
            body: JSON.stringify({ action: 'next', projectId: project._id })
        });
        const updatedTopic = await res.json();
        setTopic(updatedTopic);
    }, [projects, id]);

    const handleSwitchResource = useCallback((type, url) => {
        setActiveResource({ type, url });
    }, []);

    const handleDeleteReview = async (reviewId) => {
        try {
            const res = await fetch(`/api/student/topics/${id}/review?reviewId=${reviewId}`, { method: 'DELETE' });
            if (res.ok) {
                setReviews(prev => prev.filter(r => r._id !== reviewId));
            } else {
                console.error("Delete failed", await res.text());
            }
        } catch (e) { console.error(e); }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
            setIsSidebarOpen(false);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    // Optimization: Only update showUpcoming when crossing threshold
    const handleTick = useCallback((remaining) => {
        const shouldShow = remaining < 60000 && remaining > 0;
        setShowUpcoming(prev => {
            if (prev !== shouldShow) return shouldShow;
            return prev;
        });
    }, []);

    const handleSettingsUpdate = (updatedTopic) => {
        // Just merge the presentationConfig if the API returns the full topic
        setTopic(prev => ({ ...prev, presentationConfig: updatedTopic.presentationConfig || prev.presentationConfig }));
    };

    if (!topic) return <div className="text-white p-10">Loading...</div>;

    const nextProject = projects[currentIndex + 1];

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col overflow-hidden">
            {/* Top Bar */}
            <div className="h-14 flex items-center justify-between px-6 bg-slate-800/50 backdrop-blur border-b border-slate-700/50 shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={() => router.push(`/teacher/topic/${id}`)}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Exit
                    </Button>
                    <h1 className="font-bold truncate max-w-xl hidden md:block">{topic.title}</h1>
                </div>
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-white"
                        onClick={() => setShowSettings(true)}
                        title="Presentation Settings"
                    >
                        <Settings className="w-5 h-5" />
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        className={`border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 hidden sm:flex ${isCopied ? 'bg-cyan-500/20 text-cyan-300' : ''}`}
                        onClick={() => {
                            const url = `${window.location.origin}/student/live/${id}`;
                            navigator.clipboard.writeText(url);
                            setIsCopied(true);
                            setTimeout(() => setIsCopied(false), 2000);
                        }}
                    >
                        {isCopied ? <Check className="w-4 h-4 mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
                        {isCopied ? 'Copied!' : 'Share Live'}
                    </Button>

                    {/* Timer Component */}
                    <PresentationTimer
                        activeSession={topic.activeSession}
                        config={topic.presentationConfig} // Ensure this exists in Topic model or fetch
                        onTimeUp={() => handleControl('nextPhase')}
                        onTick={handleTick}
                    />

                    <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}>
                        {isSidebarOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
                        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Viewer */}
                <PresentationViewer
                    currentProject={currentProject}
                    activeResource={activeResource}
                    showUpcoming={showUpcoming}
                    nextProject={nextProject}
                    isFullscreen={isFullscreen}
                    toggleFullscreen={toggleFullscreen}
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                />

                {/* Sidebar */}
                <PresentationSidebar
                    isSidebarOpen={isSidebarOpen}
                    topic={topic}
                    currentProject={currentProject}
                    activeResource={activeResource}
                    projects={projects}
                    reviews={reviews} // [NEW]
                    onDeleteReview={handleDeleteReview} // [NEW]
                    handleControl={handleControl}
                    handleJump={handleJump}
                    handleSwitchResource={handleSwitchResource}
                />
            </div>

            <PresentationSettingsDialog
                topic={topic}
                open={showSettings}
                onOpenChange={setShowSettings}
                onUpdate={handleSettingsUpdate}
            />
        </div>
    )
}
