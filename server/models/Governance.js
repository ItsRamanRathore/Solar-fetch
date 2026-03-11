import mongoose from 'mongoose';

const governanceSchema = new mongoose.Schema({
    isTradingPaused: { type: Boolean, default: false },
    priceCap: { type: Number, default: 25.00 },
    floorPrice: { type: Number, default: 1.00 },
    globalDirective: {
        message: { type: String, default: "" },
        active: { type: Boolean, default: false },
        updatedAt: { type: Date, default: Date.now }
    }
}, { timestamps: true });

export default mongoose.model('Governance', governanceSchema);
