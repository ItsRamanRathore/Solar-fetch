import express from 'express';
import { z } from 'zod';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Usage from '../models/Usage.js';
import { requireAuth } from '../middleware/auth.js';
import { formatTimeIST } from '../utils/indiaFormat.js';

const router = express.Router();

const connectionRequestSchema = z.object({
    prosumerId: z.string().min(1)
});

const emitSocketEvent = (req, event, payload = {}) => {
    const io = req.app.get('io');
    if (io) {
        io.emit(event, {
            ...payload,
            time: formatTimeIST()
        });
    }
};

const clearConnectionRequest = (consumer) => {
    consumer.connectionRequestProsumer = null;
    consumer.connectionRequestStatus = 'none';
    consumer.connectionRequestedAt = null;
};

// Get the authenticated user
router.get('/me', requireAuth, async (req, res) => {
    try {
        res.json(req.user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get aggregate stats based on user role
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const stats = {};
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        if (req.user.role === 'admin') {
            stats.totalUsers = await User.countDocuments();
            stats.prosumers = await User.countDocuments({ role: 'prosumer' });
            stats.consumers = await User.countDocuments({ role: 'consumer' });
            stats.pendingUsers = await User.countDocuments({ status: 'pending' });
        } else if (req.user.role === 'prosumer') {
            stats.connectedConsumers = await User.countDocuments({
                connectedProsumer: req.user._id,
                role: 'consumer',
                status: { $ne: 'suspended' }
            });
            stats.pendingRequests = await User.countDocuments({
                connectionRequestProsumer: req.user._id,
                connectionRequestStatus: 'pending',
                role: 'consumer'
            });
            
            const allTime = await Transaction.aggregate([
                { $match: { from: req.user._id.toString(), status: 'SETTLED' } },
                { $group: { _id: null, totalVolume: { $sum: '$amount' }, totalRevenue: { $sum: '$settlementTotal' } } }
            ]);
            stats.totalVolumeSold = allTime[0]?.totalVolume || 0;
            stats.totalRevenue = allTime[0]?.totalRevenue || 0;

            const daily = await Usage.aggregate([
                { $match: { user: req.user._id, timestamp: { $gt: last24h } } },
                { $group: { _id: null, dailyGen: { $sum: '$generation' } } }
            ]);
            stats.dailyGeneration = daily[0]?.dailyGen || 0;

            const dailyRev = await Transaction.aggregate([
                { $match: { from: req.user._id.toString(), status: 'SETTLED', timestamp: { $gt: last24h } } },
                { $group: { _id: null, total: { $sum: '$settlementTotal' } } }
            ]);
            stats.dailyRevenue = dailyRev[0]?.total || 0;
            
        } else if (req.user.role === 'consumer') {
            if (req.user.connectedProsumer) {
                const prosumer = await User.findById(req.user.connectedProsumer).select('username trustScore isCertified');
                stats.connectedProsumer = prosumer;
            }

            stats.connectionRequestStatus = req.user.connectionRequestStatus || 'none';
            if (req.user.connectionRequestStatus === 'pending' && req.user.connectionRequestProsumer) {
                const pendingProsumer = await User.findById(req.user.connectionRequestProsumer).select('username trustScore isCertified');
                stats.pendingProsumer = pendingProsumer;
            }
            
            const allTime = await Transaction.aggregate([
                { $match: { to: req.user._id.toString(), status: 'SETTLED' } },
                { $group: { _id: null, totalVolume: { $sum: '$amount' }, totalCost: { $sum: '$settlementTotal' } } }
            ]);
            stats.totalVolumePurchased = allTime[0]?.totalVolume || 0;
            stats.totalCost = allTime[0]?.totalCost || 0;

            const daily = await Usage.aggregate([
                { $match: { user: req.user._id, timestamp: { $gt: last24h } } },
                { $group: { _id: null, dailyCons: { $sum: '$consumption' } } }
            ]);
            stats.dailyKwh = daily[0]?.dailyCons || 0;

            const dailyCost = await Transaction.aggregate([
                { $match: { to: req.user._id.toString(), status: 'SETTLED', timestamp: { $gt: last24h } } },
                { $group: { _id: null, total: { $sum: '$settlementTotal' } } }
            ]);
            stats.dailyCost = dailyCost[0]?.total || 0;
        }

        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/connections', requireAuth, async (req, res) => {
    try {
        if (req.user.role === 'prosumer') {
            const [pendingRequests, connectedConsumers, newRegistrations] = await Promise.all([
                User.find({
                    role: 'consumer',
                    status: { $ne: 'suspended' },
                    connectionRequestProsumer: req.user._id,
                    connectionRequestStatus: 'pending'
                })
                    .select('username status trustScore isCertified credits connectionRequestedAt updatedAt createdAt')
                    .sort({ connectionRequestedAt: 1 }),
                User.find({
                    role: 'consumer',
                    status: { $ne: 'suspended' },
                    connectedProsumer: req.user._id
                })
                    .select('username status trustScore isCertified credits updatedAt createdAt')
                    .sort({ updatedAt: -1 }),
                User.find({
                    role: 'consumer',
                    status: 'pending'
                })
                    .select('username status trustScore isCertified credits createdAt')
                    .sort({ createdAt: -1 })
                    .limit(10)
            ]);

            return res.json({ pendingRequests, connectedConsumers, newRegistrations });
        }

        if (req.user.role === 'consumer') {
            const consumer = await User.findById(req.user._id)
                .populate('connectedProsumer', 'username trustScore isCertified')
                .populate('connectionRequestProsumer', 'username trustScore isCertified');

            return res.json({
                connectionRequestStatus: consumer?.connectionRequestStatus || 'none',
                connectedProsumer: consumer?.connectedProsumer || null,
                pendingProsumer: consumer?.connectionRequestStatus === 'pending' ? consumer?.connectionRequestProsumer || null : null
            });
        }

        return res.json({ pendingRequests: [], connectedConsumers: [], newRegistrations: [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/connections/request', requireAuth, async (req, res) => {
    try {
        if (req.user.role !== 'consumer') {
            return res.status(403).json({ error: 'Only consumers can request prosumer connections' });
        }
        if (req.user.status !== 'approved') {
            return res.status(403).json({ error: 'Only approved consumers can request a connection' });
        }

        const { prosumerId } = connectionRequestSchema.parse(req.body);
        const [consumer, prosumer] = await Promise.all([
            User.findById(req.user._id),
            User.findOne({ _id: prosumerId, role: 'prosumer', status: 'approved' }).select('username')
        ]);

        if (!consumer) {
            return res.status(404).json({ error: 'Consumer not found' });
        }
        if (!prosumer) {
            return res.status(404).json({ error: 'Prosumer not found or unavailable' });
        }

        if (consumer.connectionRequestStatus === 'pending' && consumer.connectionRequestProsumer?.toString() === prosumerId) {
            return res.json({ success: true, status: 'pending', alreadyPending: true });
        }

        if (consumer.connectedProsumer?.toString() === prosumerId && consumer.connectionRequestStatus !== 'pending') {
            return res.json({ success: true, status: 'connected', alreadyConnected: true });
        }

        consumer.connectionRequestProsumer = prosumer._id;
        consumer.connectionRequestStatus = 'pending';
        consumer.connectionRequestedAt = new Date();
        await consumer.save();

        emitSocketEvent(req, 'connections:updated', {
            type: 'requested',
            consumerId: consumer._id.toString(),
            consumerUsername: consumer.username,
            prosumerId: prosumer._id.toString(),
            prosumerUsername: prosumer.username
        });

        res.json({ success: true, status: 'pending' });
    } catch (err) {
        if (err?.issues || err?.name === 'ZodError') {
            return res.status(400).json({ error: err.issues || err.message });
        }
        res.status(500).json({ error: err.message });
    }
});

router.post('/connections/requests/:consumerId/accept', requireAuth, async (req, res) => {
    try {
        if (req.user.role !== 'prosumer') {
            return res.status(403).json({ error: 'Only prosumers can accept connection requests' });
        }
        if (req.user.status !== 'approved') {
            return res.status(403).json({ error: 'Only approved prosumers can manage connection requests' });
        }

        const consumer = await User.findOne({
            _id: req.params.consumerId,
            role: 'consumer',
            connectionRequestProsumer: req.user._id,
            connectionRequestStatus: 'pending'
        }).select('-password');

        if (!consumer) {
            return res.status(404).json({ error: 'Pending consumer request not found' });
        }

        const previousProsumerId = consumer.connectedProsumer?.toString() || null;
        consumer.connectedProsumer = req.user._id;
        clearConnectionRequest(consumer);
        await consumer.save();

        emitSocketEvent(req, 'connections:updated', {
            type: 'accepted',
            consumerId: consumer._id.toString(),
            consumerUsername: consumer.username,
            prosumerId: req.user._id.toString(),
            prosumerUsername: req.user.username,
            previousProsumerId
        });

        res.json({ success: true, consumer });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/connections/requests/:consumerId/reject', requireAuth, async (req, res) => {
    try {
        if (req.user.role !== 'prosumer') {
            return res.status(403).json({ error: 'Only prosumers can reject connection requests' });
        }
        if (req.user.status !== 'approved') {
            return res.status(403).json({ error: 'Only approved prosumers can manage connection requests' });
        }

        const consumer = await User.findOne({
            _id: req.params.consumerId,
            role: 'consumer',
            connectionRequestProsumer: req.user._id,
            connectionRequestStatus: 'pending'
        }).select('-password');

        if (!consumer) {
            return res.status(404).json({ error: 'Pending consumer request not found' });
        }

        clearConnectionRequest(consumer);
        await consumer.save();

        emitSocketEvent(req, 'connections:updated', {
            type: 'rejected',
            consumerId: consumer._id.toString(),
            consumerUsername: consumer.username,
            prosumerId: req.user._id.toString(),
            prosumerUsername: req.user.username
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/connections', requireAuth, async (req, res) => {
    try {
        if (req.user.role !== 'consumer') {
            return res.status(403).json({ error: 'Only consumers can disconnect' });
        }

        const consumer = await User.findById(req.user._id);
        if (!consumer) return res.status(404).json({ error: 'Consumer not found' });

        if (!consumer.connectedProsumer && consumer.connectionRequestStatus !== 'pending') {
            return res.json({ success: true, alreadyDisconnected: true });
        }

        const [prosumerId, prosumerRequestId] = [
            consumer.connectedProsumer?.toString() || null,
            consumer.connectionRequestProsumer?.toString() || null
        ];
        const lookupId = prosumerId || prosumerRequestId;
        const prosumer = lookupId ? await User.findById(lookupId).select('username') : null;

        consumer.connectedProsumer = null;
        clearConnectionRequest(consumer);
        await consumer.save();

        emitSocketEvent(req, 'connections:updated', {
            type: 'disconnected',
            consumerId: consumer._id.toString(),
            consumerUsername: consumer.username,
            prosumerId: lookupId,
            prosumerUsername: prosumer?.username
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get historical usage data
router.get('/usage', requireAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 24;
        const usage = await Usage.find({ user: req.user._id })
            .sort({ timestamp: -1 })
            .limit(limit);
        
        res.json(usage.reverse());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/prosumers', async (req, res) => {
    try {
        const prosumers = await User.find({ role: { $in: ['prosumer', 'consumer'] }, status: 'approved' }).select('username role trustScore isCertified credits connectedProsumer x y');
        res.json(prosumers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/me', requireAuth, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.user._id, req.body, { returnDocument: 'after' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
