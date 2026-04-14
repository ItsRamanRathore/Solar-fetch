import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod'; // Need to make sure zod is in package.json
import User from '../models/User.js';

const router = express.Router();

const isProd = process.env.NODE_ENV === 'production';
const cookieOptions = {
    httpOnly: true,
    maxAge: 3 * 24 * 60 * 60 * 1000,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
};

const registerSchema = z.object({
    username: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['prosumer', 'consumer', 'admin']).optional(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'super-secret-solar-key', {
        expiresIn: '3d'
    });
};

router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role } = registerSchema.parse(req.body);

        const exists = await User.findOne({ $or: [{ email }, { username }] });
        if (exists) {
            return res.status(400).json({ error: 'Email or username already in use' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            role: role || 'consumer',
            status: role === 'admin' ? 'approved' : 'pending',
            credits: 10000,
            trustScore: 100,
            isCertified: role === 'admin'
        });

        const token = createToken(user._id);
        res.cookie('jwt', token, cookieOptions);

        res.status(201).json({ user: { id: user._id, username: user.username, email: user.email, role: user.role, status: user.status } });
    } catch (err) {
        console.error('Register error:', err);
        if (err?.name === 'ZodError') {
            res.status(400).json({ error: err.issues || err.message });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ error: 'Invalid login credentials' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).json({ error: 'Invalid login credentials' });
        }

        const token = createToken(user._id);
        res.cookie('jwt', token, cookieOptions);

        res.json({ user: { id: user._id, username: user.username, email: user.email, role: user.role, status: user.status, credits: user.credits, trustScore: user.trustScore, isCertified: user.isCertified } });
    } catch (err) {
        console.error('Login error:', err);
        if (err?.name === 'ZodError') {
            res.status(400).json({ error: err.issues || err.message });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

router.post('/logout', (req, res) => {
    res.cookie('jwt', '', { ...cookieOptions, maxAge: 1 });
    res.status(200).json({ message: 'Logged out successfully' });
});

// Middleware for auth inside this service
const internalRequireAuth = async (req, res, next) => {
    const token = req.cookies.jwt;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-solar-key');
            req.user = await User.findById(decoded.id).select('-password');
            next();
        } catch (err) {
            res.status(401).json({ error: 'Unauthenticated' });
        }
    } else {
        res.status(401).json({ error: 'Unauthenticated' });
    }
};

router.get('/me', internalRequireAuth, (req, res) => {
    res.json(req.user);
});

export default router;
