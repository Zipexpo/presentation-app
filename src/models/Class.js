import mongoose from 'mongoose';

const classSchema = new mongoose.Schema({
    name: { type: String, required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

classSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Prevent Mongoose model compilation error in Next.js hot reload
if (mongoose.models.Class) {
    delete mongoose.models.Class;
}

export default mongoose.model('Class', classSchema);
