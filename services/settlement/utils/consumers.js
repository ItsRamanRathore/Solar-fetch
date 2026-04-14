import Transaction from '../models/Transaction.js';

export const setupKafkaConsumers = async (kafka) => {
    const consumer = kafka.consumer({ groupId: 'settlement-group' });

    await consumer.connect();
    await consumer.subscribe({ topic: 'trade.created', fromBeginning: true });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const trade = JSON.parse(message.value.toString());
            
            try {
                // Save to Ledger (MongoDB Transaction collection)
                await Transaction.create({
                    txid: trade.txid,
                    from: trade.sellerId,
                    to: trade.buyerId,
                    amount: trade.kwh,
                    price: trade.price,
                    settlementTotal: trade.total,
                    hash: trade.hash || 'GEN-SHA256-REF',
                    provenance: trade.provenance || 'SolarFetch-VPP',
                    status: 'SETTLED',
                    timestamp: new Date()
                });
                console.log(`[Settlement] Trade finalized: ${trade.txid}`);
            } catch (err) {
                console.error('[Settlement Error]:', err);
            }
        },
    });

    console.log('Settlement Service Kafka Consumers active');
};
