import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    maker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['buy', 'sell'], required: true },
    kwh: { type: Number, required: true },
    price: { type: Number, required: true },
    status: { type: String, enum: ['PENDING', 'MATCHED', 'CANCELLED'], default: 'PENDING' }
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
