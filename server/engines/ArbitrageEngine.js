import User from '../models/User.js';
import Order from '../models/Order.js';
import GridState from '../models/GridState.js';

export const runArbitrageLogic = async (io) => {
    try {
        const grid = await GridState.findOne().sort({ createdAt: -1 });
        if (!grid) return;

        // 1. Predictive Sunset Logic (Pre-Bidding)
        // If it's standard and sunset is approaching (simulated)
        // We'll simulate "Approaching Sunset" if the grid state says so or based on a timer
        // For now, let's use the simMode directly.
        
        const brokerUsers = await User.find({ isBrokerActive: true });

        for (const user of brokerUsers) {
            // Logic A: Predictive Buying
            // If simMode is 'standard' but we predict 'sunset' (price surge)
            // Buy cheap energy now to fill battery.
            if (grid.simMode === 'standard' && user.storedEnergy < user.batteryCapacity * 0.8) {
                const buyVolume = Math.min(5, user.batteryCapacity - user.storedEnergy);
                if (buyVolume > 1) {
                    await Order.create({
                        maker: user._id,
                        type: 'buy',
                        kwh: buyVolume,
                        remainingKwh: buyVolume,
                        price: 7.50, // Standard cheap price
                        isBrokerOrder: true,
                        orderType: 'limit'
                    });
                    console.log(`[Broker] ${user.username} placed predictive BUY for ${buyVolume}kWh`);
                }
            }

            // Logic B: Arbitrage Selling
            // Phase 2.5: Safety Buffer - Only sell if battery > 80% to protect household resilience
            const SURVIVAL_BUFFER = 0.8;
            const canSell = user.storedEnergy > user.batteryCapacity * SURVIVAL_BUFFER;

            if ((grid.simMode === 'sunset' || grid.simMode === 'grid-fail') && canSell) {
                const sellVolume = Math.min(10, user.storedEnergy - (user.batteryCapacity * SURVIVAL_BUFFER)); 
                await Order.create({
                    maker: user._id,
                    type: 'sell',
                    kwh: sellVolume,
                    remainingKwh: sellVolume,
                    price: grid.simMode === 'grid-fail' ? 18.00 : 12.50, // Scarcity prices
                    isBrokerOrder: true,
                    orderType: 'market'
                });
                
                // Deduct from virtual battery (Simulation)
                user.storedEnergy -= sellVolume;
                await user.save();
                
                console.log(`[Broker] ${user.username} placed arbitrage SELL for ${sellVolume}kWh`);
            }
        }

    } catch (err) {
        console.error('[ArbitrageEngine Error]:', err);
    }
};
