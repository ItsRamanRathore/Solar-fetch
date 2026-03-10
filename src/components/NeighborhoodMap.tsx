import React from 'react';
import { Card } from 'antd';
import { motion } from 'framer-motion';

const NeighborhoodMap: React.FC = () => {
    const houses = [
        { id: 1, x: 100, y: 100, label: 'PEER-77X', type: 'Prosumer', status: 'active' },
        { id: 2, x: 300, y: 80, label: 'PEER-21B', type: 'Consumer', status: 'active' },
        { id: 3, x: 500, y: 120, label: 'PEER-09S', type: 'Storage', status: 'charging' },
        { id: 4, x: 150, y: 280, label: 'PEER-44M', type: 'Prosumer', status: 'discovered' },
        { id: 5, x: 450, y: 300, label: 'PEER-12Z', type: 'Consumer', status: 'standby' },
        { id: 6, x: 650, y: 200, label: 'GRID-NODE', type: 'Central', status: 'active' },
    ];

    const connections = [
        { from: 1, to: 2, status: 'active', flow: 'out' },
        { from: 4, to: 2, status: 'active', flow: 'out' },
        { from: 1, to: 3, status: 'charging', flow: 'out' },
        { from: 3, to: 5, status: 'discharging', flow: 'in' },
        { from: 6, to: 4, status: 'standby', flow: 'none' },
    ];

    return (
        <Card className="glass-card h-full overflow-hidden relative" bodyStyle={{ padding: 0, height: '100%' }}>
            <div className="absolute top-4 left-6 z-10">
                <h3 className="text-lg font-bold font-['Outfit'] m-0">Live Energy Topology</h3>
                <div className="flex gap-4 mt-1">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#00ff88]" />
                        <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">Generation</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#00e5ff]" />
                        <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">Consumption</span>
                    </div>
                </div>
            </div>

            <svg width="100%" height="100%" viewBox="0 0 800 400" className="bg-[#04070a]/30">
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Connection Lines */}
                {connections.map((conn, idx) => {
                    const fromHouse = houses.find(h => h.id === conn.from)!;
                    const toHouse = houses.find(h => h.id === conn.to)!;

                    return (
                        <g key={`conn-${idx}`}>
                            <line
                                x1={fromHouse.x}
                                y1={fromHouse.y}
                                x2={toHouse.x}
                                y2={toHouse.y}
                                stroke="rgba(255, 255, 255, 0.05)"
                                strokeWidth="2"
                            />
                            {conn.status !== 'standby' && (
                                <motion.circle
                                    r="3"
                                    fill={conn.flow === 'out' ? '#00ff88' : '#00e5ff'}
                                    filter="url(#glow)"
                                    initial={{ offset: 0 }}
                                    animate={{
                                        cx: [fromHouse.x, toHouse.x],
                                        cy: [fromHouse.y, toHouse.y],
                                    }}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        ease: "linear",
                                        delay: idx * 0.5
                                    }}
                                />
                            )}
                        </g>
                    );
                })}

                {/* Houses/Nodes */}
                {houses.map((house) => (
                    <g key={house.id} className="cursor-pointer group">
                        <motion.rect
                            x={house.x - 20}
                            y={house.y - 15}
                            width="40"
                            height="30"
                            rx="4"
                            fill={house.type === 'Central' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(30, 41, 59, 0.6)'}
                            stroke={house.type === 'Central' ? '#8b5cf6' : house.status === 'discovered' ? '#00ff88' : 'rgba(255, 255, 255, 0.1)'}
                            strokeWidth={house.status === 'discovered' ? 2 : 1}
                            whileHover={{ scale: 1.1, fill: 'rgba(255, 255, 255, 0.1)' }}
                            animate={house.status === 'discovered' ? {
                                strokeOpacity: [0.2, 1, 0.2],
                                scale: [1, 1.05, 1]
                            } : {}}
                            transition={house.status === 'discovered' ? {
                                duration: 2,
                                repeat: Infinity
                            } : {}}
                        />
                        {/* House Labels */}
                        <text
                            x={house.x}
                            y={house.y + 25}
                            textAnchor="middle"
                            fill="#ffffff"
                            style={{
                                fontSize: '16px',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                filter: 'drop-shadow(0 2px 2px rgba(0,0,0,1)) drop-shadow(0 0 4px rgba(0,0,0,1))',
                                pointerEvents: 'none'
                            }}
                        >
                            {house.label}
                        </text>
                        <circle
                            cx={house.x}
                            cy={house.y}
                            r="2"
                            fill={house.type === 'Prosumer' ? '#00ff88' : house.type === 'Storage' ? '#8b5cf6' : '#00e5ff'}
                        />
                    </g>
                ))}
            </svg>

            <div className="absolute bottom-4 right-6 text-right">
                <div className="text-[10px] text-muted font-bold uppercase tracking-widest opacity-50">Spatial Optimization</div>
                <div className="text-xs neon-text-cyan font-bold">Proximity Bias: 0.92x Fee Red.</div>
            </div>
        </Card>
    );
};

export default NeighborhoodMap;
