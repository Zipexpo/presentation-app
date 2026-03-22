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
    lastUsedAt: {
        type: Date
    }
}, { timestamps: true });

// Helper to reliably hash the raw key before comparing or saving
apiKeySchema.statics.hashKey = function(rawKey) {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
};

const ApiKey = mongoose.models.ApiKey || mongoose.model('ApiKey', apiKeySchema);

export default ApiKey;
