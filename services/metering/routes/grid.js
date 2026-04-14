import express from 'express';
import GridState from '../models/GridState.js';

const router = express.Router();

router.get('/status', async (req, res) => {
    try {
        const state = await GridState.findOne().sort({ createdAt: -1 });
        res.json(state || { simMode: 'standard', networkStatus: 'stable' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/mode', async (req, res) => {
    try {
        const { mode } = req.body;
        const newState = await GridState.create({ simMode: mode });
        res.json(newState);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
