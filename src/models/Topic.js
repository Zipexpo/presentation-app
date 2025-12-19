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