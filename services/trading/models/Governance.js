import mongoose from 'mongoose';

const governanceSchema = new mongoose.Schema({
    isTradingPaused: { type: Boolean, default: false },
    priceCap: { type: Number, default: 25.00 },
    floorPrice: { type: Number, default: 1.00 },
    isAiEnabled: { type: Boolean, default: true },
    globalDirective: { type: String, default: 'Maintain grid stability via P2P balance.' }
}, { timestamps: true });

export default mongoose.model('Governance', governanceSchema);
