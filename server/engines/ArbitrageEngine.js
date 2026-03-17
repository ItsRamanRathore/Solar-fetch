import User from '../models/User.js';
import Order from '../models/Order.js';
import GridState from '../models/GridState.js';
import Governance from '../models/Governance.js';
import { predictFuturePrice, getSmartTradingRecommendation } from '../services/MLPredictionsService.js';

export const runArbitrageLogic = async (io) => {
    try {
        const gov = await Governance.findOne();
        if (gov && !gov.isAiEnabled) {
            // AI is locked by administrator
            return;
        }

        const grid = await GridState.findOne().sort({ createdAt: -1 });
        if (!grid) return;

        // Get ML price predictions for smarter decisions
        const pricePrediction = await predictFuturePrice();
        const currentPrice = pricePrediction.currentPrice || 7.5;
        const nextHourPrice = pricePrediction.nextHourPrice || 7.5;
        const trend = pricePrediction.trend;
        
        const brokerUsers = await User.find({ isBrokerActive: true });

        for (const user of brokerUsers) {
            // Logic A: ML-Powered Predictive Buying
            // Buy if price is predicted to rise AND battery is below 80%
            const priceWillRise = nextHourPrice > currentPrice * 1.05;
            const batteryLow = user.storedEnergy < user.batteryCapacity * 0.8;
            
            if ((priceWillRise || grid.simMode === 'standard') && batteryLow) {
                const buyVolume = Math.min(5, user.batteryCapacity - user.storedEnergy);
                if (buyVolume > 1) {
                    // Use ML recommendation for smarter pricing
                    const buyRec = await getSmartTradingRecommendation(user._id, 'buy');
                    const bidPrice = Math.min(buyRec.recommendedPrice, nextHourPrice - 0.03);
                    
                    await Order.create({
                        maker: user._id,
                        type: 'buy',
                        kwh: buyVolume,
                        remainingKwh: buyVolume,
                        price: Math.max(0.5, bidPrice),
                        isBrokerOrder: true,
                        orderType: 'limit'
                    });
                    console.log(`[ML Broker] ${user.username} placed ML buy for ${buyVolume}kWh at ₹${bidPrice.toFixed(2)}`);
                }
            }

            // Logic B: ML-Powered Arbitrage Selling
            // Sell if price is predicted to fall OR during shortage (sunset/grid-fail)
            const SURVIVAL_BUFFER = 0.8;
            const canSell = user.storedEnergy > user.batteryCapacity * SURVIVAL_BUFFER;
            const priceWillFall = nextHourPrice < currentPrice * 0.95;

            if ((priceWillFall || grid.simMode === 'sunset' || grid.simMode === 'grid-fail') && canSell) {
                const sellVolume = Math.min(10, user.storedEnergy - (user.batteryCapacity * SURVIVAL_BUFFER));
                
                // Use ML recommendation for optimal price
                const sellRec = await getSmartTradingRecommendation(user._id, 'sell');
                let askPrice = sellRec.recommendedPrice;
                
                // Scarcity markup for grid emergencies
                if (grid.simMode === 'grid-fail') {
                    askPrice *= 2.4; // 140% markup during grid failure
                } else if (grid.simMode === 'sunset') {
                    askPrice *= 1.6; // 60% markup during sunset peak
                }
                
                await Order.create({
                    maker: user._id,
                    type: 'sell',
                    kwh: sellVolume,
                    remainingKwh: sellVolume,
                    price: Math.min(25, askPrice), // Respect governance price cap
                    isBrokerOrder: true,
                    orderType: 'market'
                });
                
                user.storedEnergy -= sellVolume;
                await user.save();
                
                console.log(`[ML Broker] ${user.username} placed ML sell for ${sellVolume}kWh at ₹${askPrice.toFixed(2)} (trend: ${trend})`);
            }
        }

    } catch (err) {
        console.error('[ArbitrageEngine Error]:', err);
    }
};
