import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    txid: { type: String, required: true, unique: true },
    from: { type: String, required: true }, // Can be a User ObjectId ref or 'PEER-X'
    to: { type: String, required: true },   // Can be a User ObjectId ref or 'PEER-Y'
    amount: { type: Number, required: true },
    price: { type: Number, required: true },
    settlementTotal: { type: Number, required: true },
    hash: { type: String, required: true },
    provenance: { type: String, required: true },
    greenHash: { type: String }, // ESG Minting
    timestamp: { type: Date, default: Date.now },
    status: { type: String, enum: ['VERIFIED', 'SETTLED', 'PENDING'], default: 'PENDING' }
}, { timestamps: true });

export default mongoose.model('Transaction', transactionSchema);
