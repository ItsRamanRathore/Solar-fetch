import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI in .env');
    process.exit(1);
}

// Minimal User Schema
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['prosumer', 'consumer', 'admin'], default: 'consumer' },
    status: { type: String, enum: ['pending', 'approved', 'suspended'], default: 'pending' },
    isCertified: { type: Boolean, default: false }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

async function createAdmin() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const existing = await User.findOne({ email: 'admin@gmail.com' });
        if (existing) {
            console.log('Admin user with email admin@gmail.com already exists.');
            process.exit(0);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        await User.create({
            username: 'admin',
            email: 'admin@gmail.com',
            password: hashedPassword,
            role: 'admin',
            status: 'approved',
            isCertified: true
        });

        console.log('Successfully created admin user:');
        console.log('- Email: admin@gmail.com');
        console.log('- Password: admin123');

        process.exit(0);
    } catch (err) {
        console.error('Error creating admin user:', err);
        process.exit(1);
    }
}

createAdmin();
