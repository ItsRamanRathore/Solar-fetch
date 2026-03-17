import Order from '../models/Order.js';
import Transaction from '../models/Transaction.js';
import Usage from '../models/Usage.js';
import GridState from '../models/GridState.js';

/**
 * ML Predictions Service
 * Provides price predictions, demand forecasting, and smart trading recommendations
 */

// ────────────────────────────────────────────────────────────────
// 1. PRICE PREDICTION
// ────────────────────────────────────────────────────────────────

/**
 * Predict energy prices for the next hours using exponential smoothing
 * @returns {Object} { nextHourPrice, price2h, price3h, trend, confidence }
 */
export const predictFuturePrice = async () => {
    try {
        // Get last 24 hours of transaction prices
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentTransactions = await Transaction.find({
            settledAt: { $gte: twentyFourHoursAgo },
            status: 'SETTLED'
        }).sort({ settledAt: 1 });

        if (recentTransactions.length === 0) {
            return {
                nextHourPrice: 7.5,
                price2h: 7.5,
                price3h: 7.5,
                trend: 'stable',
                confidence: 0.3,
                priceHistory: []
            };
        }

        // Extract hourly prices
        const hourlyPrices = aggregateHourlyPrices(recentTransactions);
        
        // Apply exponential smoothing (simple method)
        const smoothedPrices = exponentialSmoothing(hourlyPrices, 0.3);
        
        // Calculate trend
        const lastPrice = smoothedPrices[smoothedPrices.length - 1];
        const prevPrice = smoothedPrices[Math.max(0, smoothedPrices.length - 4)];
        const priceChange = ((lastPrice - prevPrice) / prevPrice) * 100;
        
        // Forecast next 3 hours
        const nextHourPrice = Math.max(0.5, lastPrice * (1 + calculateMomentum(smoothedPrices, 0.02)));
        const price2h = Math.max(0.5, nextHourPrice * (1 + calculateMomentum(smoothedPrices, 0.015)));
        const price3h = Math.max(0.5, price2h * (1 + calculateMomentum(smoothedPrices, 0.01)));
        
        // Determine trend
        let trend = 'stable';
        if (priceChange > 5) trend = 'rising';
        else if (priceChange < -5) trend = 'falling';
        
        // Confidence based on data consistency
        const stdDev = calculateStdDev(smoothedPrices);
        const confidence = Math.max(0.4, Math.min(0.95, 1 - (stdDev / (lastPrice || 1)) * 0.3));

        return {
            nextHourPrice: Number(nextHourPrice.toFixed(2)),
            price2h: Number(price2h.toFixed(2)),
            price3h: Number(price3h.toFixed(2)),
            currentPrice: Number(lastPrice.toFixed(2)),
            trend,
            confidence: Number(confidence.toFixed(2)),
            priceHistory: smoothedPrices.slice(-6)
        };
    } catch (err) {
        console.error('Price prediction error:', err);
        return {
            nextHourPrice: 7.5,
            price2h: 7.5,
            price3h: 7.5,
            trend: 'stable',
            confidence: 0.3,
            priceHistory: []
        };
    }
};

// ────────────────────────────────────────────────────────────────
// 2. DEMAND FORECASTING
// ────────────────────────────────────────────────────────────────

/**
 * Forecast energy demand for next hours using time-series patterns
 * @param {String} userId - User ID to forecast demand for
 * @returns {Object} { nextHourDemand, demand2h, demand3h, pattern, recommendation }
 */
export const forecastDemand = async (userId) => {
    try {
        // Get last 7 days of usage data
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const usageHistory = await Usage.find({
            user: userId,
            timestamp: { $gte: sevenDaysAgo }
        }).sort({ timestamp: 1 });

        if (usageHistory.length === 0) {
            return {
                nextHourDemand: 2.5,
                demand2h: 2.5,
                demand3h: 2.5,
                pattern: 'unknown',
                recommendation: 'Insufficient historical data',
                confidence: 0.2
            };
        }

        // Aggregate by hour of day
        const hourlyPattern = aggregateByHourOfDay(usageHistory);
        const currentHour = new Date().getHours();
        
        // Get consumption for current and next hours
        const nextHour = (currentHour + 1) % 24;
        const hour2 = (currentHour + 2) % 24;
        const hour3 = (currentHour + 3) % 24;
        
        const nextHourDemand = hourlyPattern[nextHour] || 2.5;
        const demand2h = hourlyPattern[hour2] || 2.5;
        const demand3h = hourlyPattern[hour3] || 2.5;
        
        // Identify pattern
        let pattern = 'stable';
        const avgDemand = Object.values(hourlyPattern).reduce((a, b) => a + b, 0) / 24;
        if (nextHourDemand > avgDemand * 1.3) pattern = 'peak';
        else if (nextHourDemand < avgDemand * 0.7) pattern = 'low';
        
        // Recommendation
        let recommendation = 'Standard consumption expected';
        if (pattern === 'peak') {
            recommendation = 'High demand expected - buy energy now';
        } else if (pattern === 'low') {
            recommendation = 'Low demand - consider selling excess';
        }
        
        // Confidence
        const dataPoints = usageHistory.filter(u => 
            new Date(u.timestamp).getHours() === nextHour
        ).length;
        const confidence = Math.min(0.95, Math.max(0.4, dataPoints / 7 * 0.9));

        return {
            nextHourDemand: Number(nextHourDemand.toFixed(2)),
            demand2h: Number(demand2h.toFixed(2)),
            demand3h: Number(demand3h.toFixed(2)),
            pattern,
            recommendation,
            confidence: Number(confidence.toFixed(2)),
            currentHour,
            nextHour
        };
    } catch (err) {
        console.error('Demand forecasting error:', err);
        return {
            nextHourDemand: 2.5,
            demand2h: 2.5,
            demand3h: 2.5,
            pattern: 'unknown',
            recommendation: 'Error in forecast',
            confidence: 0.2
        };
    }
};

// ────────────────────────────────────────────────────────────────
// 3. SMART TRADING RECOMMENDATIONS
// ────────────────────────────────────────────────────────────────

/**
 * Generate optimal bid/ask recommendations
 * @param {String} userId - User ID
 * @param {String} tradeType - 'buy' or 'sell'
 * @returns {Object} { recommendedPrice, volume, confidence, reasoning }
 */
export const getSmartTradingRecommendation = async (userId, tradeType) => {
    try {
        const user = await (await import('../models/User.js')).default.findById(userId);
        if (!user) throw new Error('User not found');

        // Get price prediction
        const pricePrediction = await predictFuturePrice();
        
        // Get demand forecast
        const demandForecast = await forecastDemand(userId);
        
        // Get grid state
        const gridState = await GridState.findOne().sort({ createdAt: -1 });
        
        let recommendedPrice, volume, reasoning;
        let confidence = pricePrediction.confidence;

        if (tradeType === 'buy') {
            // BUY recommendation
            const currentMarketPrice = pricePrediction.currentPrice || 7.5;
            const futurePrice = pricePrediction.nextHourPrice;
            
            // If price is expected to rise, buy now
            if (futurePrice > currentMarketPrice * 1.05) {
                recommendedPrice = Math.min(currentMarketPrice + 0.10, pricePrediction.nextHourPrice - 0.05);
                reasoning = `Price predicted to rise to ₹${futurePrice.toFixed(2)}. Buy now at ₹${recommendedPrice.toFixed(2)}`;
            } else {
                recommendedPrice = currentMarketPrice - 0.20; // Conservative offer
                reasoning = 'Price expected to remain stable or fall. Offer below market.';
            }
            
            // Volume based on battery capacity and demand
            const batteryAvailable = user.batteryCapacity - user.storedEnergy;
            volume = Math.min(batteryAvailable, demandForecast.demand2h * 2);
            
            // Adjust for grid state
            if (gridState?.simMode === 'grid-fail') {
                volume = 0;
                reasoning += ' [Grid emergency - buying disabled]';
                confidence *= 0.6;
            }
        } else {
            // SELL recommendation
            const currentMarketPrice = pricePrediction.currentPrice || 7.5;
            const futurePrice = pricePrediction.nextHourPrice;
            
            // If price is expected to fall, sell now
            if (futurePrice < currentMarketPrice * 0.95) {
                recommendedPrice = Math.max(currentMarketPrice - 0.10, pricePrediction.nextHourPrice + 0.05);
                reasoning = `Price predicted to fall to ₹${futurePrice.toFixed(2)}. Sell now at ₹${recommendedPrice.toFixed(2)}`;
            } else {
                recommendedPrice = currentMarketPrice + 0.20; // Premium offer
                reasoning = 'Price expected to rise. Hold or sell at premium.';
            }
            
            // Volume: sell only excess storage above safety buffer (80%)
            const SAFETY_BUFFER = 0.8;
            const saleable = Math.max(0, user.storedEnergy - (user.batteryCapacity * SAFETY_BUFFER));
            volume = Math.min(saleable, 10); // Max 10 kWh per trade
            
            if (demandForecast.pattern === 'peak') {
                volume *= 0.8; // Hold back during peak demand
                reasoning += ' [Reducing volume for peak demand]';
            }
        }

        return {
            recommendedPrice: Math.max(0.5, Number(recommendedPrice.toFixed(2))),
            volume: Math.max(0.1, Number(volume.toFixed(2))),
            confidence: Number(Math.min(0.95, confidence).toFixed(2)),
            reasoning,
            basedOn: {
                priceChance: pricePrediction.trend,
                demandPattern: demandForecast.pattern,
                gridState: gridState?.simMode || 'standard'
            }
        };
    } catch (err) {
        console.error('Trading recommendation error:', err);
        return {
            recommendedPrice: tradeType === 'buy' ? 7.0 : 8.0,
            volume: 1.5,
            confidence: 0.3,
            reasoning: 'Insufficient data for recommendation',
            basedOn: {}
        };
    }
};

// ────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ────────────────────────────────────────────────────────────────

function aggregateHourlyPrices(transactions) {
    const hourlyMap = {};
    
    transactions.forEach(tx => {
        const hour = Math.floor(tx.settledAt.getTime() / (60 * 60 * 1000)) * (60 * 60 * 1000);
        const hourKey = new Date(hour).toISOString();
        
        if (!hourlyMap[hourKey]) {
            hourlyMap[hourKey] = [];
        }
        hourlyMap[hourKey].push(tx.unitPrice);
    });
    
    return Object.values(hourlyMap)
        .map(prices => prices.reduce((a, b) => a + b, 0) / prices.length)
        .filter(p => p > 0);
}

function aggregateByHourOfDay(usageRecords) {
    const hourlyAgg = {};
    
    for (let h = 0; h < 24; h++) {
        hourlyAgg[h] = [];
    }
    
    usageRecords.forEach(record => {
        const hour = new Date(record.timestamp).getHours();
        hourlyAgg[hour].push(record.consumption);
    });
    
    const hourlyPattern = {};
    for (let h = 0; h < 24; h++) {
        if (hourlyAgg[h].length > 0) {
            hourlyPattern[h] = hourlyAgg[h].reduce((a, b) => a + b, 0) / hourlyAgg[h].length;
        } else {
            hourlyPattern[h] = 2.5; // Default fallback
        }
    }
    
    return hourlyPattern;
}

function exponentialSmoothing(data, alpha = 0.3) {
    if (data.length === 0) return [];
    
    const smoothed = [data[0]];
    
    for (let i = 1; i < data.length; i++) {
        const value = alpha * data[i] + (1 - alpha) * smoothed[i - 1];
        smoothed.push(value);
    }
    
    return smoothed;
}

function calculateMomentum(data, factor = 0.02) {
    if (data.length < 2) return 0;
    
    const recentChange = (data[data.length - 1] - data[data.length - 2]) / data[data.length - 2];
    return recentChange * factor;
}

function calculateStdDev(data) {
    if (data.length === 0) return 0;
    
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
}
