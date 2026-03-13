import React, { useMemo } from 'react';
import { Card } from 'antd';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Activity } from 'lucide-react';

interface SpatialMapProps {
    userRole?: 'prosumer' | 'consumer' | 'admin';
}

const SpatialMap: React.FC<SpatialMapProps> = ({ userRole = 'admin' }) => {
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
        const activeUsers = users && users.length > 0 ? users : [];
        return activeUsers.map((u: any, idx: number) => {
            // Use deterministic grid positioning if x/y not in DB
            const col = idx % 5;
            const row = Math.floor(idx / 5);
            return {
                id: u._id,
                username: u.username,
                role: u.role || 'prosumer',
                // Map to a 800x400 SVG space
                x: u.x || (150 + col * 130 + (row % 2 === 0 ? 0 : 40)),
                y: u.y || (100 + row * 100),
                isCertified: u.isCertified,
                isFlagged: u.isFlagged,
                credits: u.credits || 0
            };
        });
    }, [users]);

    // Process flows
    const flows = useMemo(() => {

        const activeTx = transactions && transactions.length > 0 ? transactions : [];
        return activeTx.slice(0, 15).map((tx: any) => {
            const fromNode = nodes.find((n: any) => n.id === tx.from || n.username === tx.from);
            const toNode = nodes.find((n: any) => n.id === tx.to || n.username === tx.to);
            if (fromNode && toNode) {
                return { from: fromNode, to: toNode, id: tx._id, amount: tx.amount };
            }
            return null;
        }).filter(Boolean);
    }, [transactions, nodes]);

    // Process nodes based on role permissions
    const displayNodes = useMemo(() => {
        let n = nodes;
        
        if (userRole === 'consumer') {
            // Consumer only sees supply nodes (Prosumers) and price, no other consumers
            n = nodes.filter((n: any) => n.role === 'prosumer').map((n: any, i: number) => ({
                ...n,
                username: `Supply Node ${i+1} (${(Math.random() * 5 + 10).toFixed(1)} ¢/kWh)` // Mock price
            }));
        } else if (userRole === 'prosumer') {
            // Prosumer sees local cluster and anonymized buyer heatmap
            n = nodes.map((n: any) => ({
                ...n,
                username: n.role === 'consumer' ? 'Masked Demand' : n.username
            }));
        }

        return n;
    }, [nodes, userRole]);

    // Process flows based on role permissions
    const displayFlows = useMemo(() => {
        if (userRole === 'consumer') return []; // Consumers don't see internal wiring
        return flows;
    }, [flows, userRole]);

    const titleText = userRole === 'admin' ? 'Regional Node Topology' 
                    : userRole === 'prosumer' ? 'Local Network Health & Buyer Heatmap' 
                    : 'Grid Supply Map';

    return (
        <Card className="glass-card-dark h-full overflow-hidden relative border-white/5" bodyStyle={{ padding: 0, height: '100%' }}>
            <div className="absolute top-4 left-6 z-10 flex flex-col gap-1">
                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] m-0 flex items-center gap-2">
                    <MapPin size={14} className="text-cyan-400" /> {titleText}
                </h3>
                <div className="text-[9px] text-muted font-bold uppercase tracking-widest flex items-center gap-2">
                    {userRole !== 'consumer' && <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Consumer Demand</span>}
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" /> {userRole === 'consumer' ? 'Supply Node' : 'Prosumer'}</span>
                    {userRole !== 'consumer' && <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" /> Live Flow</span>}
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
                {displayFlows.map((flow: any) => (
                    <g key={flow.id}>
                        <motion.path
                            d={`M ${flow.from.x} ${flow.from.y} Q ${(flow.from.x + flow.to.x) / 2} ${(flow.from.y + flow.to.y) / 2 - 20} ${flow.to.x} ${flow.to.y}`}
                            stroke="url(#flowGradient)"
                            strokeWidth="2"
                            fill="none"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 0.3 }}
                            transition={{ duration: 1.5 }}
                        />
                        <motion.circle
                            r="2.5"
                            fill="#00e5ff"
                            filter="url(#nodeGlow)"
                            animate={{
                                offsetDistance: ["0%", "100%"]
                            }}
                            style={{
                                offsetPath: `path("M ${flow.from.x} ${flow.from.y} Q ${(flow.from.x + flow.to.x) / 2} ${(flow.from.y + flow.to.y) / 2 - 20} ${flow.to.x} ${flow.to.y}")`,
                                position: 'absolute'
                            }}
                            transition={{
                                duration: 2.5,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                        />
                    </g>
                ))}

                {/* Nodes */}
                {displayNodes.map((node: any) => (
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
