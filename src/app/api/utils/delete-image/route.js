import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function POST(req) {
    try {
        const { public_id } = await req.json();

        if (!public_id) {
            return NextResponse.json({ error: 'Missing public_id' }, { status: 400 });
        }

        // Check if secrets are present
        if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            console.error('Missing Cloudinary API Secrets');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const result = await cloudinary.uploader.destroy(public_id);

        return NextResponse.json({ success: true, result });
    } catch (error) {
        console.error('Delete image error:', error);
        return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
    }
}
