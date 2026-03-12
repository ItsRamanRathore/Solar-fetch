import mongoose from 'mongoose';

const usageSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, required: true },
    consumption: { type: Number, required: true, default: 0 },
    generation: { type: Number, required: true, default: 0 },
    storage: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Usage', usageSchema);
