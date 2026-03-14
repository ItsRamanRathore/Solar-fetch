import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['prosumer', 'consumer', 'admin'], default: 'consumer' },
    status: { type: String, enum: ['pending', 'approved', 'suspended'], default: 'pending' },
    credits: { type: Number, default: 1000 },
    trustScore: { type: Number, default: 100 },
    isCertified: { type: Boolean, default: false },
    x: { type: Number, default: () => Math.random() * 800 },
    y: { type: Number, default: () => Math.random() * 600 },
    // Phase 2: Intelligence & VBM
    batteryCapacity: { type: Number, default: 50.0 }, // Max Storage in kWh
    storedEnergy: { type: Number, default: 10.0 },   // Current Storage in kWh
    isBrokerActive: { type: Boolean, default: false },
    pufIdentity: { type: String, unique: true, sparse: true }, // Hardware Hardware verification
    creditRank: { type: String, enum: ['standard', 'premium', 'governor'], default: 'standard' },
    connectedProsumer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    connectionRequestProsumer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    connectionRequestStatus: { type: String, enum: ['none', 'pending'], default: 'none' },
    connectionRequestedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
