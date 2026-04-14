import express from 'express';
import mongoose from 'mongoose';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import { Kafka } from 'kafkajs';
import gridRoutes from './routes/grid.js';
import { SimulationEngine } from './utils/simulation.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27027/solarfetch';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Metering Service connected to MongoDB'))
    .catch(err => console.error('Metering Service MongoDB error:', err));

// TimescaleDB (Postgres) connection
const { Pool } = pg;
const pgPool = new Pool({
    connectionString: process.env.TIMESCALE_URI || 'postgres://solarfetch_user:solarfetch_secret@localhost:5432/solarfetch_telemetry'
});

// Kafka setup
const kafka = new Kafka({
    clientId: 'metering-service',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});
const producer = kafka.producer();

const startKafka = async () => {
    try {
        await producer.connect();
        console.log('Metering Service Kafka Producer connected');
    } catch (err) {
        console.error('Kafka connection error:', err);
    }
};
startKafka();

// Attach stats/engines to app for convenience (simulating old behavior)
app.set('pgPool', pgPool);
app.set('kafkaProducer', producer);

app.use('/api/grid', gridRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'metering-service' });
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    console.log(`Metering Service running on port ${PORT}`);
    
    // Start Simulation
    const simEngine = new SimulationEngine(producer, pgPool);
    simEngine.start();
});
