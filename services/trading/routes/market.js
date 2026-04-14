import express from 'express';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Governance from '../models/Governance.js';
import { z } from 'zod';

const router = express.Router();

const orderSchema = z.object({
    type: z.enum(['buy', 'sell']),
    kwh: z.number().positive(),
    price: z.number().positive()
});

router.get('/orders', async (req, res) => {
    try {
        const sells = await Order.find({ type: 'sell', status: { $in: ['PENDING', 'PARTIAL'] } }).populate('maker', 'username trustScore').sort({ price: 1 });
        const buys = await Order.find({ type: 'buy', status: { $in: ['PENDING', 'PARTIAL'] } }).populate('maker', 'username trustScore').sort({ price: -1 });
        res.json({ sells, buys });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/orders', async (req, res) => {
    try {
        const { type, kwh, price } = orderSchema.parse(req.body);
        const order = new Order({
            maker: req.headers['x-user-id'], // Simple auth transfer for Phase 1
            type,
            kwh,
            remainingKwh: kwh,
            price
        });
        await order.save();
        res.status(201).json(order);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
