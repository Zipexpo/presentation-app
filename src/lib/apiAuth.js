import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ApiKey from '@/models/ApiKey';

/**
 * Utility to validate the x-api-key header for external API routes.
 * 
 * @param {Request} req The incoming Next.js Request object
 * @returns {Promise<{ isValid: boolean, errorResponse?: NextResponse, apiKeyRecord?: object }>}
 */
export async function validateApiKey(req) {
    const apiKeyHeader = req.headers.get('x-api-key');

    if (!apiKeyHeader) {
        return { 
            isValid: false, 
            errorResponse: NextResponse.json({ error: 'Missing x-api-key header' }, { status: 401 }) 
        };
    }

    try {
        await connectDB();

        const keyHash = ApiKey.hashKey(apiKeyHeader);
        
        const record = await ApiKey.findOne({ keyHash });

        if (!record) {
            return { 
                isValid: false, 
                errorResponse: NextResponse.json({ error: 'Invalid API Key' }, { status: 403 }) 
            };
        }

        // Update last used timestamp lazily (fire and forget)
        ApiKey.updateOne({ _id: record._id }, { lastUsedAt: new Date() }).exec().catch(err => console.error(err));

        return { isValid: true, apiKeyRecord: record };

    } catch (error) {
        console.error('Error validating API Key:', error);
        return { 
            isValid: false, 
            errorResponse: NextResponse.json({ error: 'Internal server error during authentication' }, { status: 500 }) 
        };
    }
}
