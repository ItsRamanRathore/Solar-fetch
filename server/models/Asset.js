import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['Generation', 'Storage', 'Consumer'], required: true },
    status: { type: String, enum: ['Optimal', 'Charging', 'Idle', 'Maintenance'], required: true },
    output: { type: Number, required: true },
    efficiency: { type: Number, min: 0, max: 100, required: true },
    hardwareId: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Asset', assetSchema);
