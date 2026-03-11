import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// Get the main seeded user or create one if it doesn't exist
router.get('/me', async (req, res) => {
    try {
        let user = await User.findOne({ username: 'Major Tom (You)' });
        if (!user) {
            user = await User.create({
                username: 'Major Tom (You)',
                role: 'resident',
                credits: 1240.50,
                trustScore: 98,
                isCertified: true
            });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/prosumers', async (req, res) => {
    try {
        const prosumers = await User.find({ role: 'prosumer', status: 'approved' }).select('username trustScore isCertified credits');
        res.json(prosumers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/me', async (req, res) => {
    try {
        const user = await User.findOneAndUpdate({ username: 'Major Tom (You)' }, req.body, { returnDocument: 'after', upsert: true });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
