import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const UserSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: { type: String, select: true },
    role: String,
}, { strict: false });

const User = mongoose.model('User', UserSchema);

async function debug() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const admins = await User.find({ role: 'admin' }).lean();
        console.log(`Found ${admins.length} admins.`);

        for (const admin of admins) {
            console.log(`- Username: ${admin.username}, Email: ${admin.email}`);
            const isMatch = await bcrypt.compare('admin123', admin.password);
            console.log(`  Password 'admin123' match: ${isMatch}`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
