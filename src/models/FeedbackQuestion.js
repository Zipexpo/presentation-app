import mongoose from 'mongoose';

const feedbackQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [
    {
      text: String,
      score: Number
    }
  ],
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isReusable: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FeedbackQuestion', feedbackQuestionSchema);