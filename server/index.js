import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';

import authRoutes from './routes/auth.js';
import gridRoutes from './routes/grid.js';
import assetsRoutes from './routes/assets.js';
import marketRoutes from './routes/market.js';
import ledgerRoutes from './routes/ledger.js';
import adminRoutes from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: 'http://localhost:5173', credentials: true }
});

app.set('io', io);

// Background Simulation Loops
setInterval(() => {
    io.emit('grid:pulse', {
        generation: +(142.8 + (Math.random() * 0.4 - 0.2)).toFixed(1),
        health: Math.min(100, Math.max(85, +(98 + (Math.random() > 0.8 ? (Math.random() * 2 - 1) : 0)).toFixed(0))),
        activeTrades: Math.floor(Math.random() * 5 + 10)
    });

    if (Math.random() > 0.7) {
        io.emit('neighbors:discovered', {
            id: Date.now().toString(),
            name: ['Node-99K', 'Node-33W', 'Node-85P', 'Node-41X'][Math.floor(Math.random() * 4)],
            distance: ['150m', '300m', '550m', '900m'][Math.floor(Math.random() * 4)],
            surplus: +(Math.random() * 5 + 1).toFixed(1),
            price: +(Math.random() * 5 + 5).toFixed(2),
            status: 'Discovered',
            type: ['Prosumer', 'Consumer', 'Storage'][Math.floor(Math.random() * 3)],
            trustScore: Math.floor(Math.random() * 30 + 70),
            isCertified: Math.random() > 0.4
        });
    }
}, 3000);

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5000'],
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', apiLimiter);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI in environment variables');
    process.exit(1);
}

const connectWithRetry = async (retries = 5, delay = 2000) => {
    for (let i = 0; i < retries; i++) {
        try {
            await mongoose.connect(MONGODB_URI);
            console.log('Successfully connected to MongoDB!');
            return;
        } catch (error) {
            console.error(`MongoDB connection attempt ${i + 1}/${retries} failed:`, error.message);
            if (i < retries - 1) {
                const waitTime = delay * Math.pow(2, i);
                console.log(`Retrying in ${waitTime / 1000}s...`);
                await new Promise(r => setTimeout(r, waitTime));
            }
        }
    }
    console.error('All MongoDB connection attempts failed. Server running without DB.');
};
connectWithRetry();

mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Attempting to reconnect...');
    connectWithRetry();
});

if (process.env.NODE_ENV !== 'production') {
    httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/grid', gridRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'API is running and connected to database' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error(err.stack);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

export default app;
