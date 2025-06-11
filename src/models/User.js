import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
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
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);