import mongoose from 'mongoose';

const peerReviewSchema = new mongoose.Schema({
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectSubmission', required: true },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Can be null if anonymous, but we usually track
    guestId: String, // For rate limiting guests
    reviewerName: String, // Snapshot of name
    scores: [{
        label: String,
        score: Number,
        textValue: String
    }],
    userType: { type: String, enum: ['student', 'teacher', 'guest'], default: 'student' },
    feedbackType: { type: String, enum: ['comment', 'question'], default: 'comment' },
    comment: String,
    createdAt: { type: Date, default: Date.now }
});

// Prevent Mongoose model compilation error in Next.js hot reload
if (mongoose.models.PeerReview) {
    delete mongoose.models.PeerReview;
}

export default mongoose.model('PeerReview', peerReviewSchema);
