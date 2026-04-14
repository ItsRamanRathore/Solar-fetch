import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { Kafka } from 'kafkajs';
import ledgerRoutes from './routes/ledger.js';
import { setupKafkaConsumers } from './utils/consumers.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27027/solarfetch';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Settlement Service connected to MongoDB'))
    .catch(err => console.error('Settlement Service MongoDB error:', err));

// Kafka setup
const kafka = new Kafka({
    clientId: 'settlement-service',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

app.use('/api/ledger', ledgerRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'settlement-service' });
});

const PORT = process.env.PORT || 5004;
app.listen(PORT, async () => {
    console.log(`Settlement Service running on port ${PORT}`);
    
    // Start Kafka Consumers to record trades to the ledger
    await setupKafkaConsumers(kafka);
});
