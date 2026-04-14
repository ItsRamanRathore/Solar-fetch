import mongoose from 'mongoose';

const gridStateSchema = new mongoose.Schema({
    simMode: { type: String, enum: ['standard', 'grid-fail', 'sunset'], default: 'standard' },
    networkStatus: { type: String, enum: ['stable', 'unstable'], default: 'stable' },
    availableVolume: { type: Number, default: 100.0 },
    syncStatus: { type: Number, default: 99.98 }
}, { timestamps: true });

export default mongoose.model('GridState', gridStateSchema);
