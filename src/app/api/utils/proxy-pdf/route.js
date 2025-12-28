import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return new NextResponse('Missing URL parameter', { status: 400 });
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            console.error(`PDF Proxy Upstream Error: ${response.status} ${response.statusText} for ${url}`);
            return new NextResponse(`Failed to fetch PDF: ${response.statusText}`, { status: response.status });
        }

        const contentType = response.headers.get('content-type');
        const buffer = await response.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType || 'application/pdf',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (error) {
        console.error('PDF Proxy Internal Error:', error);
        return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}
