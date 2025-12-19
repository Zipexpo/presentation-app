import mongoose from 'mongoose';

// Explicit sub-schema to ensure correct casting
const ResourceSchema = new mongoose.Schema({
  label: String,
  url: String,
  type: String
}, { _id: false });

const ProjectSubmissionSchema = new mongoose.Schema({
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
  submitterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional for backward compatibility, but should be required for new ones
  groupNumber: { type: Number },
  groupName: { type: String },
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
  sourceCodeLink: String,
  thumbnailUrl: String,
  presentationLink: String,

  screenshotUrls: [String],
  additionalMaterials: [
    {
      label: String,
      url: String
    }
  ],
  resources: {
    type: [ResourceSchema],
    default: []
  },
  submittedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ProjectSubmissionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Prevent Mongoose model compilation error in Next.js hot reload
if (mongoose.models.ProjectSubmission) {
  delete mongoose.models.ProjectSubmission;
}

export default mongoose.model('ProjectSubmission', ProjectSubmissionSchema);