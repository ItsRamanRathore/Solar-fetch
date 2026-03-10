import express from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Governance from '../models/Governance.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const orderSchema = z.object({
    type: z.enum(['buy', 'sell']),
    kwh: z.number().positive(),
    price: z.number().positive()
});

// Get active orders (bids and asks)
router.get('/orders', async (req, res, next) => {
    try {
        const sells = await Order.find({ type: 'sell', status: { $in: ['PENDING', 'PARTIAL'] } }).populate('maker', 'username trustScore isCertified').sort({ price: 1 });
        const buys = await Order.find({ type: 'buy', status: { $in: ['PENDING', 'PARTIAL'] } }).populate('maker', 'username trustScore isCertified').sort({ price: -1 });
        res.json({ sells, buys });
    } catch (err) {
        next(err);
    }
});

// Post a new order
router.post('/orders', requireAuth, async (req, res, next) => {
    try {
        const { type, kwh, price } = orderSchema.parse(req.body);

        if (req.user.status === 'pending') {
            return res.status(403).json({ error: 'Your account is pending admin approval. You cannot place orders.' });
        }
        if (req.user.status === 'suspended') {
            return res.status(403).json({ error: 'Your account is suspended. You cannot place orders.' });
        }

        const gov = await Governance.findOne();
        if (gov) {
            if (gov.isTradingPaused) {
                return res.status(403).json({ error: 'Grid Governance: Trading is currently suspended by Administrator.' });
            }
            if (price < gov.floorPrice || price > gov.priceCap) {
                return res.status(400).json({ error: `Price must be between ₹${gov.floorPrice.toFixed(2)} and ₹${gov.priceCap.toFixed(2)}` });
            }
        }

        const order = new Order({
            maker: req.user._id,
            type,
            kwh,
            remainingKwh: kwh,
            price
        });
        await order.save();

        // Trigger basic matching engine asynchronously
        runMatchingEngine(req).catch(console.error);

        // Broadcast new individual order placement
        const io = req.app.get('io');
        if (io) {
            io.emit('market:newOrder', {
                type: type === 'buy' ? 'Bid' : 'Ask',
                price,
                volume: kwh,
                time: new Date().toLocaleTimeString('en-GB', { hour12: false })
            });
        }

        res.status(201).json(order);
    } catch (err) {
        next(err);
    }
});

// Advanced Matching Engine (Partial Fills)
export async function runMatchingEngine(req) {
    const gov = await Governance.findOne();
    if (gov && gov.isTradingPaused) return; // Kill switch active

    let matchFound = true;

    while (matchFound) {
        matchFound = false;

        // Find best sell (lowest price)
        const bestSell = await Order.findOne({ type: 'sell', status: { $in: ['PENDING', 'PARTIAL'] } }).sort({ price: 1 }).populate('maker');
        // Find best buy (highest price)
        const bestBuy = await Order.findOne({ type: 'buy', status: { $in: ['PENDING', 'PARTIAL'] } }).sort({ price: -1 }).populate('maker');

        if (bestSell && bestBuy && bestBuy.price >= bestSell.price) {
            matchFound = true; // We found a match, there might be more

            const settleVolume = Math.min(bestSell.remainingKwh, bestBuy.remainingKwh);
            const settlePrice = bestSell.price; // Settle at seller's ask

            // Update remaining volumes
            bestSell.remainingKwh = parseFloat((bestSell.remainingKwh - settleVolume).toFixed(2));
            bestBuy.remainingKwh = parseFloat((bestBuy.remainingKwh - settleVolume).toFixed(2));

            // Update statuses
            bestSell.status = bestSell.remainingKwh <= 0 ? 'MATCHED' : 'PARTIAL';
            bestBuy.status = bestBuy.remainingKwh <= 0 ? 'MATCHED' : 'PARTIAL';

            await bestSell.save();
            await bestBuy.save();

            // Create a settlement transaction in the ledger
            const tx = await Transaction.create({
                txid: 'TX-' + Math.floor(Math.random() * 100000),
                from: bestSell.maker.username,
                to: bestBuy.maker.username,
                amount: settleVolume,
                price: settlePrice,
                settlementTotal: parseFloat((settleVolume * settlePrice).toFixed(2)),
                hash: '0x' + crypto.randomBytes(8).toString('hex'),
                provenance: bestSell.maker.isCertified ? 'Verified Solar/Wind' : 'Standard Green',
                status: 'SETTLED'
            });

            // Credit transfer
            await User.findByIdAndUpdate(bestSell.maker._id, { $inc: { credits: (settleVolume * settlePrice) } });
            await User.findByIdAndUpdate(bestBuy.maker._id, { $inc: { credits: -(settleVolume * settlePrice) } });

            // Ensure broadcast works if order comes from HTTP Request
            const io = req?.app?.get('io');
            if (io) {
                io.emit('market:orderComplete', {
                    txid: tx.txid,
                    price: settlePrice,
                    volume: settleVolume,
                    time: new Date().toLocaleTimeString('en-GB', { hour12: false }),
                    type: 'Match'
                });
            }
        }
    }
}

// Demo data seeder for market
router.post('/seed', async (req, res, next) => {
    try {
        let dummyUser = await User.findOne({ username: 'Prosumer_01' });
        if (!dummyUser) {
            dummyUser = await User.create({ username: 'Prosumer_01', email: 'prosumer01@sol.net', password: 'password', role: 'resident', credits: 500, trustScore: 98, isCertified: true });
        }
        await Order.create({ maker: dummyUser._id, type: 'sell', kwh: 5.4, remainingKwh: 5.4, price: 8.50 });
        await Order.create({ maker: dummyUser._id, type: 'buy', kwh: 12, remainingKwh: 12, price: 7.00 });
        res.json({ message: 'Market seeded' });
    } catch (err) {
        next(err);
    }
});

export default router;
