import React, { useEffect, useState } from 'react';
import { Card, Badge } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../contexts/SocketContext';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { formatTimeIST } from '../utils/indiaFormat';

interface LiveBid {
    id: string;
    type: 'Bid' | 'Ask' | 'Match';
    price: number;
    volume: number;
    time: string;
}

const LiveBidding: React.FC = () => {
    const { settings } = useSettings();
    const [bids, setBids] = useState<LiveBid[]>([]);
    const { socket } = useSocket();

    // Fetch initial trades from ledger
    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const res = await fetch('/api/ledger');
                if (!res.ok) throw new Error('Failed to fetch ledger');
                const data = await res.json();
                const initialBids = data.slice(0, 5).map((tx: any) => ({
                    id: tx._id,
                    type: (tx.provenance === 'P2P_GRID_SETTLEMENT' ? 'Match' : 'Ask') as 'Bid' | 'Ask' | 'Match',
                    price: tx.price,
                    volume: tx.amount,
                    time: formatTimeIST(tx.timestamp)
                }));
                setBids(initialBids);
            } catch (err) {
                console.error('Failed to load initial bidding data:', err);
            }
        };
        fetchInitial();
    }, []);

    useEffect(() => {
        // Fallback simulation for Demo if socket is disconnected
        const demoInterval = setInterval(() => {
            if (!socket?.connected) {
                const types: ('Bid' | 'Ask' | 'Match')[] = ['Bid', 'Ask', 'Match'];
                const type = types[Math.floor(Math.random() * types.length)];
                setBids(prev => [
                    {
                        id: Math.random().toString(36).substring(7),
                        type,
                        price: 10 + Math.random() * 5,
                        volume: 10 + Math.random() * 100,
                        time: formatTimeIST()
                    },
                    ...prev
                ].slice(0, 10));
            }
        }, 8000);

        if (!socket) return () => clearInterval(demoInterval);

        const handleNewOrder = (data: any) => {
            const nextType = data.type as 'Bid' | 'Ask' | 'Match';
            setBids(prev => [
                {
                    id: Math.random().toString().substring(2, 9),
                    type: nextType,
                    price: data.price,
                    volume: data.volume,
                    time: data.time
                },
                ...prev
            ].slice(0, 10));
        };

        const handleMatch = (data: any) => {
            setBids(prev => [
                {
                    id: data.txid,
                    type: 'Match' as const,
                    price: data.price,
                    volume: data.volume,
                    time: data.time
                },
                ...prev
            ].slice(0, 10));
        };

        socket.on('market:newOrder', handleNewOrder);
        socket.on('market:orderComplete', handleMatch);

        return () => {
            socket.off('market:newOrder', handleNewOrder);
            socket.off('market:orderComplete', handleMatch);
        };
    }, [socket]);

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
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bid.type === 'Ask' ? 'bg-red-500/10' : bid.type === 'Bid' ? 'bg-[#00ff88]/10' : 'bg-cyan-500/10'}`}>
                                        {bid.type === 'Ask' ? <TrendingDown size={18} className="text-red-400" /> : bid.type === 'Bid' ? <TrendingUp size={18} className="neon-text-green" /> : <span className="text-cyan-400 text-xs font-bold">M</span>}
                                    </div>
                                    <div className="py-1 flex flex-col items-start gap-1">
                                        <div className={`text-sm font-bold leading-none ${bid.type === 'Ask' ? 'text-red-400' : bid.type === 'Bid' ? 'neon-text-green' : 'text-cyan-400'}`}>
                                            {settings.currency}{bid.price.toFixed(2)}
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded leading-none ${bid.type === 'Bid' ? 'bg-[#00e5ff]/10 text-[#00e5ff]' : bid.type === 'Ask' ? 'bg-[#ff3366]/10 text-[#ff3366]' : 'bg-[#00ff88]/10 text-[#00ff88]'}`}>
                                            {bid.type}
                                        </span>
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
                    <div className="text-sm neon-text-cyan font-bold font-mono">0.02 {settings.currency}/kWh</div>
                </div>
            </div>
        </Card>
    );
};

export default LiveBidding;
