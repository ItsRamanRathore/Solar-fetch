import React, { useEffect, useState } from 'react';
import { Card, Badge } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

const LiveBidding: React.FC = () => {
    const [bids, setBids] = useState<{ id: number, type: string, price: number, volume: number, time: string }[]>([
        { id: 1, type: 'Bid', price: 0.12, volume: 5.4, time: '22:42:10' },
        { id: 2, type: 'Ask', price: 0.15, volume: 2.1, time: '22:42:08' },
        { id: 3, type: 'Bid', price: 0.11, volume: 8.0, time: '22:42:05' },
        { id: 4, type: 'Ask', price: 0.14, volume: 3.5, time: '22:42:02' },
        { id: 5, type: 'Bid', price: 0.13, volume: 1.2, time: '22:41:58' },
    ]);

    useEffect(() => {
        const interval = setInterval(() => {
            const isAsk = Math.random() > 0.5;
            const priceValue = parseFloat((0.10 + Math.random() * 0.10).toFixed(2));
            const volumeValue = parseFloat((Math.random() * 10).toFixed(1));
            const newBid = {
                id: Date.now(),
                type: isAsk ? 'Ask' : 'Bid',
                price: priceValue,
                volume: volumeValue,
                time: new Date().toLocaleTimeString('en-GB', { hour12: false }),
            };
            setBids(prev => [newBid, ...prev.slice(0, 9)]);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Card className="glass-card h-full flex flex-col" bodyStyle={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="p-4 pb-1">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-base font-bold font-['Outfit'] m-0">Live Energy Bidding</h3>
                    <Badge status="processing" color="#00ff88" text={<span className="text-[10px] uppercase font-bold text-muted">Market Open</span>} />
                </div>
                <div className="flex justify-between items-center text-[9px] text-muted font-bold uppercase tracking-widest px-2 mb-1">
                    <span>Type / Price</span>
                    <span>Volume (kWh) / Time</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
                <div className="space-y-2 pb-20">
                    <AnimatePresence initial={false}>
                        {bids.map((bid) => (
                            <motion.div
                                key={bid.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className={`flex justify-between items-center p-2.5 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bid.type === 'Ask' ? 'bg-red-500/10' : 'bg-[#00ff88]/10'}`}>
                                        {bid.type === 'Ask' ? <TrendingDown size={18} className="text-red-400" /> : <TrendingUp size={18} className="neon-text-green" />}
                                    </div>
                                    <div className="py-1">
                                        <div className={`text-sm font-bold ${bid.type === 'Ask' ? 'text-red-400' : 'neon-text-green'}`}>
                                            ${bid.price.toFixed(2)}
                                        </div>
                                        <div className="text-[10px] text-muted uppercase font-bold tracking-tighter">{bid.type}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-['Outfit'] font-bold text-slate-200">{bid.volume.toFixed(1)}</div>
                                    <div className="text-[9px] text-muted font-medium">{bid.time}</div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            <div className="mt-auto p-4 bg-[rgba(15,23,42,0.6)] border-t border-white/5 rounded-b-3xl">
                <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5 shadow-inner">
                    <div className="text-[10px] text-muted font-bold uppercase tracking-wider">Spread</div>
                    <div className="text-sm neon-text-cyan font-bold font-mono">0.02 USD/kWh</div>
                </div>
            </div>
        </Card>
    );
};

export default LiveBidding;
