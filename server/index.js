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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

// ── Socket.IO + background simulation (local dev only) ──────────────
// Vercel serverless cannot run persistent servers, WebSockets, or timers.
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

if (!isProduction) {
    const { createServer } = await import('http');
    const { Server } = await import('socket.io');

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
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
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
        await connectDB();
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
