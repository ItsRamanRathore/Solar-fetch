import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    role: { type: String, enum: ['resident', 'admin'], default: 'resident' },
    credits: { type: Number, default: 0 },
    trustScore: { type: Number, default: 100 },
    isCertified: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
