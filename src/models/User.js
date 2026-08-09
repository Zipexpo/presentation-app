import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
  },
  studentId: {
    type: String,
    unique: true,
    sparse: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    // Optional to support social logins that don't have a local password
    required: false,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  accounts: [{
    provider: String, // 'credentials', 'google', 'azure-ad'
    providerAccountId: String,
    accessToken: String,
    refreshToken: String
  }],
  verificationToken: String,
  verificationTokenExpires: Date,
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    required: true,
  },
  // Institution fields — this app is the source of truth for identity, so external apps
  // (e.g. Teamwo) read these instead of keeping their own copy.
  school: {
    type: String, // e.g. 'HCMUS'
    trim: true,
  },
  faculty: {
    type: String, // khoa/bộ môn
    trim: true,
  },
  cohort: {
    type: String, // khóa, e.g. 'K2024'
    trim: true,
  },
  profileCompleted: {
    type: Boolean,
    default: false,
  },
  accountCreationEmailSent: {
    type: Boolean,
    default: false,
  },
  active: {
    type: Boolean,
    default: true,
  },
  mustChangePassword: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);