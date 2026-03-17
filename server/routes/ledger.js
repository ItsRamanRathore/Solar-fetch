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
                    fromObjectId: {
                        $convert: { input: '$from', to: 'objectId', onError: null, onNull: null }
                    },
                    toObjectId: {
                        $convert: { input: '$to', to: 'objectId', onError: null, onNull: null }
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'fromObjectId',
                    foreignField: '_id',
                    as: 'sellerDetails'
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
            fromUserObject: tx.sellerDetails && tx.sellerDetails[0] ? tx.sellerDetails[0] : null,
            toUserObject: tx.buyerDetails && tx.buyerDetails[0] ? tx.buyerDetails[0] : null,
            fromUsername: tx.sellerDetails && tx.sellerDetails[0] ? tx.sellerDetails[0].username : (tx.fromUsername || tx.from),
            toUsername: tx.buyerDetails && tx.buyerDetails[0] ? tx.buyerDetails[0].username : (tx.toUsername || tx.to)
        }));
        
        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
