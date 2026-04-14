import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Kafka } from 'kafkajs';
import marketRoutes from './routes/market.js';
import { setupKafkaConsumers } from './utils/consumers.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: '*', credentials: true }
});

app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27027/solarfetch';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Trading Service connected to MongoDB'))
    .catch(err => console.error('Trading Service MongoDB error:', err));

// Kafka setup
const kafka = new Kafka({
    clientId: 'trading-service',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

app.set('io', io);

app.use('/api/market', marketRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'trading-service' });
});

const PORT = process.env.PORT || 5003;
httpServer.listen(PORT, async () => {
    console.log(`Trading Service running on port ${PORT}`);
    
    // Start Kafka Consumers to trigger Arbitrage/Fraud and relay to Socket.io
    await setupKafkaConsumers(kafka, io);
});
