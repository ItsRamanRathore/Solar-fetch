import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['Generation', 'Storage', 'Consumer'], required: true },
    status: { type: String, enum: ['Optimal', 'Degraded', 'Critical', 'Idle'], default: 'Optimal' },
    output: { type: Number, default: 0 }, // Current kWh
    efficiency: { type: Number, default: 100 },
    hardwareId: { type: String, unique: true },
    isPufCertified: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Asset', assetSchema);
