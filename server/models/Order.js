import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    maker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['buy', 'sell'], required: true },
    kwh: { type: Number, required: true },
    remainingKwh: { type: Number, required: true },
    price: { type: Number, required: true },
    orderType: { type: String, enum: ['limit', 'market'], default: 'limit' },
    isBrokerOrder: { type: Boolean, default: false },
    status: { type: String, enum: ['PENDING', 'PARTIAL', 'MATCHED', 'CANCELLED'], default: 'PENDING' }
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
