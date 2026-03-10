import mongoose from 'mongoose';

const gridStateSchema = new mongoose.Schema({
    simMode: { type: String, enum: ['standard', 'grid-fail', 'sunset'], default: 'standard' },
    availableVolume: { type: Number, default: 100 },
    syncStatus: { type: Number, default: 99.98 }
}, { timestamps: true });

export default mongoose.model('GridState', gridStateSchema);
