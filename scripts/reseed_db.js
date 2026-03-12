import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI in .env');
    process.exit(1);
}

// Define Schemas for all models to clear them
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['prosumer', 'consumer', 'admin'], default: 'consumer' },
    status: { type: String, enum: ['pending', 'approved', 'suspended'], default: 'pending' },
    credits: { type: Number, default: 1000 },
    trustScore: { type: Number, default: 100 },
    isCertified: { type: Boolean, default: false },
    x: { type: Number, default: () => Math.random() * 800 },
    y: { type: Number, default: () => Math.random() * 600 },
    connectedProsumer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const GenericSchema = new mongoose.Schema({}, { strict: false });

const User = mongoose.model('User', UserSchema);
const Asset = mongoose.model('Asset', GenericSchema);
const Transaction = mongoose.model('Transaction', GenericSchema);
const Order = mongoose.model('Order', GenericSchema);
const Governance = mongoose.model('Governance', GenericSchema);
const GridState = mongoose.model('GridState', GenericSchema);

async function reseed() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Preserve Admin(s)
        const admins = await User.find({ role: 'admin' }).lean();
        console.log(`Found ${admins.length} admin(s) to preserve.`);

        // 2. Clear All Collections
        await User.deleteMany({});
        await Asset.deleteMany({});
        await Transaction.deleteMany({});
        await Order.deleteMany({});
        await Governance.deleteMany({});
        await GridState.deleteMany({});
        console.log('Cleared all collections (Users, Assets, Transactions, Orders, Governance, GridState).');

        // 3. Restore Admin(s)
        if (admins.length > 0) {
            await User.insertMany(admins);
            console.log('Restored admin(s).');
        } else {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            await User.create({
                username: 'admin',
                email: 'admin@solarfetch.io',
                password: hashedPassword,
                role: 'admin',
                status: 'approved',
                isCertified: true
            });
            console.log('Created default admin (admin/admin123).');
        }

        const salt = await bcrypt.genSalt(10);
        const defaultPassword = await bcrypt.hash('password123', salt);

        // 4. Create 3 Prosumers
        const prosumers = [];
        for (let i = 1; i <= 3; i++) {
            const username = `prosumer${i}`;
            const prosumer = await User.create({
                username,
                email: `${username}@gmail.com`,
                password: defaultPassword,
                role: 'prosumer',
                status: 'approved',
                credits: 5000,
                trustScore: 95,
                isCertified: true
            });
            prosumers.push(prosumer);
            console.log(`Created Prosumer: ${username}`);
        }

        // 5. Create 3 Consumers for each Prosumer
        let consumerCount = 1;
        for (const prosumer of prosumers) {
            for (let j = 0; j < 3; j++) {
                const username = `consumer${consumerCount}`;
                await User.create({
                    username,
                    email: `${username}@gmail.com`,
                    password: defaultPassword,
                    role: 'consumer',
                    status: 'approved',
                    credits: 1000,
                    trustScore: 100,
                    connectedProsumer: prosumer._id
                });
                console.log(`Created Consumer: ${username} (Connected to ${prosumer.username})`);
                consumerCount++;
            }
        }

        console.log('Database reseeded and fully reset with @gmail.com suffix!');
        process.exit(0);
    } catch (err) {
        console.error('Error during reseeding:', err);
        process.exit(1);
    }
}

reseed();
