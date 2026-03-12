import React, { useMemo } from 'react';
import { Card } from 'antd';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Activity } from 'lucide-react';

const SpatialMap: React.FC = () => {
    // Fetch all users to display as nodes
    const { data: users } = useQuery({
        queryKey: ['users:all'],
        queryFn: () => fetch('/api/users/prosumers').then(res => res.json()), // We can reuse or extend this
        refetchInterval: 10000
    });

    // Fetch recent transactions to display as energy flows
    const { data: transactions } = useQuery({
        queryKey: ['ledger:recent'],
        queryFn: () => fetch('/api/ledger').then(res => res.json()),
        refetchInterval: 5000
    });

    // Process nodes
    const nodes = useMemo(() => {
        const mockUsers = [
            { _id: 'm1', username: 'Node-Z8', role: 'prosumer', x: 150, y: 120, isCertified: true },
            { _id: 'm2', username: 'Cluster-B', role: 'consumer', x: 450, y: 80, isCertified: false },
            { _id: 'm3', username: 'Peer-44M', role: 'prosumer', x: 600, y: 280, isCertified: true },
            { _id: 'm4', username: 'Green-Base', role: 'consumer', x: 200, y: 320, isCertified: false },
            { _id: 'm5', username: 'Solar-Hub', role: 'prosumer', x: 400, y: 200, isCertified: true, isFlagged: true },
        ];

        const activeUsers = users && users.length > 0 ? users : mockUsers;
        return activeUsers.map((u: any) => ({
            id: u._id,
            username: u.username,
            role: u.role || 'prosumer',
            x: u.x || Math.random() * 700 + 50,
            y: u.y || Math.random() * 300 + 50,
            isCertified: u.isCertified,
            isFlagged: u.isFlagged
        }));
    }, [users]);

    // Process flows
    const flows = useMemo(() => {
        const mockTransactions = [
            { _id: 't1', from: 'Node-Z8', to: 'Cluster-B' },
            { _id: 't2', from: 'Solar-Hub', to: 'Green-Base' },
            { _id: 't3', from: 'Peer-44M', to: 'Solar-Hub' }
        ];

        const activeTx = transactions && transactions.length > 0 ? transactions : mockTransactions;
        return activeTx.slice(0, 10).map((tx: any) => {
            const fromNode = nodes.find((n: any) => n.id === tx.from);
            const toNode = nodes.find((n: any) => n.id === tx.to);
            if (fromNode && toNode) {
                return { from: fromNode, to: toNode, id: tx._id };
            }
            // Fallback for mock mapping if necessary
            const fromNamed = nodes.find((n: any) => n.username === tx.from);
            const toNamed = nodes.find((n: any) => n.username === tx.to);
            if (fromNamed && toNamed) {
                return { from: fromNamed, to: toNamed, id: tx._id };
            }
            return null;
        }).filter(Boolean);
    }, [transactions, nodes]);

    return (
        <Card className="glass-card-dark h-full overflow-hidden relative border-white/5" bodyStyle={{ padding: 0, height: '100%' }}>
            <div className="absolute top-4 left-6 z-10 flex flex-col gap-1">
                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] m-0 flex items-center gap-2">
                    <MapPin size={14} className="text-cyan-400" /> Regional Node Topology
                </h3>
                <div className="text-[9px] text-muted font-bold uppercase tracking-widest flex items-center gap-2">
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Consumer</span>
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" /> Prosumer</span>
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" /> Live Flow</span>
                </div>
            </div>

            <svg width="100%" height="100%" viewBox="0 0 800 400" className="bg-[#04070a]/50">
                <defs>
                    <filter id="nodeGlow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(0, 229, 255, 0)" />
                        <stop offset="50%" stopColor="rgba(0, 229, 255, 1)" />
                        <stop offset="100%" stopColor="rgba(0, 229, 255, 0)" />
                    </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[...Array(10)].map((_, i) => (
                    <line key={`v-${i}`} x1={i * 80} y1="0" x2={i * 80} y2="400" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                ))}
                {[...Array(5)].map((_, i) => (
                    <line key={`h-${i}`} x1="0" y1={i * 80} x2="800" y2={i * 80} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                ))}

                {/* Flow Lines */}
                {flows.map((flow: any) => (
                    <g key={flow.id}>
                        <line 
                            x1={flow.from.x} y1={flow.from.y} 
                            x2={flow.to.x} y2={flow.to.y} 
                            stroke="rgba(0, 229, 255, 0.1)" 
                            strokeWidth="1" 
                            strokeDasharray="4 4"
                        />
                        <motion.circle
                            r="3"
                            fill="#00e5ff"
                            filter="url(#nodeGlow)"
                            animate={{
                                cx: [flow.from.x, flow.to.x],
                                cy: [flow.from.y, flow.to.y],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                        />
                    </g>
                ))}

                {/* Nodes */}
                {nodes.map((node: any) => (
                    <g key={node.id} className="cursor-pointer group">
                        <motion.circle
                            cx={node.x}
                            cy={node.y}
                            r={node.isFlagged ? "8" : "6"}
                            fill={node.isFlagged ? '#ff3b6a' : (node.role === 'prosumer' ? '#00ff88' : '#00e5ff')}
                            fillOpacity={node.isFlagged ? "0.4" : "0.2"}
                            stroke={node.isFlagged ? '#ff3b6a' : (node.role === 'prosumer' ? '#00ff88' : '#00e5ff')}
                            strokeWidth={node.isFlagged ? "3" : "2"}
                            animate={node.isFlagged ? { r: [8, 12, 8], opacity: [0.5, 1, 0.5] } : {}}
                            transition={node.isFlagged ? { duration: 1, repeat: Infinity } : {}}
                            whileHover={{ scale: 1.5, strokeWidth: 3 }}
                        />
                        <circle cx={node.x} cy={node.y} r="2" fill="white" />
                        
                        {/* Node Label */}
                        <text
                            x={node.x}
                            y={node.y - 12}
                            textAnchor="middle"
                            className="text-[10px] fill-white/70 font-black uppercase tracking-tighter pointer-events-none"
                            style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,1))' }}
                        >
                            {node.username}
                        </text>
                        {node.isCertified && (
                           <path 
                                d={`M ${node.x + 8} ${node.y - 8} l 4 4 l 8 -8`} 
                                fill="none" 
                                stroke="#00ff88" 
                                strokeWidth="2" 
                                className="opacity-70"
                           />
                        )}
                    </g>
                ))}
            </svg>

            <div className="absolute bottom-4 right-6 text-right">
                <div className="flex items-center gap-2 justify-end">
                    <Activity size={12} className="text-cyan-400 animate-pulse" />
                    <span className="text-[9px] text-white font-black uppercase tracking-widest">Topology Sync: Active</span>
                </div>
            </div>
        </Card>
    );
};

export default SpatialMap;
