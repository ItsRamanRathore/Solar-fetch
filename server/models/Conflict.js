import mongoose from 'mongoose';

const conflictSchema = new mongoose.Schema({
    username: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { 
        type: String, 
        enum: ['VOLUMETRIC_MISMATCH', 'REPLAY_ATTACK_DETECTED', 'UNAUTHORIZED_INJECTION', 'IDENTITY_SPOOFING'],
        required: true 
    },
    severity: { 
        type: String, 
        enum: ['LOW', 'WARNING', 'CRITICAL'],
        default: 'WARNING'
    },
    message: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'],
        default: 'OPEN'
    },
}, { timestamps: true });

export default mongoose.model('Conflict', conflictSchema);
