import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import gridRoutes from './routes/grid.js';
import assetsRoutes from './routes/assets.js';
import marketRoutes from './routes/market.js';
import ledgerRoutes from './routes/ledger.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/users.js';
import { runArbitrageLogic } from './engines/ArbitrageEngine.js';
import { detectFraudulentActivity } from './engines/FraudEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

// ── Socket.IO + background simulation (local dev only) ──────────────
// Vercel serverless cannot run persistent servers, WebSockets, or timers.
const isVercel = process.env.VERCEL === '1';
const isProduction = process.env.NODE_ENV === 'production';

if (!isVercel) {
    const { createServer } = await import('http');
    const { Server } = await import('socket.io');

    const httpServer = createServer(app);
    const io = new Server(httpServer, {
        cors: { origin: 'http://localhost:5173', credentials: true }
    });

    app.set('io', io);

    // Background Simulation Loops
    setInterval(async () => {
        let currentMode = 'standard';
        try {
            const GridState = (await import('./models/GridState.js')).default;
            const state = await GridState.findOne().sort({ createdAt: -1 });
            if (state) currentMode = state.simMode;
        } catch (e) {}

        let payload = {
            generation: 0,
            health: 98,
            activeTrades: 0,
            reason: 'NORMAL_OPERATION'
        };

        if (currentMode === 'grid-fail') {
            payload = {
                generation: +(120.5 + (Math.random() * 40 - 20)).toFixed(1), // Wild noise
                health: Math.floor(Math.random() * 20 + 30), // 30-50% health
                activeTrades: Math.floor(Math.random() * 3 + 2),
                reason: 'GRID_INSTABILITY_DETECTED'
            };
        } else if (currentMode === 'sunset') {
            payload = {
                generation: +(20.5 + (Math.random() * 5)).toFixed(1), // Low yield
                health: 95,
                activeTrades: Math.floor(Math.random() * 8 + 15),
                reason: 'LOW_SOLAR_REVENUE_DROP'
            };
        } else {
            payload = {
                generation: +(142.8 + (Math.random() * 0.4 - 0.2)).toFixed(1),
                health: 100,
                activeTrades: Math.floor(Math.random() * 5 + 10),
                reason: 'OPTIMAL_SYNTAX'
            };
        }

        io.emit('grid:pulse', payload);

        if (Math.random() > 0.7) {
            io.emit('neighbors:discovered', {
                id: Date.now().toString(),
                name: ['Node-99K', 'Node-33W', 'Node-85P', 'Node-41X'][Math.floor(Math.random() * 4)],
                distance: ['150m', '300m', '550m', '900m'][Math.floor(Math.random() * 4)],
                surplus: currentMode === 'sunset' ? 0.2 : +(Math.random() * 5 + 1).toFixed(1),
                price: currentMode === 'grid-fail' ? 15.50 : +(Math.random() * 5 + 5).toFixed(2),
                status: 'Discovered',
                type: ['Prosumer', 'Consumer', 'Storage'][Math.floor(Math.random() * 3)],
                trustScore: Math.floor(Math.random() * 30 + 70),
                isCertified: Math.random() > 0.4
            });
        }

        // Run Phase 2 Arbitrage Engine
        await runArbitrageLogic(io);
        
        // Run Phase 2 Fraud Detection
        await detectFraudulentActivity(io);

        // Phase 2.5: Simulated Hardware Degradation
        // Slightly decrease battery capacity for any active user to simulate wear
        try {
            const User = (await import('./models/User.js')).default;
            const Usage = (await import('./models/Usage.js')).default;
            
            await User.updateMany({ role: 'prosumer' }, { $mul: { batteryCapacity: 0.99995 } });

            // Periodic Usage Simulation (Last 24h data filler)
            const allUsers = await User.find({ role: { $in: ['consumer', 'prosumer'] } });
            const now = new Date();
            
            for (const user of allUsers) {
                // Generate a random usage record if none exists for this minute
                const startOfMinute = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
                const alreadyHasUsage = await Usage.findOne({ user: user._id, timestamp: { $gte: startOfMinute } });
                
                if (!alreadyHasUsage) {
                    const isSunset = currentMode === 'sunset';
                    const isProsumer = user.role === 'prosumer';
                    
                    // Realistic Diurnal Simulation
                    // Hour 0-24 -> Radians 0-2PI
                    const hour = now.getHours();
                    const radian = (hour / 24) * 2 * Math.PI;
                    
                    // Consumption: Peaks at 8am (radian PI/1.5) and 8pm (radian PI/0.6)
                    // We'll use a sum of sines for "morning peak" and "evening peak"
                    const morningPeak = Math.exp(-Math.pow(hour - 8, 2) / 8);
                    const eveningPeak = Math.exp(-Math.pow(hour - 20, 2) / 10);
                    const baselineCons = 1.0; // 1kWh baseline
                    let consVal = baselineCons + (morningPeak * 2) + (eveningPeak * 3) + (Math.random() * 0.5);

                    // Generation: Prosumers generate based on the "Sun" (peak at 12pm)
                    // Solar Bell Curve: peak at 12, zero at < 6 and > 18
                    let genVal = 0.5 + Math.random() * 0.5; // Wind/Storage baseline
                    if (isProsumer && hour >= 6 && hour <= 18) {
                        genVal += Math.sin((hour - 6) / 12 * Math.PI) * 8 + (Math.random() * 1);
                    }

                    if (isSunset) {
                        genVal = genVal * 0.1; // Sudden drop
                        consVal = consVal * 1.8; // Grid stress spike
                    }

                    await Usage.create({
                        user: user._id,
                        timestamp: now,
                        consumption: +consVal.toFixed(2),
                        generation: +genVal.toFixed(2),
                        storage: isProsumer ? user.storedEnergy : 0
                    });
                }
            }
        } catch (e) {
            console.error('[UsageSim Error]:', e);
        }
    }, 3000);

    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// ── CORS (dynamic: works for both local dev and Vercel production) ───
const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:5000',
    'https://solarfetch.vercel.app',
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, curl, mobile apps)
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, true); // Be permissive — still set credentials
        }
    },
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

const apiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10000, // Extremely high for dev/demo stability
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', apiLimiter);

// ── MongoDB connection (cached for Vercel serverless reuse) ──────────
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI in environment variables');
    // Do NOT call process.exit() — it kills Vercel serverless functions
}

// Cache the connection so Vercel warm starts reuse it
let cached = global._mongooseConnection || { conn: null, promise: null };
global._mongooseConnection = cached;

async function connectDB() {
    if (!MONGODB_URI) return;
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI).then((m) => {
            console.log('Successfully connected to MongoDB!');
            return m;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (error) {
        cached.promise = null;
        console.error('MongoDB connection failed:', error.message);
    }

    return cached.conn;
}

connectDB();

// ── API Routes ───────────────────────────────────────────────────────
// Middleware to ensure DB connection for Vercel serverless
app.use('/api', async (req, res, next) => {
    try {
        const conn = await connectDB();
        if (!conn && !isVercel) {
            // Local dev: don't block if DB is down, just log
            console.warn('Proceeding without MongoDB connection (Local Dev)');
        } else if (!conn) {
            return res.status(503).json({ error: 'Database connection failed' });
        }
        next();
    } catch (err) {
        console.error('API DB connection wait failed:', err.message);
        res.status(503).json({ error: 'Database initializing or unavailable' });
    }
});

app.use('/api/auth', authRoutes);
app.use('/api/grid', gridRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'API is running',
        mongodb: {
            state: mongoose.connection.readyState,
            stateName: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState],
            connected: mongoose.connection.readyState === 1
        },
        env: {
            nodeEnv: process.env.NODE_ENV,
            hasMongoUri: !!process.env.MONGODB_URI
        }
    });
});

// ── Global Error Handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
    if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error(err.stack);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

export default app;
