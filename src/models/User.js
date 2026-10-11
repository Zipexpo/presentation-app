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
    email: String, // the provider account's address (sign-in callbacks set it; strict mode dropped it)
    accessToken: String,
    refreshToken: String
  }],
  // sha256 of the emailed token (lib/registration.js), never the token itself.
  verificationToken: String,
  verificationTokenExpires: Date,
  // Where to send the person after they confirm, when they registered from a partner app such as
  // Teamwo. Only an API-key caller can set it, so the verify page never follows a URL a visitor typed.
  verificationReturnTo: String,
  // The last used verification link (sha256) and until when it still answers "done": mail
  // scanners open links before the person does.
  verificationUsedHash: String,
  verificationUsedUntil: Date,
  // Password reset (lib/registration.js): sha256 of the emailed token and its expiry.
  resetToken: String,
  resetTokenExpires: Date,
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