import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  submissionDeadline: { type: Date, required: true },
  presentationDate: { type: Date, required: true },
  submissionConfig: {
    includeSourceCode: { type: Boolean, default: false },
    includeThumbnail: { type: Boolean, default: false },
    includeMaterials: { type: Boolean, default: false },
    includeGroupName: { type: Boolean, default: false },
  },
  resourceRequirements: [{
    label: { type: String, required: true },
    type: { type: String, enum: ['url', 'pdf', 'image', 'video'], default: 'url' }
  }],
  presentationConfig: {
    durationPerProject: { type: Number, default: 10 }, // Minutes
    questionDuration: { type: Number, default: 5 }, // Minutes
    breakDuration: { type: Number, default: 2 }, // Minutes
    defaultResource: { type: String, default: 'presentation' }, // 'presentation', 'video', etc.
    gradingType: { type: String, enum: ['rubric', 'survey'], default: 'rubric' },
    gradingRubric: [{
      label: { type: String }, // e.g., "Creativity"
      maxScore: { type: Number, default: 10 }
    }],
    surveyQuestions: [{
      type: { type: String, enum: ['choice', 'scale', 'rating', 'text'], default: 'choice' },
      question: { type: String },
      options: [{
        label: { type: String },
        score: { type: Number, default: 0 }
      }],
      scaleConfig: {
        min: { type: Number, default: 1 },
        max: { type: Number, default: 5 },
        minLabel: String,
        maxLabel: String
      },
      textConfig: {
        maxScore: { type: Number, default: 0 }
      }
    }],
    allowComments: { type: Boolean, default: true },
    allowGuest: { type: Boolean, default: false },
    maxCommentsPerProject: { type: Number, default: 0 }, // 0 = unlimited
    feedbackVisibility: {
      teacher: { type: Boolean, default: true },
      student: { type: Boolean, default: true },
      guest: { type: Boolean, default: true }
    }
  },
  activeSession: {
    status: { type: String, enum: ['idle', 'active', 'paused', 'completed'], default: 'idle' },
    currentPhase: { type: String, enum: ['presentation', 'qa', 'break'], default: 'presentation' },
    currentProjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectSubmission' },
    startTime: Date, // When the slot/phase started
    pauseTime: Date, // If paused, when it stopped
  },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

topicSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Prevent Mongoose model compilation error in Next.js hot reload
if (mongoose.models.Topic) {
  delete mongoose.models.Topic;
}

export default mongoose.model('Topic', topicSchema);