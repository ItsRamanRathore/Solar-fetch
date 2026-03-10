import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['prosumer', 'consumer', 'admin'], default: 'consumer' },
    status: { type: String, enum: ['pending', 'approved', 'suspended'], default: 'pending' },
    credits: { type: Number, default: 1000 },
    trustScore: { type: Number, default: 100 },
    isCertified: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
