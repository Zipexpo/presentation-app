'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Loader2 } from 'lucide-react';

// Configure worker to load from CDN to avoid build issues
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PDFPreview({ url }) {
    const [numPages, setNumPages] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Use proxy for external URLs to avoid CORS issues
    const pdfUrl = url.startsWith('http') ? `/api/utils/proxy-pdf?url=${encodeURIComponent(url)}` : url;

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
        setLoading(false);
    }

    function onDocumentLoadError(err) {
        console.error('PDF Load Error:', err);
        // If proxy fails, maybe try direct link (though likely will fail same way if CORS)?
        // Or just show error.
        setError(err.message);
        setLoading(false);
    }

    return (
        <div className="relative min-h-[300px] max-h-[80vh] overflow-auto flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
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
