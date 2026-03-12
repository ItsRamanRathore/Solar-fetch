import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../server/models/User.js';
import Usage from '../server/models/Usage.js';
import Transaction from '../server/models/Transaction.js';
import crypto from 'crypto';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/solar-fetch';

const seedHistory = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({ role: { $in: ['prosumer', 'consumer'] } });
        console.log(`Found ${users.length} users to seed data for.`);

        // Clear existing history to avoid duplicates
        await Usage.deleteMany({});
        // Optional: clear transactions if you want a complete reset of the ledger too
        // await Transaction.deleteMany({ status: 'SETTLED' }); // Be careful if you want to keep real trades

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const usageRecords = [];
        const transactionRecords = [];

        for (const user of users) {
            console.log(`Generating data for ${user.username}...`);
            
            for (let d = 0; d < 30; d++) {
                for (let h = 0; h < 24; h++) {
                    const timestamp = new Date(thirtyDaysAgo.getTime() + (d * 24 + h) * 60 * 60 * 1000);
                    
                    let consumption = 0;
                    let generation = 0;

                    // Realistic Household Consumption Curve
                    // Peak at 7-9am and 6-10pm
                    if ((h >= 7 && h <= 9) || (h >= 18 && h <= 22)) {
                        consumption = 2 + Math.random() * 4; // 2-6 kWh
                    } else if (h >= 0 && h <= 5) {
                        consumption = 0.5 + Math.random() * 1; // 0.5-1.5 kWh (Base load)
                    } else {
                        consumption = 1 + Math.random() * 2; // 1-3 kWh
                    }

                    // Variation per user
                    const userFactor = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
                    consumption *= userFactor;

                    if (user.role === 'prosumer') {
                        // Solar Generation Curve
                        // Peak at 12-2pm
                        if (h >= 6 && h <= 18) {
                            // Sinusoidal curve peak at 12
                            const x = (h - 6) / 12; // 0 to 1
                            generation = Math.sin(x * Math.PI) * (15 + Math.random() * 5); // 15-20 peak
                        } else {
                            generation = 0;
                        }
                    }

                    usageRecords.push({
                        user: user._id,
                        timestamp,
                        consumption: parseFloat(consumption.toFixed(2)),
                        generation: parseFloat(generation.toFixed(2)),
                        storage: user.role === 'prosumer' ? 20 + Math.random() * 30 : 0
                    });

                    // Create matching transactions for consumers buying from their prosumer
                    if (user.role === 'consumer' && user.connectedProsumer) {
                        const amount = consumption * 0.9; // Assume 90% is bought from P2P
                        const price = 12 + Math.random() * 4;
                        const txid = crypto.randomBytes(8).toString('hex').toUpperCase();
                        
                        transactionRecords.push({
                            txid: `TX-${txid}`,
                            from: user.connectedProsumer.toString(),
                            to: user._id.toString(),
                            amount: parseFloat(amount.toFixed(2)),
                            price: parseFloat(price.toFixed(2)),
                            settlementTotal: parseFloat((amount * price).toFixed(2)),
                            hash: crypto.createHash('sha256').update(txid).digest('hex'),
                            provenance: 'P2P_GRID_SETTLEMENT',
                            greenHash: crypto.randomBytes(12).toString('hex'),
                            timestamp,
                            status: 'SETTLED'
                        });
                    }
                }
            }
        }

        console.log(`Inserting ${usageRecords.length} usage records...`);
        await Usage.insertMany(usageRecords);

        console.log(`Inserting ${transactionRecords.length} transactions...`);
        // Batch inserting transactions for performance
        const batchSize = 1000;
        for (let i = 0; i < transactionRecords.length; i += batchSize) {
            await Transaction.insertMany(transactionRecords.slice(i, i + batchSize));
            console.log(`Progress: ${Math.min(i + batchSize, transactionRecords.length)}/${transactionRecords.length}`);
        }

        console.log('Seeding complete!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding data:', err);
        process.exit(1);
    }
};

seedHistory();
