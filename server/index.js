import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import usersRoutes from './routes/users.js';
import gridRoutes from './routes/grid.js';
import assetsRoutes from './routes/assets.js';
import marketRoutes from './routes/market.js';
import ledgerRoutes from './routes/ledger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI in environment variables');
    process.exit(1);
}

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('Successfully connected to MongoDB!');
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error.message);
    });

// API Routes
app.use('/api/users', usersRoutes);
app.use('/api/grid', gridRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/ledger', ledgerRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'API is running and connected to database' });
});
