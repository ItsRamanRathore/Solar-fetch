import User from '../models/User.js';
import Order from '../models/Order.js';

export const detectFraudulentActivity = async (io) => {
    try {
        // High-Tech Fraud Detection:
        // Compare the total SELLING volume of a user in the last hour 
        // with their simulated "IoT yield" potential.
        
        // For simulation purposes, we assume a "Max Yield" for each prosumer.
        // If they try to sell 10x their capacity, they are flagged.
        
        const pendingOrders = await Order.find({ type: 'sell', status: 'PENDING' }).populate('maker');
        
        for (const order of pendingOrders) {
            const user = order.maker;
            if (!user) continue;

            const maxCapa = user.batteryCapacity * 1.5; // Theoretical max burst
            if (order.kwh > maxCapa) {
                console.warn(`[FRAUD ALERT] User ${user.username} attempting to sell ${order.kwh}kWh with capacity ${user.batteryCapacity}kWh`);
                
                // Flag user in DB for visual identification
                await User.findByIdAndUpdate(user._id, { isFlagged: true });

                io.emit('governance:fraud', {
                    userId: user._id,
                    username: user.username,
                    orderId: order._id,
                    reason: 'VOLUMETRIC_MISMATCH',
                    severity: 'CRITICAL',
                    message: `Audit failed: IoT pulse (${maxCapa}kW) does not reconcile with Sale Order (${order.kwh}kW).`
                });
            }
        }
    } catch (err) {
        console.error('[FraudDetection Error]:', err);
    }
};
