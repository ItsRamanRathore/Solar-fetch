import express from 'express';
import proxy from 'express-http-proxy';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser'; // Need to add to package.json

dotenv.config();

const app = express();

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:5000'],
    credentials: true
}));

// Proxy configuration
const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL || 'http://localhost:5001';
const METERING_SERVICE_URL = process.env.METERING_SERVICE_URL || 'http://localhost:5002';
const TRADING_SERVICE_URL = process.env.TRADING_SERVICE_URL || 'http://localhost:5003';
const SETTLEMENT_SERVICE_URL = process.env.SETTLEMENT_SERVICE_URL || 'http://localhost:5004';

// Route Proxying
app.use('/api/auth', proxy(IDENTITY_SERVICE_URL, {
    proxyReqPathResolver: (req) => `/api/auth${req.url}`
}));

app.use('/api/users', proxy(IDENTITY_SERVICE_URL, {
    proxyReqPathResolver: (req) => `/api/users${req.url}`
}));

app.use('/api/admin', proxy(IDENTITY_SERVICE_URL, {
    proxyReqPathResolver: (req) => `/api/admin${req.url}`
}));

app.use('/api/grid', proxy(METERING_SERVICE_URL, {
    proxyReqPathResolver: (req) => `/api/grid${req.url}`
}));

app.use('/api/assets', proxy(METERING_SERVICE_URL, {
    proxyReqPathResolver: (req) => `/api/assets${req.url}`
}));

app.use('/api/predictions', proxy(METERING_SERVICE_URL, {
    proxyReqPathResolver: (req) => `/api/predictions${req.url}`
}));

app.use('/api/market', proxy(TRADING_SERVICE_URL, {
    proxyReqPathResolver: (req) => `/api/market${req.url}`
}));

app.use('/api/ledger', proxy(SETTLEMENT_SERVICE_URL, {
    proxyReqPathResolver: (req) => `/api/ledger${req.url}`
}));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'gateway-service' });
});

const PORT = process.env.GATEWAY_PORT || 5000;
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
