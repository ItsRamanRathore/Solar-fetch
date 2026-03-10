import React, { useState, useEffect } from 'react';
import { Card, List, Tag, Button } from 'antd';
import { MapPin, User, ArrowRight, Star, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

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
    const [neighbors, setNeighbors] = useState<Neighbor[]>([
        { id: '1', name: 'Node-77X', distance: '120m', surplus: 4.2, price: 0.11, status: 'Nearby', type: 'Prosumer', trustScore: 98, isCertified: true },
        { id: '2', name: 'Node-21B', distance: '450m', surplus: 2.1, price: 0.13, status: 'Nearby', type: 'Consumer', trustScore: 82, isCertified: false },
        { id: '3', name: 'Node-09S', distance: '820m', surplus: 10.5, price: 0.09, status: 'District', type: 'Storage', trustScore: 95, isCertified: true },
    ]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.7) {
                const names = ['Node-99K', 'Node-33W', 'Node-85P', 'Node-41X'];
                const distances = ['150m', '300m', '550m', '900m'];
                const types = ['Prosumer', 'Consumer', 'Storage'];
                const isCert = Math.random() > 0.4;
                const newNeighbor = {
                    id: Date.now().toString(),
                    name: names[Math.floor(Math.random() * names.length)],
                    distance: distances[Math.floor(Math.random() * distances.length)],
                    surplus: +(Math.random() * 5 + 1).toFixed(1),
                    price: +(Math.random() * 0.05 + 0.09).toFixed(2),
                    status: 'Discovered',
                    type: types[Math.floor(Math.random() * types.length)],
                    trustScore: Math.floor(Math.random() * 30 + 70),
                    isCertified: isCert
                };
                setNeighbors(prev => [newNeighbor, ...prev.slice(0, 3)]);
            }
        }, 8000);
        return () => clearInterval(interval);
    }, []);

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
