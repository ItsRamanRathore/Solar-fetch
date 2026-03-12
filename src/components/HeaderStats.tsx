import React from 'react';
import { Row, Col, Statistic, Card } from 'antd';
import { Zap, Activity, Users, TrendingUp, Wifi } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useSocket } from '../contexts/SocketContext';

const HeaderStats: React.FC = () => {
    const { connected } = useSocket();

    const { data: stats } = useQuery({
        queryKey: ['gridStats'],
        queryFn: async () => {
            const res = await fetch('/api/grid/stats');
            if (!res.ok) throw new Error('Failed to fetch grid stats');
            return res.json();
        },
        refetchInterval: 5000
    });

    const gen = stats?.generation || 0;
    const trades = stats?.activeTrades || 0;
    const health = stats?.health || 99.8;

    return (
        <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} sm={8}>
                <Card className="glass-card shadow-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.2)] bg-gradient-to-br from-transparent to-[#00ff88]/5">
                    <Statistic
                        title={<span className="text-muted text-[10px] font-black uppercase tracking-widest">Neighborhood Generation</span>}
                        value={gen}
                        precision={1}
                        suffix="kWh"
                        prefix={<Zap className="neon-text-green mr-3 inline-block mb-1" size={18} />}
                        valueStyle={{ color: '#00ff88', fontWeight: 900, fontSize: '28px', fontFamily: 'Outfit' }}
                    />
                    <div className="flex items-center gap-1 mt-1">
                        <TrendingUp size={10} className="text-[#00ff88]" />
                        <span className="text-[9px] text-[#00ff88] font-bold">+2.4% from last hour</span>
                    </div>
                </Card>
            </Col>
            <Col xs={24} sm={8}>
                <Card className="glass-card shadow-lg hover:shadow-[0_0_20px_rgba(0,229,255,0.2)] bg-gradient-to-br from-transparent to-[#00e5ff]/5">
                    <Statistic
                        title={<span className="text-muted text-[10px] font-black uppercase tracking-widest">Active P2P Trades</span>}
                        value={trades}
                        prefix={<Activity className="neon-text-cyan mr-3 inline-block mb-1" size={18} />}
                        valueStyle={{ color: '#00e5ff', fontWeight: 900, fontSize: '28px', fontFamily: 'Outfit' }}
                    />
                    <div className="flex items-center gap-1 mt-1">
                        {connected ? (
                            <>
                                <div className="w-1 h-1 rounded-full bg-[#00e5ff] animate-pulse" />
                                <span className="text-[9px] text-[#00e5ff] font-bold">Real-time matching active</span>
                            </>
                        ) : (
                            <>
                                <Wifi size={10} className="text-muted" />
                                <span className="text-[9px] text-muted font-bold">Connecting socket...</span>
                            </>
                        )}
                    </div>
                </Card>
            </Col>
            <Col xs={24} sm={8}>
                <Card className="glass-card shadow-lg hover:shadow-[0_0_20px_rgba(139,92,246,0.2)] bg-gradient-to-br from-transparent to-[#8b5cf6]/5">
                    <Statistic
                        title={<span className="text-muted text-[10px] font-black uppercase tracking-widest">Grid Stability Index</span>}
                        value={health}
                        suffix="%"
                        prefix={<Users className="text-purple-400 mr-3 inline-block mb-1" size={18} />}
                        valueStyle={{ color: '#a78bfa', fontWeight: 900, fontSize: '28px', fontFamily: 'Outfit' }}
                    />
                    <div className="flex items-center gap-1 mt-1">
                        <span className="text-[9px] text-purple-400 font-bold">Resilience: High</span>
                    </div>
                </Card>
            </Col>
            <Col xs={24} sm={6}>
                <Card className="glass-card h-full bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/10">
                    <Statistic
                        title={<span className="text-muted font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                            <Zap size={12} className="text-purple-400" /> Neighborhood Efficiency
                        </span>}
                        value={84.2}
                        suffix="%"
                        valueStyle={{ color: '#fff', fontWeight: 900, fontFamily: 'Outfit' }}
                    />
                    <div className="flex items-center gap-2 mt-2">
                        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-purple-500 h-full w-[84%]" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                        <div className="text-[10px] text-muted font-bold uppercase tracking-widest italic opacity-60">Local cluster utilization</div>
                        <div className="text-[10px] text-purple-400 font-black">SAVE: 12.6% LOSS</div>
                    </div>
                </Card>
            </Col>
        </Row>
    );
};

export default HeaderStats;
