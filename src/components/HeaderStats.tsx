import React from 'react';
import { Row, Col, Statistic, Card } from 'antd';
import { Zap, Activity, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface HeaderStatsProps {
    userRole?: 'prosumer' | 'consumer' | 'admin';
}

const HeaderStats: React.FC<HeaderStatsProps> = ({ userRole = 'admin' }) => {

    const { data: stats } = useQuery({
        queryKey: ['gridStats'],
        queryFn: async () => {
            const res = await fetch('/api/grid/stats');
            if (!res.ok) throw new Error('Failed to fetch grid stats');
            return res.json();
        },
        refetchInterval: 15000
    });

    const gen = stats?.generation || 0;
    const cons = stats?.consumption || 0;
    const trades = stats?.activeTrades || 0;
    const health = stats?.health || 99.8;

    return (
        <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} sm={4}>
                <Card className="glass-card shadow-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.2)] bg-gradient-to-br from-transparent to-[#00ff88]/5">
                    <Statistic
                        title={<span className="text-muted text-[10px] font-black uppercase tracking-widest">{userRole === 'consumer' ? 'Grid Availability' : userRole === 'prosumer' ? 'Cluster Yield' : 'Neighborhood Gen'}</span>}
                        value={userRole === 'consumer' ? gen * 0.8 : userRole === 'prosumer' ? gen * 0.4 : gen}
                        precision={1}
                        suffix="kWh"
                        prefix={<Zap className="neon-text-green mr-3 inline-block mb-1" size={18} />}
                        valueStyle={{ color: '#00ff88', fontWeight: 900, fontSize: '20px', fontFamily: 'Outfit' }}
                    />
                </Card>
            </Col>
            <Col xs={24} sm={4}>
                <Card className="glass-card shadow-lg hover:shadow-[0_0_20px_rgba(255,100,0,0.2)] bg-gradient-to-br from-transparent to-[#ff6400]/5">
                    <Statistic
                        title={<span className="text-muted text-[10px] font-black uppercase tracking-widest">{userRole === 'consumer' ? 'Provider Stress' : userRole === 'prosumer' ? 'Cluster Demand' : 'Neighborhood Cons'}</span>}
                        value={userRole === 'consumer' ? cons * 0.9 : userRole === 'prosumer' ? cons * 0.3 : cons}
                        precision={1}
                        suffix="kWh"
                        prefix={<Zap className="text-orange-400 mr-3 inline-block mb-1" size={18} />}
                        valueStyle={{ color: '#ff6400', fontWeight: 900, fontSize: '20px', fontFamily: 'Outfit' }}
                    />
                </Card>
            </Col>
            <Col xs={24} sm={4}>
                <Card className="glass-card shadow-lg hover:shadow-[0_0_20px_rgba(0,229,255,0.2)] bg-gradient-to-br from-transparent to-[#00e5ff]/5">
                    <Statistic
                        title={<span className="text-muted text-[10px] font-black uppercase tracking-widest">{userRole === 'admin' ? 'Global Trades' : 'Available Trades'}</span>}
                        value={userRole === 'admin' ? trades : Math.floor(trades * 0.3)}
                        prefix={<Activity className="neon-text-cyan mr-3 inline-block mb-1" size={18} />}
                        valueStyle={{ color: '#00e5ff', fontWeight: 900, fontSize: '20px', fontFamily: 'Outfit' }}
                    />
                </Card>
            </Col>
            <Col xs={24} sm={4}>
                <Card className="glass-card shadow-lg hover:shadow-[0_0_20px_rgba(139,92,246,0.2)] bg-gradient-to-br from-transparent to-[#8b5cf6]/5">
                    <Statistic
                        title={<span className="text-muted text-[10px] font-black uppercase tracking-widest">{userRole === 'consumer' ? 'Market Liquidity' : 'Grid Health'}</span>}
                        value={health}
                        suffix="%"
                        prefix={<Users className="text-purple-400 mr-3 inline-block mb-1" size={18} />}
                        valueStyle={{ color: '#a78bfa', fontWeight: 900, fontSize: '20px', fontFamily: 'Outfit' }}
                    />
                </Card>
            </Col>
            <Col xs={24} sm={8}>
                <Card className="glass-card bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/10">
                    <div className="flex justify-between items-center h-full">
                        <div className="flex-1">
                             <Statistic
                                title={<span className="text-muted font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                                    <Zap size={12} className="text-purple-400" /> {userRole === 'consumer' ? 'Pricing Stability' : userRole === 'prosumer' ? 'Cluster Efficiency' : 'Global Efficiency'}
                                </span>}
                                value={84.2}
                                suffix="%"
                                valueStyle={{ color: '#fff', fontWeight: 900, fontSize: '20px', fontFamily: 'Outfit' }}
                            />
                        </div>
                        <div className="flex-1 text-right">
                             <div className="text-[10px] text-[#00ff88] font-black uppercase tracking-widest mb-1 italic">{userRole === 'consumer' ? 'Optimal Buying' : 'Resilience: High'}</div>
                             <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-purple-500 h-full w-[84%]" />
                            </div>
                        </div>
                    </div>
                </Card>
            </Col>
        </Row>
    );
};

export default HeaderStats;
