import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Transaction from '../models/Transaction.js';
import { runMatchingEngine } from '../routes/market.js';
import Governance from '../models/Governance.js';

let mongoServer;

beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    // Clear the database before each test
    await User.deleteMany({});
    await Order.deleteMany({});
    await Transaction.deleteMany({});
    await Governance.deleteMany({});
});

describe('Partial Fill Matching Engine logic', () => {

    it('should partially fill a larger sell order with a smaller buy order', async () => {
        // 1. Setup Data
        const seller = await User.create({ username: 'Seller1', email: 'seller@test.com', password: 'password', credits: 1000, trustScore: 100, isCertified: true });
        const buyer = await User.create({ username: 'Buyer1', email: 'buyer@test.com', password: 'password', credits: 1000, trustScore: 100, isCertified: true });

        const sellOrder = await Order.create({ maker: seller._id, type: 'sell', kwh: 10, remainingKwh: 10, price: 0.10 });
        const buyOrder = await Order.create({ maker: buyer._id, type: 'buy', kwh: 4, remainingKwh: 4, price: 0.10 });

        // 2. Run Matcher (pass empty req stub since we aren't testing websockets here)
        await runMatchingEngine({});

        // 3. Assertions
        const updatedSell = await Order.findById(sellOrder._id);
        const updatedBuy = await Order.findById(buyOrder._id);

        expect(updatedSell.remainingKwh).toBe(6);
        expect(updatedSell.status).toBe('PARTIAL');

        expect(updatedBuy.remainingKwh).toBe(0);
        expect(updatedBuy.status).toBe('MATCHED');

        const transactions = await Transaction.find({});
        expect(transactions.length).toBe(1);
        expect(transactions[0].amount).toBe(4);
        expect(transactions[0].price).toBe(0.10);

        const updatedSeller = await User.findById(seller._id);
        const updatedBuyer = await User.findById(buyer._id);

        expect(updatedSeller.credits).toBe(1000 + (4 * 0.10));
        expect(updatedBuyer.credits).toBe(1000 - (4 * 0.10));
    });

    it('should correctly handle multiple matches settling a large buy order', async () => {
        const seller1 = await User.create({ username: 'Seller1', email: 'seller1@test.com', password: 'password', credits: 1000 });
        const seller2 = await User.create({ username: 'Seller2', email: 'seller2@test.com', password: 'password', credits: 1000 });
        const buyer = await User.create({ username: 'Buyer1', email: 'buyer@test.com', password: 'password', credits: 1000 });

        await Order.create({ maker: seller1._id, type: 'sell', kwh: 5, remainingKwh: 5, price: 0.10 });
        await Order.create({ maker: seller2._id, type: 'sell', kwh: 5, remainingKwh: 5, price: 0.12 }); // Higher price

        const buyOrder = await Order.create({ maker: buyer._id, type: 'buy', kwh: 8, remainingKwh: 8, price: 0.15 });

        await runMatchingEngine({});

        const updatedBuy = await Order.findById(buyOrder._id);

        // It should buy 5 from seller1 @ 0.10, then 3 from seller2 @ 0.12
        expect(updatedBuy.remainingKwh).toBe(0);
        expect(updatedBuy.status).toBe('MATCHED');

        const txs = await Transaction.find({}).sort({ amount: -1 });
        expect(txs.length).toBe(2);

        // The loops match sequentially.
        const totalSpent = (5 * 0.10) + (3 * 0.12);
        const updatedBuyer = await User.findById(buyer._id);
        expect(updatedBuyer.credits).toBe(1000 - totalSpent);
    });

    it('should NOT execute matches if Governance Kill Switch is active', async () => {
        const seller = await User.create({ username: 'SellerK', email: 'sellerK@test.com', password: 'password', credits: 1000, trustScore: 100, isCertified: true });
        const buyer = await User.create({ username: 'BuyerK', email: 'buyerK@test.com', password: 'password', credits: 1000, trustScore: 100, isCertified: true });

        await Governance.create({ isTradingPaused: true });

        const sellOrder = await Order.create({ maker: seller._id, type: 'sell', kwh: 10, remainingKwh: 10, price: 0.10, status: 'PENDING' });
        const buyOrder = await Order.create({ maker: buyer._id, type: 'buy', kwh: 10, remainingKwh: 10, price: 0.15, status: 'PENDING' });

        await runMatchingEngine({});

        const txCount = await Transaction.countDocuments();
        expect(txCount).toBe(0);

        const sOrder = await Order.findById(sellOrder._id);
        expect(sOrder.status).toBe('PENDING');
    });

});
