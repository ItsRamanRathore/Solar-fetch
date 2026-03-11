import express from 'express';
import Asset from '../models/Asset.js';
import User from '../models/User.js';

const router = express.Router();

// Get all assets for the current user
router.get('/', async (req, res) => {
    try {
        const user = await User.findOne({ username: 'Major Tom (You)' });
        if (!user) return res.status(404).json({ error: 'User not found' });

        let assets = await Asset.find({ owner: user._id });

        // Seed assets if none exist for demo purposes
        if (assets.length === 0) {
            assets = await Asset.insertMany([
                { owner: user._id, name: 'South Roof Solar Array', type: 'Generation', status: 'Optimal', output: 4.2, efficiency: 98, hardwareId: 'GEN2-FPR-8F2D-Q921' },
                { owner: user._id, name: 'Tesla Powerwall 2', type: 'Storage', status: 'Charging', output: 13.5, efficiency: 92, hardwareId: 'BAT-T2-990-112B' },
                { owner: user._id, name: 'Smart EV Charger', type: 'Consumer', status: 'Idle', output: 0.0, efficiency: 100, hardwareId: 'EV-CHG-334-998C' }
            ]);
        }
        res.json(assets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Toggle Smart Broker
router.post('/broker/toggle', async (req, res) => {
    try {
        const user = await User.findOne({ username: 'Major Tom (You)' });
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.isBrokerActive = !user.isBrokerActive;
        await user.save();
        res.json({ isBrokerActive: user.isBrokerActive });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update asset status
router.put('/:id', async (req, res) => {
    try {
        const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
        res.json(asset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
