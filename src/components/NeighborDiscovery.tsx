import React, { useEffect } from 'react';
import { Card, List, Tag, Button, message } from 'antd';
import { MapPin, User, ArrowRight, Star, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useSocket } from '../contexts/SocketContext';

const NeighborDiscovery: React.FC = () => {

    const { data: neighborsList } = useQuery({
        queryKey: ['neighbors:discovery'],
        queryFn: () => fetch('/api/users/prosumers').then(res => res.json()),
        refetchInterval: 10000
    });

    const neighbors = (neighborsList || []).map((u: any) => {
        const isConsumer = u.role === 'consumer';
        const connectedProsumer = neighborsList?.find((p: any) => p._id === u.connectedProsumer);
        
        return {
            id: u._id,
            name: u.username,
            distance: `${Math.floor(Math.random() * 400 + 100)}m`,
            surplus: u.credits > 100 ? (u.credits / 10).toFixed(1) : 0,
            price: 11.5,
            status: 'active',
            type: u.role === 'prosumer' ? 'Prosumer' : 'Consumer',
            trustScore: u.trustScore || 90,
            isCertified: u.isCertified,
            connection: isConsumer && connectedProsumer ? `Linked to ${connectedProsumer.username}` : null
        };
    });

    const { socket } = useSocket();

    useEffect(() => {
        if (!socket) return;

        const handleDiscovery = () => {
             // We can trigger an invalidation if we want live discovery feedback via sockets
             // queryClient.invalidateQueries(['neighbors:discovery'])
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

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                <List
                    dataSource={neighbors}
                    renderItem={(item: any) => (
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
                                        {item.connection && <span className="text-cyan-400 opacity-60 ml-2 border border-cyan-400/20 px-1 rounded">{item.connection}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <div className="text-[10px] text-muted font-bold uppercase tracking-widest leading-none">Yield</div>
                                    <div className="text-sm font-black text-white">{item.surplus} kWh</div>
                                </div>
                                <Button 
                                    type="text" 
                                    className="text-muted group-hover:text-[#00ff88] p-1"
                                    onClick={() => message.success(`Encrypted Bridge Established with ${item.name}`)}
                                >
                                    <ArrowRight size={18} />
                                </Button>
                            </div>
                        </motion.div>
                    )}
                />
            </div>
        </Card>
    );
};

export default NeighborDiscovery;
