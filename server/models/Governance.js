import mongoose from 'mongoose';

const governanceSchema = new mongoose.Schema({
    isTradingPaused: { type: Boolean, default: false },
    priceCap: { type: Number, default: 25.00 },
    floorPrice: { type: Number, default: 1.00 }
}, { timestamps: true });

export default mongoose.model('Governance', governanceSchema);
