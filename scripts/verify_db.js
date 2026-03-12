import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

const UserSchema = new mongoose.Schema({
    username: String,
    role: String,
    connectedProsumer: mongoose.Schema.Types.ObjectId
});

const User = mongoose.model('User', UserSchema);

async function verify() {
    await mongoose.connect(MONGODB_URI);
    const users = await User.find();
    console.log(`Total users: ${users.length}`);
    
    const prosumers = users.filter(u => u.role === 'prosumer');
    console.log(`Prosumers: ${prosumers.map(p => p.username).join(', ')}`);
    
    for (const p of prosumers) {
        const consumers = users.filter(u => u.connectedProsumer?.toString() === p._id.toString());
        console.log(`Consumers connected to ${p.username}: ${consumers.map(c => c.username).join(', ')}`);
    }
    
    const admins = users.filter(u => u.role === 'admin');
    console.log(`Admins: ${admins.map(a => a.username).join(', ')}`);
    
    process.exit(0);
}

verify();
