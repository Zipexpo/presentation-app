import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * One-time confirmation code that authorises a single group sync with an external app (Teamwo).
 *
 * Both sides consent: a teacher mints the code here for one specific class and one direction, then
 * hands it to the external app's manager, who types it in over there. Holding a valid API key alone
 * is never enough to read or write a class — the code scopes the operation down to one group.
 *
 *   kind 'export' — the external app may PULL this class (students + teacher) once.
 *   kind 'import' — the external app may PUSH a group in, updating `classId` or creating a new class.
 *
 * The raw code is never stored: only its sha256 hash, plus a display prefix for the UI.
 */
const syncLinkSchema = new mongoose.Schema({
    codeHash: { type: String, required: true, unique: true },
    prefix: { type: String, required: true },
    kind: { type: String, enum: ['export', 'import'], required: true },
    // Required for 'export'. For 'import', null means "create a new class".
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    partner: { type: String, default: 'teamwo' },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
    // Recorded when redeemed, so the pairing can be traced afterwards.
    externalRef: { type: String },
}, { timestamps: true });

syncLinkSchema.statics.hashCode = function (raw) {
    return crypto.createHash('sha256').update(String(raw).trim().toUpperCase()).digest('hex');
};

/** Human-typable code: no O/0/I/1 to avoid transcription mistakes. */
syncLinkSchema.statics.generateCode = function () {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const block = (n) => Array.from({ length: n }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
    return `SYNC-${block(4)}-${block(4)}`;
};

/**
 * Validate a raw code for the expected direction and consume it. Returns
 * { ok: false, error } or { ok: true, link }.
 */
syncLinkSchema.statics.consume = async function (rawCode, kind, externalRef) {
    if (!rawCode) return { ok: false, error: 'Missing sync code' };
    const link = await this.findOne({ codeHash: this.hashCode(rawCode) });
    if (!link) return { ok: false, error: 'Invalid sync code' };
    if (link.kind !== kind) return { ok: false, error: `This code is for "${link.kind}", not "${kind}"` };
    if (link.usedAt) return { ok: false, error: 'This sync code has already been used' };
    if (link.expiresAt.getTime() < Date.now()) return { ok: false, error: 'This sync code has expired' };
    link.usedAt = new Date();
    if (externalRef) link.externalRef = String(externalRef);
    await link.save();
    return { ok: true, link };
};

export default mongoose.models.SyncLink || mongoose.model('SyncLink', syncLinkSchema);
