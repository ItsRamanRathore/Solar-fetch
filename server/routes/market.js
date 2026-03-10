import express from 'express';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

const router = express.Router();

// Get active orders (bids and asks)
router.get('/orders', async (req, res) => {
    try {
        const sells = await Order.find({ type: 'sell', status: 'PENDING' }).populate('maker', 'username trustScore isCertified').sort({ price: 1 });
        const buys = await Order.find({ type: 'buy', status: 'PENDING' }).populate('maker', 'username trustScore isCertified').sort({ price: -1 });
        res.json({ sells, buys });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Post a new order
router.post('/orders', async (req, res) => {
    try {
        const { type, kwh, price } = req.body;

        let user = await User.findOne({ username: 'Major Tom (You)' });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const order = new Order({
            maker: user._id,
            type,
            kwh,
            price
        });
        await order.save();

        // Trigger basic matching engine asynchronously
        runMatchingEngine().catch(console.error);

        res.status(201).json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Simple Matching Engine
async function runMatchingEngine() {
    // Find best sell (lowest price)
    const bestSell = await Order.findOne({ type: 'sell', status: 'PENDING' }).sort({ price: 1 }).populate('maker');
    // Find best buy (highest price)
    const bestBuy = await Order.findOne({ type: 'buy', status: 'PENDING' }).sort({ price: -1 }).populate('maker');

    if (bestSell && bestBuy && bestBuy.price >= bestSell.price) {
        // We have a match!
        bestSell.status = 'MATCHED';
        bestBuy.status = 'MATCHED';
        await bestSell.save();
        await bestBuy.save();

        // Create a settlement transaction in the ledger
        const settleVolume = Math.min(bestSell.kwh, bestBuy.kwh);
        const settlePrice = bestSell.price; // Settle at seller's ask

        await Transaction.create({
            txid: 'TX-' + Math.floor(Math.random() * 100000),
            from: bestSell.maker.username,
            to: bestBuy.maker.username,
            amount: settleVolume,
            price: settlePrice,
            settlementTotal: settleVolume * settlePrice,
            hash: '0x' + require('crypto').randomBytes(8).toString('hex'),
            provenance: bestSell.maker.isCertified ? 'Verified Solar/Wind' : 'Standard Green',
            status: 'SETTLED'
        });

        // Credit transfer (simplified)
        await User.findByIdAndUpdate(bestSell.maker._id, { $inc: { credits: (settleVolume * settlePrice) } });
        await User.findByIdAndUpdate(bestBuy.maker._id, { $inc: { credits: -(settleVolume * settlePrice) } });
    }
}

// Demo data seeder for market
router.post('/seed', async (req, res) => {
    try {
        let dummyUser = await User.findOne({ username: 'Prosumer_01' });
        if (!dummyUser) {
            dummyUser = await User.create({ username: 'Prosumer_01', role: 'resident', trustScore: 98, isCertified: true });
        }
        await Order.create({ maker: dummyUser._id, type: 'sell', kwh: 5.4, price: 0.12 });
        await Order.create({ maker: dummyUser._id, type: 'buy', kwh: 12, price: 0.11 });
        res.json({ message: 'Market seeded' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
