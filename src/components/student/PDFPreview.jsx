'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Loader2 } from 'lucide-react';
import { cn, getEmbedUrl } from '@/lib/utils';

// Configure worker to load from CDN to avoid build issues
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PDFPreview({ url, className }) {
    const [numPages, setNumPages] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [useFallback, setUseFallback] = useState(false);

    // Check for Google Drive Embed (or other embeddable PDF types)
    const embedUrl = getEmbedUrl(url, 'pdf');
    if (embedUrl && (url.includes('drive.google.com') || embedUrl !== url)) {
        return (
            <div className={cn("w-full h-full min-h-[500px] flex flex-col bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden relative", className)}>
                <iframe
                    src={embedUrl}
                    className="w-full h-full absolute inset-0 border-none"
                    allowFullScreen
                    referrerPolicy="no-referrer"
                />
            </div>
        );
    }

    // Use proxy for external URLs to avoid CORS issues
    const pdfUrl = url.startsWith('http') ? `/api/utils/proxy-pdf?url=${encodeURIComponent(url)}` : url;

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
        setLoading(false);
    }

    function onDocumentLoadError(err) {
        console.warn('PDF Load Error, switching to fallback:', err);
        setUseFallback(true);
        setLoading(false);
    }

    if (useFallback) {
        return (
            <div className={cn("w-full h-full min-h-[500px] flex flex-col bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden relative", className)}>
                <iframe
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`}
                    className="w-full h-full absolute inset-0 border-none"
                    allowFullScreen
                    onError={() => setError('Fallback failed')}
                />
                <div className="absolute bottom-2 right-2 z-10">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="bg-white/90 text-xs px-2 py-1 rounded shadow text-blue-600 hover:text-blue-800 flex items-center gap-1">
                        Open Original <Loader2 className="w-3 h-3 opacity-0" /> {/* Spacer */}
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("relative min-h-[300px] flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-auto", className)}>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            )}

            {error && (
                <div className="flex flex-col items-center justify-center h-full text-red-500 p-4 text-center">
                    <p className="font-semibold">Failed to load PDF</p>
                    <p className="text-sm mt-1 mb-4">{error}</p>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm hover:text-blue-800">
                        Open direct link instead
                    </a>
                </div>
            )}

            {!error && (
                <Document
                    file={pdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={null} // Handle loading state manually above
                    className="max-w-full"
                >
                    {numPages && (
                        <Page
                            pageNumber={1}
                            width={Math.min(window.innerWidth * 0.8, 800)} // Responsive width
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            className="shadow-md mb-4"
                        />
                    )}
                </Document>
            )}

            {!loading && !error && numPages && (
                <div className="text-sm text-gray-500 mt-2">
                    Page 1 of {numPages}
                </div>
            )}
        </div>
    );
}
