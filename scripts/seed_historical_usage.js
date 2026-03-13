import mongoose from 'mongoose';
import User from '../server/models/User.js';
import Usage from '../server/models/Usage.js';

const SEED_HOURS = 24;

async function seedHistoricalUsage() {
    try {
        await mongoose.connect('mongodb://localhost/solarfetch');
        console.log('Connected to MongoDB for historical seeding...');

        const users = await User.find({ role: { $in: ['consumer', 'prosumer'] } });
        const now = new Date();

        for (const user of users) {
            console.log(`Seeding usage for ${user.username}...`);
            for (let i = 1; i <= SEED_HOURS; i++) {
                const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
                const hour = timestamp.getHours();
                
                // Diurnal logic
                const morningPeak = Math.exp(-Math.pow(hour - 8, 2) / 8);
                const eveningPeak = Math.exp(-Math.pow(hour - 20, 2) / 10);
                const baselineCons = 1.0;
                let consVal = baselineCons + (morningPeak * 2) + (eveningPeak * 3) + (Math.random() * 0.5);

                let genVal = 0;
                if (user.role === 'prosumer' && hour >= 6 && hour <= 18) {
                    genVal = Math.sin((hour - 6) / 12 * Math.PI) * 8 + (Math.random() * 1);
                }

                await Usage.create({
                    user: user._id,
                    timestamp,
                    consumption: +consVal.toFixed(2),
                    generation: +genVal.toFixed(2),
                    storage: user.role === 'prosumer' ? 50 : 0
                });
            }
        }

        console.log('Historical usage seeding complete!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
}

seedHistoricalUsage();
