'use client';

import { memo } from 'react';
import dynamic from 'next/dynamic';
import { getEmbedUrl } from '@/lib/utils';
import { ArrowLeft, ExternalLink, PanelRightClose, PanelRightOpen, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PDFPreview = dynamic(() => import('@/components/student/PDFPreview'), { ssr: false });

const PresentationViewer = memo(function PresentationViewer({
    currentProject,
    activeResource,
    showUpcoming,
    nextProject,
    isFullscreen,
    toggleFullscreen,
    isSidebarOpen,
    setIsSidebarOpen
}) {
    // Helper to check if resource is PDF
    const isPDF = (url) => url?.toLowerCase().endsWith('.pdf');

    // If no active resource, show placeholders
    if (!currentProject || !activeResource) {
        return (
            <div className="w-full h-full bg-black relative flex flex-col justify-center items-center">
                {showUpcoming && nextProject && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-600/90 text-white px-6 py-2 rounded-full shadow-lg backdrop-blur animate-pulse z-20 pointer-events-none">
                        Up Next: Group {nextProject.groupNumber} - {nextProject.projectName}
                    </div>
                )}

                <div className="w-full h-full flex flex-col items-center justify-center text-center text-slate-500">
                    {currentProject ? (
                        <>
                            <h2 className="text-3xl font-bold mb-4">{currentProject.projectName}</h2>
                            <div className="flex gap-4 text-slate-400">
                                <p>No embeddable content selected.</p>
                            </div>
                            <p className="text-sm mt-2 text-slate-500">Use the <span className="text-blue-400 font-bold">Project Materials</span> list in the sidebar to view other content.</p>
                        </>
                    ) : (
                        <>
                            <h2 className="text-3xl font-bold mb-4">Ready to Start</h2>
                            <p>Press Play to begin the session.</p>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-black relative flex flex-col justify-center items-center">
            {/* "Upcoming" Overlay */}
            {showUpcoming && nextProject && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-600/90 text-white px-6 py-2 rounded-full shadow-lg backdrop-blur animate-pulse z-20 pointer-events-none">
                    Up Next: Group {nextProject.groupNumber} - {nextProject.projectName}
                </div>
            )}

            <div className="w-full h-full relative bg-black flex items-center justify-center">
                {isPDF(activeResource.url) ? (
                    <div className="absolute inset-0 w-full h-full overflow-y-auto bg-slate-900">
                        <PDFPreview url={activeResource.url} className="min-h-0 h-full max-h-none rounded-none w-full shadow-none p-0 bg-transparent" />
                    </div>
                ) : (
                    <iframe
                        src={getEmbedUrl(activeResource.url)}
                        className="absolute inset-0 w-full h-full border-none"
                        allowFullScreen
                        key={activeResource.url} // Force remount on url change
                    />
                )}

                {/* Current Project Info Overlay (Bottom Left) */}
                <div className="absolute bottom-6 left-6 max-w-2xl bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 z-10 pointer-events-none select-none">
                    <h2 className="text-2xl font-bold text-white mb-1">{currentProject.projectName}</h2>
                    <div className="flex items-center gap-3 text-sm text-slate-300">
                        <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-xs font-bold uppercase">Group {currentProject.groupNumber}</span>
                        <span className="truncate max-w-sm">{currentProject.members?.map(m => m.name).join(', ')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default PresentationViewer;
