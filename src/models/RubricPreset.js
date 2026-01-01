import mongoose from 'mongoose';

const rubricPresetSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['rubric', 'survey'], required: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true }, // Array of criteria or questions
    createdAt: { type: Date, default: Date.now }
});

// Prevent Mongoose model compilation error in Next.js hot reload
if (mongoose.models.RubricPreset) {
    delete mongoose.models.RubricPreset;
}

export default mongoose.model('RubricPreset', rubricPresetSchema);
