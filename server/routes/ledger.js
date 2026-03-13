import express from 'express';
import Transaction from '../models/Transaction.js';

const router = express.Router();

// Get recent transactions for the ledger
router.get('/', async (req, res) => {
    try {
        const transactions = await Transaction.aggregate([
            { $sort: { timestamp: -1 } },
            { $limit: 100 },
            {
                $addFields: {
                    toObjectId: { $toObjectId: "$to" }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'toObjectId',
                    foreignField: '_id',
                    as: 'buyerDetails'
                }
            }
        ]);
        
        // Map back to standard structure with populated username fallback
        const formatted = transactions.map(tx => ({
            ...tx,
            toUserObject: tx.buyerDetails && tx.buyerDetails[0] ? tx.buyerDetails[0] : null,
            toUsername: tx.buyerDetails && tx.buyerDetails[0] ? tx.buyerDetails[0].username : tx.to
        }));
        
        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
