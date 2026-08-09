import { NextResponse } from 'next/server';
import { connectToDB } from '@/lib/db';
import ApiKey from '@/models/ApiKey';

/**
 * Utility to validate the x-api-key header for external API routes.
 *
 * Pass `requiredScope` to enforce least privilege: a key issued only for group sync can't be used
 * to delete accounts. Keys created before scopes existed carry an empty `scopes` array and are
 * treated as full access, so the change is backwards compatible.
 *
 * @param {Request} req The incoming Next.js Request object
 * @param {string} [requiredScope] e.g. 'users:delete' — see models/ApiKey.js ALL_SCOPES
 * @returns {Promise<{ isValid: boolean, errorResponse?: NextResponse, apiKeyRecord?: object }>}
 */
export async function validateApiKey(req, requiredScope) {
    const apiKeyHeader = req.headers.get('x-api-key');

    if (!apiKeyHeader) {
        return { 
            isValid: false, 
            errorResponse: NextResponse.json({ error: 'Missing x-api-key header' }, { status: 401 }) 
        };
    }

    try {
        await connectToDB();

        const keyHash = ApiKey.hashKey(apiKeyHeader);
        
        const record = await ApiKey.findOne({ keyHash });

        if (!record) {
            return { 
                isValid: false, 
                errorResponse: NextResponse.json({ error: 'Invalid API Key' }, { status: 403 }) 
            };
        }

        // Legacy keys (created before scopes) have none stored — treat as full access.
        const scopes = record.scopes ?? [];
        if (requiredScope && scopes.length > 0 && !scopes.includes(requiredScope)) {
            return {
                isValid: false,
                errorResponse: NextResponse.json(
                    { error: `This API key is missing the "${requiredScope}" scope` },
                    { status: 403 }
                )
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
