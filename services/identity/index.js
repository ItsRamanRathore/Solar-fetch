import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:5000'],
    credentials: true
}));

app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27027/solarfetch_identity';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Identity Service connected to MongoDB'))
    .catch(err => console.error('Identity Service MongoDB connection error:', err));

app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'identity-service' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Identity Service running on port ${PORT}`);
});
