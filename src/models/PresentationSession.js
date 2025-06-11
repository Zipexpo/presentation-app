import mongoose from 'mongoose';

const presentationSessionSchema = new mongoose.Schema({
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accessKey: { type: String, required: true },
  queue: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProjectSubmission' }],
  currentIndex: { type: Number, default: 0 },
  isActive: { type: Boolean, default: false },
  isAutomatic: { type: Boolean, default: false },
  timerSettings: {
    presentationTime: Number,
    qaTime: Number,
    feedbackTime: Number
  },
  feedbackQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FeedbackQuestion' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PresentationSession', presentationSessionSchema);