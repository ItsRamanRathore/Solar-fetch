import express from 'express';
import Asset from '../models/Asset.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get all assets for the authenticated user
router.get('/', requireAuth, async (req, res) => {
    try {
        let assets = await Asset.find({ owner: req.user._id });

        // Seed assets if none exist for demo purposes (now linked to the specific real user)
        if (assets.length === 0) {
            assets = await Asset.insertMany([
                { owner: req.user._id, name: 'Main Solar Array', type: 'Generation', status: 'Optimal', output: 4.2, efficiency: 98, hardwareId: `GEN-${req.user.username.toUpperCase()}-1` },
                { owner: req.user._id, name: 'Home Battery Storage', type: 'Storage', status: 'Idle', output: 13.5, efficiency: 92, hardwareId: `BAT-${req.user.username.toUpperCase()}-1` },
                { owner: req.user._id, name: 'Essential Loads', type: 'Consumer', status: 'Optimal', output: 0.0, efficiency: 100, hardwareId: `CON-${req.user.username.toUpperCase()}-1` }
            ]);
        }
        res.json(assets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Toggle Smart Broker
router.post('/broker/toggle', requireAuth, async (req, res) => {
    try {
        req.user.isBrokerActive = !req.user.isBrokerActive;
        await req.user.save();
        res.json({ isBrokerActive: req.user.isBrokerActive });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Persisted Auto-Accept Highest toggle for prosumers
router.post('/broker/auto-accept', requireAuth, async (req, res) => {
    try {
        if (req.user.role !== 'prosumer') {
            return res.status(403).json({ error: 'Only prosumers can configure auto-accept' });
        }

        const hasExplicitValue = typeof req.body?.enabled === 'boolean';
        req.user.autoAcceptHighestEnabled = hasExplicitValue
            ? req.body.enabled
            : !req.user.autoAcceptHighestEnabled;

        await req.user.save();
        res.json({ autoAcceptHighestEnabled: req.user.autoAcceptHighestEnabled });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update asset status
router.put('/:id', requireAuth, async (req, res) => {
    try {
        // Ensure user owns the asset
        const asset = await Asset.findOneAndUpdate(
            { _id: req.params.id, owner: req.user._id }, 
            req.body, 
            { returnDocument: 'after' }
        );
        if (!asset) return res.status(404).json({ error: 'Asset not found or unauthorized' });
        res.json(asset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
