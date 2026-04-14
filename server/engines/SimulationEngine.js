import GridState from '../models/GridState.js';
import User from '../models/User.js';
import Usage from '../models/Usage.js';
import { runAutoAcceptForEnabledProsumers } from '../routes/market.js';
import { runArbitrageLogic } from './ArbitrageEngine.js';
import { detectFraudulentActivity } from './FraudEngine.js';

export class SimulationEngine {
    constructor(io) {
        this.io = io;
        this.intervals = [];
    }

    start() {
        console.log('Starting Simulation Engine...');
        
        // 1. Core Grid & Usage Simulation (every 3 seconds)
        const gridInterval = setInterval(async () => {
            try {
                let currentMode = 'standard';
                const state = await GridState.findOne().sort({ createdAt: -1 });
                if (state) currentMode = state.simMode;

                const payload = this._generateGridPulse(currentMode);
                this.io.emit('grid:pulse', payload);

                if (Math.random() > 0.7) {
                    this.io.emit('neighbors:discovered', this._generateNeighbor(currentMode));
                }

                // Run Phase 2 Engines
                await runArbitrageLogic(this.io);
                await detectFraudulentActivity(this.io);

                // Run Usage & Hardware Simulation
                await this._simulateUsageAndDegradation(currentMode);

            } catch (error) {
                console.error('[SimulationEngine Core Error]:', error);
            }
        }, 3000);

        // 2. Auto-Accept Scanner (every 2 minutes)
        const autoAcceptInterval = setInterval(async () => {
            try {
                await runAutoAcceptForEnabledProsumers(this.io);
            } catch (error) {
                console.error('[SimulationEngine AutoAccept Error]:', error);
            }
        }, 120000);

        this.intervals.push(gridInterval, autoAcceptInterval);
    }

    stop() {
        this.intervals.forEach(clearInterval);
        this.intervals = [];
        console.log('Simulation Engine stopped.');
    }

    _generateGridPulse(currentMode) {
        if (currentMode === 'grid-fail') {
            return {
                generation: +(120.5 + (Math.random() * 40 - 20)).toFixed(1),
                health: Math.floor(Math.random() * 20 + 30),
                activeTrades: Math.floor(Math.random() * 3 + 2),
                reason: 'GRID_INSTABILITY_DETECTED'
            };
        } else if (currentMode === 'sunset') {
            return {
                generation: +(20.5 + (Math.random() * 5)).toFixed(1),
                health: 95,
                activeTrades: Math.floor(Math.random() * 8 + 15),
                reason: 'LOW_SOLAR_REVENUE_DROP'
            };
        } else {
            return {
                generation: +(142.8 + (Math.random() * 0.4 - 0.2)).toFixed(1),
                health: 100,
                activeTrades: Math.floor(Math.random() * 5 + 10),
                reason: 'OPTIMAL_SYNTAX'
            };
        }
    }

    _generateNeighbor(currentMode) {
        return {
            id: Date.now().toString(),
            name: ['Node-99K', 'Node-33W', 'Node-85P', 'Node-41X'][Math.floor(Math.random() * 4)],
            distance: ['150m', '300m', '550m', '900m'][Math.floor(Math.random() * 4)],
            surplus: currentMode === 'sunset' ? 0.2 : +(Math.random() * 5 + 1).toFixed(1),
            price: currentMode === 'grid-fail' ? 15.50 : +(Math.random() * 5 + 5).toFixed(2),
            status: 'Discovered',
            type: ['Prosumer', 'Consumer', 'Storage'][Math.floor(Math.random() * 3)],
            trustScore: Math.floor(Math.random() * 30 + 70),
            isCertified: Math.random() > 0.4
        };
    }

    async _simulateUsageAndDegradation(currentMode) {
        try {
            // Hardware Degradation
            await User.updateMany({ role: 'prosumer' }, { $mul: { batteryCapacity: 0.99995 } });

            // Usage Simulation
            const allUsers = await User.find({ role: { $in: ['consumer', 'prosumer'] } });
            const now = new Date();
            const startOfMinute = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());

            for (const user of allUsers) {
                const alreadyHasUsage = await Usage.findOne({ user: user._id, timestamp: { $gte: startOfMinute } });
                
                if (!alreadyHasUsage) {
                    const isSunset = currentMode === 'sunset';
                    const isProsumer = user.role === 'prosumer';
                    const hour = now.getHours();
                    
                    const morningPeak = Math.exp(-Math.pow(hour - 8, 2) / 8);
                    const eveningPeak = Math.exp(-Math.pow(hour - 20, 2) / 10);
                    const baselineCons = 1.0;
                    let consVal = baselineCons + (morningPeak * 2) + (eveningPeak * 3) + (Math.random() * 0.5);

                    let genVal = 0.5 + Math.random() * 0.5;
                    if (isProsumer && hour >= 6 && hour <= 18) {
                        genVal += Math.sin((hour - 6) / 12 * Math.PI) * 8 + (Math.random() * 1);
                    }

                    if (isSunset) {
                        genVal = genVal * 0.1;
                        consVal = consVal * 1.8;
                    }

                    await Usage.create({
                        user: user._id,
                        timestamp: now,
                        consumption: +consVal.toFixed(2),
                        generation: +genVal.toFixed(2),
                        storage: isProsumer ? user.storedEnergy : 0
                    });
                }
            }
        } catch (e) {
            console.error('[UsageSim Error]:', e);
        }
    }
}
