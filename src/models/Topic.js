import mongoose from 'mongoose';

const surveyQuestionSchema = {
  type: { type: String, enum: ['choice', 'scale', 'rating', 'text', 'rubric', 'section', 'matrix'], default: 'choice' },
  question: { type: String },
  title: { type: String }, // For Section
  weight: { type: Number, default: 1 }, // For Matrix Rows
  options: [{
    label: { type: String },
    score: { type: Number, default: 0 },
    columnLabel: String,
    baseScore: Number
  }],
  scaleConfig: {
    min: { type: Number, default: 1 },
    max: { type: Number, default: 5 },
    minLabel: String,
    maxLabel: String
  },
  textConfig: {
    maxScore: { type: Number, default: 0 }
  },
  // Matrix Fields
  rows: [{
    id: String,
    text: String,
    weight: { type: Number, default: 1 },
    cells: [{
      label: String,
      score: Number,
      baseScore: Number,
      columnLabel: String
    }]
  }],
  columns: [{
    label: String,
    baseScore: Number,
    score: Number
  }]
};

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
    includeVideo: { type: Boolean, default: true },
    includePresentation: { type: Boolean, default: true },
    labels: {
      sourceCode: { type: String, default: 'Source Code' },
      thumbnail: { type: String, default: 'Thumbnail' },
      materials: { type: String, default: 'Additional Materials' },
      groupName: { type: String, default: 'Group Name' },
      video: { type: String, default: 'Demo Video' },
      presentation: { type: String, default: 'Presentation Slides' }
    }
  },
  resourceRequirements: [{
    label: { type: String, required: true },
    type: { type: String, enum: ['url', 'pdf', 'image', 'video', 'presentation'], default: 'url' },
    optional: { type: Boolean, default: false }
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
    surveyWeight: { type: Number, default: 1 }, // Weight for normal survey
    surveyQuestions: [surveyQuestionSchema],
    allowComments: { type: Boolean, default: true },
    allowGuest: { type: Boolean, default: false },
    maxCommentsPerProject: { type: Number, default: 0 }, // 0 = unlimited
    feedbackVisibility: {
      teacher: { type: Boolean, default: true },
      student: { type: Boolean, default: true },
      guest: { type: Boolean, default: true }
    },
    // Special Evaluation (e.g. for Judges/Teachers)
    specialEvaluationConfig: {
      enabled: { type: Boolean, default: false },
      weight: { type: Number, default: 1 }, // Weight for special evaluation
      evaluatorEmails: [{ type: String }], // List of emails allowed to see this view
      surveyQuestions: [surveyQuestionSchema]
    }
  },
  activeSession: {
    status: { type: String, enum: ['idle', 'active', 'paused', 'completed'], default: 'idle' },
    currentPhase: { type: String, enum: ['presentation', 'qa', 'break'], default: 'presentation' },
    currentProjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectSubmission' },
    startTime: Date, // When the slot/phase started
    pauseTime: Date, // If paused, when it stopped
  },
  invitedTeachers: [{ type: String }], // List of emails
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