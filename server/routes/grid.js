import express from 'express';
import GridState from '../models/GridState.js';
import Usage from '../models/Usage.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

const router = express.Router();

// Get global grid statistics
router.get('/stats', async (req, res) => {
    try {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        // Neighbor generation & consumption
        const usage = await Usage.aggregate([
            { $match: { timestamp: { $gt: last24h } } },
            { $group: { 
                _id: null, 
                totalGeneration: { $sum: "$generation" }, 
                totalConsumption: { $sum: "$consumption" } 
            } }
        ]);

        // Active trades
        const trades = await Transaction.countDocuments({ 
            timestamp: { $gt: last24h },
            status: 'SETTLED'
        });

        // User counts
        const userCounts = await User.aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);

        const stats = {
            generation: usage[0]?.totalGeneration || 0,
            consumption: usage[0]?.totalConsumption || 0,
            activeTrades: trades,
            health: 99.8, // Baseline stability
            userCounts: userCounts.reduce((acc, curr) => ({ ...acc, [curr._id.toLowerCase()]: curr.count }), {})
        };

        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get neighborhood historical usage
router.get('/usage', async (req, res) => {
    try {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const usage = await Usage.aggregate([
            { $match: { timestamp: { $gt: last24h } } },
            { $group: {
                _id: { $hour: "$timestamp" },
                timestamp: { $first: "$timestamp" },
                consumption: { $sum: "$consumption" },
                generation: { $sum: "$generation" }
            }},
            { $sort: { timestamp: 1 } }
        ]);
        
        res.json(usage);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get the current grid state
router.get('/', async (req, res) => {
    try {
        let state = await GridState.findOne().sort({ createdAt: -1 });
        if (!state) {
            state = await GridState.create({
                simMode: 'standard',
                availableVolume: 100.0,
                syncStatus: 99.98
            });
        }
        res.json(state);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update grid state (e.g., simMode)
router.put('/', async (req, res) => {
    try {
        const state = await GridState.findOneAndUpdate({}, req.body, { returnDocument: 'after', upsert: true, sort: { createdAt: -1 } });
        res.json(state);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
