import mongoose from 'mongoose';

const ProjectSubmissionSchema = new mongoose.Schema({
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
  groupNumber: { type: Number },
  projectName: { type: String, required: true },
  members: [
    {
      name: String,
      studentId: String,
      email: String
    }
  ],
  videoLink: String,
  storageLink: String,
  presentationLink: String,
  screenshotUrls: [String],
  additionalMaterials: [
    {
      label: String,
      url: String
    }
  ],
  submittedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ProjectSubmissionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.User || mongoose.model('ProjectSubmission', ProjectSubmissionSchema);