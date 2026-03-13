import express from 'express';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Usage from '../models/Usage.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get the authenticated user
router.get('/me', requireAuth, async (req, res) => {
    try {
        res.json(req.user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get aggregate stats based on user role
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const stats = {};
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        if (req.user.role === 'admin') {
            stats.totalUsers = await User.countDocuments();
            stats.prosumers = await User.countDocuments({ role: 'prosumer' });
            stats.consumers = await User.countDocuments({ role: 'consumer' });
            stats.pendingUsers = await User.countDocuments({ status: 'pending' });
        } else if (req.user.role === 'prosumer') {
            stats.connectedConsumers = await User.countDocuments({ connectedProsumer: req.user._id });
            
            // Total Revenue & Volume (All time)
            const allTime = await Transaction.aggregate([
                { $match: { from: req.user._id.toString(), status: 'SETTLED' } },
                { $group: { _id: null, totalVolume: { $sum: "$amount" }, totalRevenue: { $sum: "$settlementTotal" } } }
            ]);
            stats.totalVolumeSold = allTime[0]?.totalVolume || 0;
            stats.totalRevenue = allTime[0]?.totalRevenue || 0;

            // Daily Generation (Last 24h)
            const daily = await Usage.aggregate([
                { $match: { user: req.user._id, timestamp: { $gt: last24h } } },
                { $group: { _id: null, dailyGen: { $sum: "$generation" } } }
            ]);
            stats.dailyGeneration = daily[0]?.dailyGen || 0;

            // Daily Revenue (Last 24h)
            const dailyRev = await Transaction.aggregate([
                { $match: { from: req.user._id.toString(), status: 'SETTLED', timestamp: { $gt: last24h } } },
                { $group: { _id: null, total: { $sum: "$settlementTotal" } } }
            ]);
            stats.dailyRevenue = dailyRev[0]?.total || 0;
            
        } else if (req.user.role === 'consumer') {
            if (req.user.connectedProsumer) {
                const prosumer = await User.findById(req.user.connectedProsumer).select('username trustScore isCertified');
                stats.connectedProsumer = prosumer;
            }
            
            // Total volume & spend
            const allTime = await Transaction.aggregate([
                { $match: { to: req.user._id.toString(), status: 'SETTLED' } },
                { $group: { _id: null, totalVolume: { $sum: "$amount" }, totalCost: { $sum: "$settlementTotal" } } }
            ]);
            stats.totalVolumePurchased = allTime[0]?.totalVolume || 0;
            stats.totalCost = allTime[0]?.totalCost || 0;

            // Daily Usage (Last 24h)
            const daily = await Usage.aggregate([
                { $match: { user: req.user._id, timestamp: { $gt: last24h } } },
                { $group: { _id: null, dailyCons: { $sum: "$consumption" } } }
            ]);
            stats.dailyKwh = daily[0]?.dailyCons || 0;

            // Daily Cost (Last 24h)
            const dailyCost = await Transaction.aggregate([
                { $match: { to: req.user._id.toString(), status: 'SETTLED', timestamp: { $gt: last24h } } },
                { $group: { _id: null, total: { $sum: "$settlementTotal" } } }
            ]);
            stats.dailyCost = dailyCost[0]?.total || 0;
        }

        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get historical usage data
router.get('/usage', requireAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 24;
        const usage = await Usage.find({ user: req.user._id })
            .sort({ timestamp: -1 })
            .limit(limit);
        
        // Return in chronological order
        res.json(usage.reverse());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/prosumers', async (req, res) => {
    try {
        const prosumers = await User.find({ role: { $in: ['prosumer', 'consumer'] }, status: 'approved' }).select('username role trustScore isCertified credits connectedProsumer');
        res.json(prosumers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/me', requireAuth, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.user._id, req.body, { returnDocument: 'after' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
