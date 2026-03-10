import express from 'express';
import Transaction from '../models/Transaction.js';

const router = express.Router();

// Get recent transactions for the ledger
router.get('/', async (req, res) => {
    try {
        const transactions = await Transaction.find().sort({ timestamp: -1 }).limit(50);
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
