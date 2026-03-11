import express from 'express';
import GridState from '../models/GridState.js';

const router = express.Router();

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
