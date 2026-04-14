import mongoose from 'mongoose';

const conflictSchema = new mongoose.Schema({
    username: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true }, // [VOLUMETRIC_MISMATCH, DOUBLE_SPEND, TRUST_VIOLATION]
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
    message: { type: String, required: true },
    resolved: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Conflict', conflictSchema);
