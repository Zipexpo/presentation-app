import mongoose from 'mongoose';

const liveFeedbackSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PresentationSession', required: true },
  submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectSubmission', required: true },
  studentId: String,
  studentName: String,
  answers: [
    {
      questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeedbackQuestion' },
      optionIndex: Number,
      score: Number
    }
  ],
  comments: [String],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LiveFeedback', liveFeedbackSchema);