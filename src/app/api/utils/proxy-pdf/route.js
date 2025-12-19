import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return new NextResponse('Missing URL parameter', { status: 400 });
    }

    try {
        const response = await fetch(url);

        if (!response.ok) {
            return new NextResponse(`Failed to fetch PDF: ${response.statusText}`, { status: response.status });
        }

        const contentType = response.headers.get('content-type');
        const blob = await response.blob();

        return new NextResponse(blob, {
            headers: {
                'Content-Type': contentType || 'application/pdf',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (error) {
        console.error('PDF Proxy Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
