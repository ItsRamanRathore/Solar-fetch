import User from '../models/User.js';
import Order from '../models/Order.js';
import Conflict from '../models/Conflict.js';

export const detectFraudulentActivity = async (io) => {
    try {
        const pendingOrders = await Order.find({ type: 'sell', status: 'PENDING' }).populate('maker');
        
        for (const order of pendingOrders) {
            const user = order.maker;
            if (!user) continue;

            const maxCapa = user.batteryCapacity * 1.5; 
            if (maxCapa > 0 && order.kwh > maxCapa) {
                console.warn(`[FRAUD ALERT] User ${user.username} attempting to sell ${order.kwh}kWh`);
                
                await Conflict.create({
                    username: user.username,
                    userId: user._id,
                    reason: 'VOLUMETRIC_MISMATCH',
                    severity: 'CRITICAL',
                    message: `Audit failed: IoT pulse (${maxCapa}kW) does not reconcile with Sale Order (${order.kwh}kW).`
                });

                io.emit('governance:fraud', {
                    userId: user._id,
                    username: user.username,
                    orderId: order._id,
                    message: `Audit failed: IoT pulse mismatch.`
                });
            }
        }
    } catch (err) {
        console.error('[FraudDetection Error]:', err);
    }
};
