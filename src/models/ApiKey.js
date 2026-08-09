import mongoose from 'mongoose';
import crypto from 'crypto';

const apiKeySchema = new mongoose.Schema({
    keyHash: {
        type: String,
        required: true,
        unique: true
    },
    // We store the prefix (e.g., ext_...) or last 4 chars in plaintext for display in the UI, 
    // but the actual secret key is heavily hashed.
    prefix: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // What this key is allowed to do. Least privilege: an integration that only needs to sync
    // groups should never be able to delete accounts. Keys created before scopes existed have an
    // empty array, which is treated as full access for backwards compatibility (see ALL_SCOPES).
    scopes: {
        type: [String],
        enum: ['users:read', 'users:write', 'users:delete', 'auth:login', 'sync:class'],
        default: ['users:read', 'auth:login', 'sync:class']
    },
    lastUsedAt: {
        type: Date
    }
}, { timestamps: true });

/** Every scope, in the order shown in the admin UI, with what it unlocks. */
apiKeySchema.statics.ALL_SCOPES = [
    { id: 'users:read', label: 'Read accounts', hint: 'GET /api/external/users' },
    { id: 'users:write', label: 'Create / update accounts', hint: 'POST + PUT /api/external/users' },
    { id: 'users:delete', label: 'Delete accounts', hint: 'DELETE /api/external/users/[id] — permanent' },
    { id: 'auth:login', label: 'Verify passwords (SSO)', hint: 'POST /api/external/auth/login' },
    { id: 'sync:class', label: 'Sync groups', hint: '/api/external/sync/class — still needs a per-class code' },
];

// Helper to reliably hash the raw key before comparing or saving
apiKeySchema.statics.hashKey = function(rawKey) {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
};

const ApiKey = mongoose.models.ApiKey || mongoose.model('ApiKey', apiKeySchema);

export default ApiKey;
