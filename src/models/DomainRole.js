import mongoose from 'mongoose';

const DomainRoleSchema = new mongoose.Schema({
  domain: {
    type: String,
    required: true,
    unique: true,
  },
  role: {
    type: String,
    enum: ['student', 'teacher'],
    required: true,
  },
  requiresVerification: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.DomainRole || mongoose.model('DomainRole', DomainRoleSchema);