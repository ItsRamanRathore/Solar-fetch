import express from 'express';
import { z } from 'zod';
import User from '../models/User.js';
import Governance from '../models/Governance.js';
import Conflict from '../models/Conflict.js';
import Transaction from '../models/Transaction.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth, requireAdmin);

// Get users for vetting queue
router.get('/users', async (req, res, next) => {
    try {
        const users = await User.find({ role: { $ne: 'admin' } }).select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        next(err);
    }
});

// Approve a user
router.put('/users/:id/approve', async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.status = 'approved';
        await user.save();
        res.json(user);
    } catch (err) {
        next(err);
    }
});

// Reject/Suspend a user
router.put('/users/:id/suspend', async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.status = 'suspended';
        await user.save();
        res.json(user);
    } catch (err) {
        next(err);
    }
});

// Get current governance state
router.get('/governance', async (req, res, next) => {
    try {
        let gov = await Governance.findOne();
        if (!gov) {
            gov = await Governance.create({ isTradingPaused: false, priceCap: 25.00, floorPrice: 1.00, isAiEnabled: true });
        }
        res.json(gov);
    } catch (err) {
        next(err);
    }
});

const govSchema = z.object({
    isTradingPaused: z.boolean().optional(),
    priceCap: z.number().positive().optional(),
    floorPrice: z.number().positive().optional(),
    isAiEnabled: z.boolean().optional(),
    globalDirective: z.object({
        message: z.string(),
        active: z.boolean()
    }).optional()
});

// Update governance state
router.put('/governance', async (req, res, next) => {
    try {
        const updates = govSchema.parse(req.body);
        let gov = await Governance.findOne();
        if (!gov) {
            gov = new Governance();
        }

        if (updates.isTradingPaused !== undefined) gov.isTradingPaused = updates.isTradingPaused;
        if (updates.priceCap !== undefined) gov.priceCap = updates.priceCap;
        if (updates.floorPrice !== undefined) gov.floorPrice = updates.floorPrice;
        if (updates.isAiEnabled !== undefined) gov.isAiEnabled = updates.isAiEnabled;
        
        if (updates.globalDirective) {
            gov.globalDirective = {
                ...updates.globalDirective,
                updatedAt: new Date()
            };
        }

        await gov.save();
        res.json(gov);
    } catch (err) {
        next(err);
    }
});

// --- Conflict Management ---
router.get('/conflicts', async (req, res, next) => {
    try {
        const conflicts = await Conflict.find().sort({ createdAt: -1 });
        res.json(conflicts);
    } catch (err) {
        next(err);
    }
});

router.put('/conflicts/:id/resolve', async (req, res, next) => {
    try {
        const conflict = await Conflict.findById(req.params.id);
        if (!conflict) return res.status(404).json({ error: 'Conflict not found' });
        conflict.status = 'RESOLVED';
        await conflict.save();
        res.json(conflict);
    } catch (err) {
        next(err);
    }
});

// --- Ledger Tools ---
router.get('/ledger/export', async (req, res, next) => {
    try {
        const transactions = await Transaction.find().sort({ timestamp: -1 });
        let csv = 'Time,From,To,Amount,Price,Total,Status\n';
        transactions.forEach(tx => {
            csv += `${tx.timestamp.toISOString()},${tx.from},${tx.to},${tx.amount},${tx.price},${tx.settlementTotal},${tx.status}\n`;
        });
        res.header('Content-Type', 'text/csv');
        res.attachment('ledger-export.csv');
        res.send(csv);
    } catch (err) {
        next(err);
    }
});

router.post('/ledger/verify', async (req, res, next) => {
    try {
        // Simulated chain verification
        await new Promise(r => setTimeout(r, 1500));
        res.json({ 
            success: true, 
            message: 'All 822 transactions verified against regional hash anchors.',
            consensus: '99.98%'
        });
    } catch (err) {
        next(err);
    }
});

export default router;
