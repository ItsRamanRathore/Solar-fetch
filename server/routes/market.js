import express from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Governance from '../models/Governance.js';
import { requireAuth } from '../middleware/auth.js';
import { formatTimeIST } from '../utils/indiaFormat.js';

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

// Get consumer bid history (includes matched/rejected statuses)
router.get('/my-bids', requireAuth, async (req, res, next) => {
    try {
        if (req.user.role !== 'consumer') {
            return res.status(403).json({ error: 'Only consumers can view bid history' });
        }

        const bids = await Order.find({
            maker: req.user._id,
            type: 'buy'
        }).sort({ createdAt: -1 }).limit(100);

        res.json(bids);
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
                time: formatTimeIST()
            });
        }

        res.status(201).json(order);
    } catch (err) {
        next(err);
    }
});

async function settleMatchedPair({ sellOrder, buyOrder, req, io }) {
    const sellerUser = sellOrder?.maker?.username
        ? sellOrder.maker
        : await User.findById(sellOrder.maker);
    const buyerUser = buyOrder?.maker?.username
        ? buyOrder.maker
        : await User.findById(buyOrder.maker);

    if (!sellerUser || !buyerUser) {
        throw new Error('Unable to resolve seller/buyer for settlement');
    }

    const settleVolume = Math.min(sellOrder.remainingKwh, buyOrder.remainingKwh);
    const settlePrice = sellOrder.price; // Settle at seller ask

    sellOrder.remainingKwh = parseFloat((sellOrder.remainingKwh - settleVolume).toFixed(2));
    buyOrder.remainingKwh = parseFloat((buyOrder.remainingKwh - settleVolume).toFixed(2));

    sellOrder.status = sellOrder.remainingKwh <= 0 ? 'MATCHED' : 'PARTIAL';
    buyOrder.status = buyOrder.remainingKwh <= 0 ? 'MATCHED' : 'PARTIAL';

    await sellOrder.save();
    await buyOrder.save();

    let greenHash = null;
    if (sellerUser.isCertified) {
        const esgData = `${sellerUser._id}-${buyerUser._id}-${settleVolume}-${Date.now()}`;
        greenHash = 'ESG-' + crypto.createHash('sha256').update(esgData).digest('hex').substring(0, 16).toUpperCase();
    }

    const hardwareVerified = !!sellerUser.pufIdentity || sellerUser.isCertified;
    if (!hardwareVerified && Math.random() > 0.9) {
        console.error(`[SECURITY ALERT] Unverified hardware detected for ${sellerUser.username}. Potential Ghost Energy attempt.`);
    }

    const txData = `${sellerUser.username}-${buyerUser.username}-${settleVolume}-${settlePrice}-${Date.now()}`;
    const txHash = '0x' + crypto.createHash('sha256').update(txData).digest('hex').substring(0, 16).toUpperCase();

    const tx = await Transaction.create({
        txid: 'TX-' + Math.floor(Math.random() * 100000),
        from: sellerUser._id.toString(),
        to: buyerUser._id.toString(),
        fromUsername: sellerUser.username,
        toUsername: buyerUser.username,
        amount: settleVolume,
        price: settlePrice,
        settlementTotal: parseFloat((settleVolume * settlePrice).toFixed(2)),
        hash: txHash,
        greenHash,
        provenance: sellerUser.isCertified ? 'Verified Solar/Wind' : (hardwareVerified ? 'Hardware Verified' : 'Standard Green'),
        status: 'SETTLED'
    });

    await User.findByIdAndUpdate(sellerUser._id, { $inc: { credits: (settleVolume * settlePrice) } });
    await User.findByIdAndUpdate(buyerUser._id, { $inc: { credits: -(settleVolume * settlePrice) } });

    const emitter = io || req?.app?.get('io');
    if (emitter) {
        emitter.emit('market:bidResponse', {
            type: 'accepted',
            bidId: buyOrder._id.toString(),
            consumerId: buyerUser._id.toString(),
            consumerUsername: buyerUser.username,
            prosumerId: sellerUser._id.toString(),
            prosumerUsername: sellerUser.username,
            settledVolume: settleVolume,
            price: settlePrice,
            status: buyOrder.status,
            time: formatTimeIST()
        });

        emitter.emit('market:orderComplete', {
            txid: tx.txid,
            price: settlePrice,
            volume: settleVolume,
            greenHash: tx.greenHash,
            sellerUsername: sellerUser.username,
            buyerUsername: buyerUser.username,
            time: formatTimeIST(),
            type: 'Match'
        });
    }

    return {
        tx,
        settleVolume,
        settlePrice,
        sellerUser,
        buyerUser
    };
}

async function processAutoAcceptHighest({ prosumer, io }) {
    const gov = await Governance.findOne();
    if (gov && (!gov.isAiEnabled || gov.isTradingPaused)) {
        return { ok: false, reason: 'LOCKED' };
    }

    const energyCycleStart = new Date(Date.now() - 30 * 60 * 1000);

    const pendingBids = await Order.find({
        type: 'buy',
        status: { $in: ['PENDING', 'PARTIAL'] },
        createdAt: { $gte: energyCycleStart }
    }).populate('maker', 'username trustScore').sort({ price: -1, createdAt: 1 });

    if (pendingBids.length === 0) {
        return { ok: false, reason: 'NO_PENDING_BIDS' };
    }

    const highestBid = pendingBids[0];

    const liveHighestBid = await Order.findOne({
        _id: highestBid._id,
        type: 'buy',
        status: { $in: ['PENDING', 'PARTIAL'] }
    }).populate('maker', 'username trustScore');

    if (!liveHighestBid) {
        return { ok: false, reason: 'STALE_BID' };
    }

    const matchedSell = await Order.create({
        maker: prosumer._id,
        type: 'sell',
        kwh: liveHighestBid.remainingKwh,
        remainingKwh: liveHighestBid.remainingKwh,
        price: liveHighestBid.price,
        status: 'PENDING',
        aiAutomated: true
    });

    const settlement = await settleMatchedPair({
        sellOrder: matchedSell,
        buyOrder: liveHighestBid,
        io
    });

    const rejectedBids = pendingBids.filter(
        bid => bid._id.toString() !== liveHighestBid._id.toString()
    );
    const rejectedBidIds = rejectedBids.map(bid => bid._id);

    if (rejectedBidIds.length > 0) {
        await Order.updateMany(
            { _id: { $in: rejectedBidIds }, status: { $in: ['PENDING', 'PARTIAL'] } },
            { status: 'CANCELLED' }
        );
    }

    if (io) {
        rejectedBids.forEach((bid) => {
            io.emit('market:bidResponse', {
                type: 'rejected',
                bidId: bid._id.toString(),
                consumerId: String(bid.maker?._id || ''),
                consumerUsername: bid.maker?.username,
                prosumerId: prosumer._id.toString(),
                prosumerUsername: prosumer.username,
                reason: 'OUTBID_IN_AI_CYCLE',
                time: formatTimeIST()
            });
        });

        io.emit('market:aiBrokerAction', {
            prosumerId: prosumer._id.toString(),
            prosumerUsername: prosumer.username,
            action: 'accepted_highest_bid',
            highestBid: {
                bidId: liveHighestBid._id.toString(),
                price: settlement.settlePrice,
                volume: settlement.settleVolume,
                bidderUsername: settlement.buyerUser.username
            },
            rejectedBidCount: rejectedBidIds.length,
            sellOrderId: matchedSell._id.toString(),
            time: formatTimeIST(),
            energyCycleDuration: '30min'
        });

        io.emit('market:newOrder', {
            type: 'Ask (AI-Auto)',
            price: matchedSell.price,
            volume: matchedSell.kwh,
            time: formatTimeIST()
        });
    }

    return {
        ok: true,
        highestBid: {
            _id: liveHighestBid._id,
            price: settlement.settlePrice,
            volume: settlement.settleVolume,
            bidderUsername: settlement.buyerUser.username
        },
        sellOrder: matchedSell,
        rejectedBidCount: rejectedBidIds.length,
        message: `AI Broker accepted highest bid at ₹${settlement.settlePrice.toFixed(2)}/kWh from ${settlement.buyerUser.username}`
    };
}

// AI Broker: Auto-accept highest bid in current energy cycle
// Energy cycle = bids created within last 30 minutes
router.post('/bids/auto-accept-highest', requireAuth, async (req, res, next) => {
    try {
        if (req.user.role !== 'prosumer') {
            return res.status(403).json({ error: 'Only prosumers can auto-accept bids' });
        }
        if (req.user.status !== 'approved') {
            return res.status(403).json({ error: 'Only approved prosumers can auto-accept bids' });
        }

        const result = await processAutoAcceptHighest({
            prosumer: req.user,
            io: req.app.get('io')
        });

        if (!result.ok) {
            if (result.reason === 'NO_PENDING_BIDS') {
                return res.status(404).json({ error: 'No pending bids in current energy cycle' });
            }
            if (result.reason === 'STALE_BID') {
                return res.status(409).json({ error: 'Highest bid was already resolved. Retry next cycle.' });
            }
            if (result.reason === 'LOCKED') {
                return res.status(403).json({ error: 'Auto-accept is locked by current governance state' });
            }
            return res.status(500).json({ error: 'Auto-accept could not be completed' });
        }

        return res.json({
            success: true,
            status: 'auto_accepted',
            highestBid: result.highestBid,
            sellOrder: result.sellOrder,
            rejectedBidCount: result.rejectedBidCount,
            message: result.message
        });
    } catch (err) {
        next(err);
    }
});

// Prosumer responds to a buy bid request
router.post('/bids/:bidId/respond', requireAuth, async (req, res, next) => {
    try {
        if (req.user.role !== 'prosumer') {
            return res.status(403).json({ error: 'Only prosumers can respond to bids' });
        }
        if (req.user.status !== 'approved') {
            return res.status(403).json({ error: 'Only approved prosumers can respond to bids' });
        }

        const actionSchema = z.object({
            action: z.enum(['accept', 'reject'])
        });
        const { action } = actionSchema.parse(req.body);

        const bid = await Order.findOne({
            _id: req.params.bidId,
            type: 'buy',
            status: { $in: ['PENDING', 'PARTIAL'] }
        }).populate('maker', 'username');

        if (!bid) {
            return res.status(404).json({ error: 'Bid request not found or already resolved' });
        }

        if (action === 'reject') {
            bid.status = 'CANCELLED';
            await bid.save();

            const io = req.app.get('io');
            if (io) {
                io.emit('market:bidResponse', {
                    type: 'rejected',
                    bidId: bid._id.toString(),
                    consumerId: String(bid.maker?._id || ''),
                    prosumerId: req.user._id.toString(),
                    prosumerUsername: req.user.username,
                    consumerUsername: bid.maker?.username,
                    reason: 'REJECTED_BY_PROSUMER',
                    time: formatTimeIST()
                });
                io.emit('market:orderComplete', {
                    txid: `REJ-${bid._id.toString().slice(-6)}`,
                    price: bid.price,
                    volume: bid.remainingKwh,
                    time: formatTimeIST(),
                    type: 'Rejected'
                });
            }

            return res.json({ success: true, status: 'rejected', bid });
        }

        const matchedSell = await Order.create({
            maker: req.user._id,
            type: 'sell',
            kwh: bid.remainingKwh,
            remainingKwh: bid.remainingKwh,
            price: bid.price,
            status: 'PENDING'
        });

        const settlement = await settleMatchedPair({
            sellOrder: matchedSell,
            buyOrder: bid,
            req
        });

        const io = req.app.get('io');
        if (io) {
            io.emit('market:newOrder', {
                type: 'Ask',
                price: matchedSell.price,
                volume: matchedSell.kwh,
                time: formatTimeIST()
            });
        }

        return res.json({
            success: true,
            status: 'accepted',
            sellOrder: matchedSell,
            settlement: {
                volume: settlement.settleVolume,
                price: settlement.settlePrice,
                consumerUsername: settlement.buyerUser.username
            }
        });
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

            await settleMatchedPair({
                sellOrder: bestSell,
                buyOrder: bestBuy,
                req
            });
        }
    }
}

export async function runAutoAcceptForEnabledProsumers(io) {
    const gov = await Governance.findOne();
    if (gov && (!gov.isAiEnabled || gov.isTradingPaused)) return;

    const enabledProsumers = await User.find({
        role: 'prosumer',
        status: 'approved',
        autoAcceptHighestEnabled: true
    }).select('_id username role status autoAcceptHighestEnabled');

    for (const prosumer of enabledProsumers) {
        try {
            await processAutoAcceptHighest({ prosumer, io });
        } catch (error) {
            console.error(`[AutoAccept Error] ${prosumer.username}:`, error.message);
        }
    }
}

// Demo data seeder for market
router.post('/seed', async (req, res, next) => {
    try {
        let dummyUser = await User.findOne({ username: 'Prosumer_01' });
        if (!dummyUser) {
            dummyUser = await User.create({ 
                username: 'Prosumer_01', 
                email: 'prosumer01@sol.net', 
                password: 'password', 
                role: 'prosumer', 
                credits: 500, 
                trustScore: 98, 
                isCertified: true,
                x: 200,
                y: 300
            });
        }
        await Order.create({ maker: dummyUser._id, type: 'sell', kwh: 5.4, remainingKwh: 5.4, price: 8.50 });
        await Order.create({ maker: dummyUser._id, type: 'buy', kwh: 12, remainingKwh: 12, price: 7.00 });
        res.json({ message: 'Market seeded' });
    } catch (err) {
        next(err);
    }
});

export default router;
