import { runArbitrageLogic } from '../engines/ArbitrageEngine.js';
import { detectFraudulentActivity } from '../engines/FraudEngine.js';

export const setupKafkaConsumers = async (kafka, io) => {
    const consumer = kafka.consumer({ groupId: 'trading-group' });

    await consumer.connect();
    await consumer.subscribe({ topic: 'meter.reading', fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const payload = JSON.parse(message.value.toString());
            
            // 1. Relay to Frontend via Socket.io
            if (payload.type === 'grid:pulse') {
                io.emit('grid:pulse', payload.data);
            } else if (payload.type === 'neighbors:discovered') {
                io.emit('neighbors:discovered', payload.data);
            }

            // 2. Trigger Arbitrage & Fraud logic
            // In the original monolith, these were run every 3 seconds inside the loop.
            // In microservices, we trigger them on every grid pulse (or every N pulses).
            if (payload.type === 'grid:pulse') {
                await runArbitrageLogic(io);
                await detectFraudulentActivity(io);
            }
        },
    });

    console.log('Trading Service Kafka Consumers active');
};
