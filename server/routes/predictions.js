import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
    predictFuturePrice,
    forecastDemand,
    getSmartTradingRecommendation
} from '../services/MLPredictionsService.js';

const router = express.Router();

/**
 * GET /api/predictions/price
 * Get market price predictions for next 3 hours
 */
router.get('/price', async (req, res, next) => {
    try {
        const prediction = await predictFuturePrice();
        res.json(prediction);
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/predictions/demand
 * Get demand forecast for authenticated user (next 3 hours)
 */
router.get('/demand', requireAuth, async (req, res, next) => {
    try {
        const forecast = await forecastDemand(req.user._id);
        res.json(forecast);
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/predictions/trading/:type
 * Get smart trading recommendation (buy or sell)
 * @param {String} type - 'buy' or 'sell'
 */
router.get('/trading/:type', requireAuth, async (req, res, next) => {
    try {
        const { type } = req.params;
        
        if (!['buy', 'sell'].includes(type)) {
            return res.status(400).json({ error: 'Type must be "buy" or "sell"' });
        }
        
        const recommendation = await getSmartTradingRecommendation(req.user._id, type);
        res.json(recommendation);
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/predictions/summary
 * Get complete predictions summary (price + demand + trading recommendations)
 */
router.get('/summary', requireAuth, async (req, res, next) => {
    try {
        const [pricePrediction, demandForecast, buyRec, sellRec] = await Promise.all([
            predictFuturePrice(),
            forecastDemand(req.user._id),
            getSmartTradingRecommendation(req.user._id, 'buy'),
            getSmartTradingRecommendation(req.user._id, 'sell')
        ]);
        
        res.json({
            price: pricePrediction,
            demand: demandForecast,
            buyRecommendation: buyRec,
            sellRecommendation: sellRec,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        next(err);
    }
});

export default router;
