import { Kafka } from 'kafkajs';
import User from '../models/User.js'; // Need to migrate User model here too or share it
import GridState from '../models/GridState.js';

export class SimulationEngine {
    constructor(producer, pgPool) {
        this.producer = producer;
        this.pgPool = pgPool;
        this.intervals = [];
    }

    async start() {
        console.log('Starting Metering Simulation Engine...');
        
        const gridInterval = setInterval(async () => {
            try {
                let currentMode = 'standard';
                const state = await GridState.findOne().sort({ createdAt: -1 });
                if (state) currentMode = state.simMode;

                const pulse = this._generateGridPulse(currentMode);
                const neighbor = Math.random() > 0.7 ? this._generateNeighbor(currentMode) : null;

                // Produce Kafka Event
                await this.producer.send({
                    topic: 'meter.reading',
                    messages: [
                        { value: JSON.stringify({ type: 'grid:pulse', data: pulse, timestamp: new Date() }) }
                    ]
                });

                if (neighbor) {
                    await this.producer.send({
                        topic: 'meter.reading',
                        messages: [
                            { value: JSON.stringify({ type: 'neighbors:discovered', data: neighbor, timestamp: new Date() }) }
                        ]
                    });
                }

                // Usage Simulation
                await this._simulateUsageAndDegradation(currentMode);

            } catch (error) {
                console.error('[SimulationEngine Error]:', error);
            }
        }, 3000);

        this.intervals.push(gridInterval);
    }

    _generateGridPulse(currentMode) {
        // Logic same as original...
        if (currentMode === 'grid-fail') {
            return { generation: +(120.5 + (Math.random() * 40 - 20)).toFixed(1), health: Math.floor(Math.random() * 20 + 30), activeTrades: 0, reason: 'GRID_INSTABILITY' };
        }
        return { generation: +(142.8 + (Math.random() * 0.4)).toFixed(1), health: 100, activeTrades: 5, reason: 'NORMAL' };
    }

    _generateNeighbor(currentMode) {
        return { id: Date.now().toString(), name: 'Node-' + Math.floor(Math.random() * 100), surplus: Math.random() * 5 };
    }

    async _simulateUsageAndDegradation(currentMode) {
        try {
            const allUsers = await User.find({ role: { $in: ['consumer', 'prosumer'] } });
            const now = new Date();

            for (const user of allUsers) {
                const consVal = 1.0 + Math.random() * 2;
                const genVal = user.role === 'prosumer' ? 5.0 + Math.random() * 5 : 0;

                // Save to TimescaleDB
                await this.pgPool.query(
                    'INSERT INTO usage_telemetry (time, user_id, consumption, generation, storage) VALUES ($1, $2, $3, $4, $5)',
                    [now, user._id.toString(), consVal, genVal, 0]
                );

                // Produce Kafka event for individual user usage (useful for trading engine)
                await this.producer.send({
                    topic: 'user.usage',
                    messages: [
                        { value: JSON.stringify({ userId: user._id.toString(), consumption: consVal, generation: genVal, timestamp: now }) }
                    ]
                });
            }
        } catch (e) {
            console.error('[UsageSim Error]:', e);
        }
    }
}
