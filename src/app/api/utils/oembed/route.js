import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        let oembedUrl = '';
        const urlObj = new URL(url);

        if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
            oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        } else if (urlObj.hostname.includes('vimeo.com')) {
            oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
        } else {
            return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
        }

        const res = await fetch(oembedUrl);
        if (!res.ok) {
            return NextResponse.json({ error: 'Failed to fetch oEmbed data' }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json({
            title: data.title,
            thumbnail_url: data.thumbnail_url,
            provider_name: data.provider_name
        });

    } catch (err) {
        console.error('oEmbed error:', err);
        return NextResponse.json({ error: 'Invalid URL or server error' }, { status: 500 });
    }
}
