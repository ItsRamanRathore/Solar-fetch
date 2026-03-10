import React, { useState, useEffect } from 'react';
import { Card, List, Tag, Button } from 'antd';
import { MapPin, User, ArrowRight, Star, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSocket } from '../contexts/SocketContext';

interface Neighbor {
    id: string;
    name: string;
    distance: string;
    surplus: number;
    price: number;
    status: string;
    type: string;
    trustScore: number;
    isCertified: boolean;
}

const NeighborDiscovery: React.FC = () => {
    const [neighbors, setNeighbors] = useState<Neighbor[]>([]);
    const { socket } = useSocket();

    useEffect(() => {
        if (!socket) return;

        const handleDiscovery = (data: Neighbor) => {
            setNeighbors(prev => [data, ...prev].slice(0, 8)); // Keep only the latest 8 discoveries
        };

        socket.on('neighbors:discovered', handleDiscovery);

        return () => {
            socket.off('neighbors:discovered', handleDiscovery);
        };
    }, [socket]);

    return (
        <Card className="glass-card mb-8">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold m-0 flex items-center gap-3">
                    <MapPin size={22} className="text-[#00ff88]" />
                    Nearby P2P Neighbors
                </h3>
                <Tag className="tag-verified">Scan Active</Tag>
            </div>

            <List
                dataSource={neighbors}
                renderItem={(item) => (
                    <motion.div
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-4 bg-white/5 rounded-xl border border-white/5 mb-3 flex items-center justify-between hover:bg-white/10 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.isCertified ? 'bg-[#00e5ff]/10 text-[#00e5ff]' : 'bg-white/5 text-muted'}`}>
                                {item.isCertified ? <Star size={20} fill="currentColor" /> : <User size={20} />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className="text-sm font-bold text-white uppercase tracking-tighter">{item.name}</div>
                                    {item.trustScore > 90 && <Tag color="gold" className="m-0 text-[8px] border-none px-1 font-black">Top Peer</Tag>}
                                </div>
                                <div className="text-[10px] text-muted font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                                    {item.distance} away •
                                    <span className="text-[#00ff88]">Score: {item.trustScore}%</span>
                                    {item.type === 'Prosumer' && <Globe size={10} className="text-[#00e5ff]" />}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <div className="text-[10px] text-muted font-bold uppercase tracking-widest leading-none">Yield</div>
                                <div className="text-sm font-black text-white">{item.surplus} kWh</div>
                            </div>
                            <Button type="text" className="text-muted group-hover:text-[#00ff88] p-1">
                                <ArrowRight size={18} />
                            </Button>
                        </div>
                    </motion.div>
                )}
            />
        </Card>
    );
};

export default NeighborDiscovery;
