import React from 'react';
import { Row, Col, Statistic, Card } from 'antd';
import { Zap, Activity, Users, TrendingUp, ShoppingCart, Battery } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface HeaderStatsProps {
    userRole?: 'prosumer' | 'consumer' | 'admin';
}

interface GridStats {
    generation: number;
    consumption: number;
    activeTrades: number;
    health: number;
    userCounts?: Record<string, number>;
}

interface UserStats {
    dailyGeneration?: number;
    dailyRevenue?: number;
    totalVolumeSold?: number;
    totalRevenue?: number;
    connectedConsumers?: number;
    pendingRequests?: number;
    dailyKwh?: number;
    dailyCost?: number;
    totalVolumePurchased?: number;
    totalCost?: number;
}

const HeaderStats: React.FC<HeaderStatsProps> = ({ userRole = 'admin' }) => {

    const { data: gridStats } = useQuery<GridStats>({
        queryKey: ['gridStats'],
        queryFn: async () => {
            const res = await fetch('/api/grid/stats');
            if (!res.ok) throw new Error('Failed to fetch grid stats');
            return res.json();
        },
        refetchInterval: 15000,
    });

    const { data: userStats } = useQuery<UserStats>({
        queryKey: ['userStats'],
        queryFn: async () => {
            const res = await fetch('/api/users/stats', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch user stats');
            return res.json();
        },
        enabled: userRole !== 'admin',
        refetchInterval: 10000,
    });

    // ── PROSUMER VIEW ──────────────────────────────────────────────────────────
    if (userRole === 'prosumer') {
        const dailyGen = userStats?.dailyGeneration || 0;
        const dailyRev = userStats?.dailyRevenue || 0;
        const connectedCount = userStats?.connectedConsumers || 0;
        const totalSold = userStats?.totalVolumeSold || 0;
        const totalRev = userStats?.totalRevenue || 0;
        const slotPct = Math.min(100, connectedCount * 20);

        return (
            <Row gutter={[16, 16]} className="mb-6">
                <Col xs={24} sm={4}>
                    <Card className="glass-card shadow-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.2)] bg-gradient-to-br from-transparent to-[#00ff88]/5">
                        <Statistic
                            title={<span className="text-muted text-[10px] font-black uppercase tracking-widest">My Daily Generation</span>}
                            value={dailyGen}
                            precision={2}
                            suffix="kWh"
                            prefix={<Zap className="neon-text-green mr-3 inline-block mb-1" size={18} />}
                            valueStyle={{ color: '#00ff88', fontWeight: 900, fontSize: '20px', fontFamily: 'Outfit' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={4}>
                    <Card className="glass-card shadow-lg hover:shadow-[0_0_20px_rgba(255,100,0,0.2)] bg-gradient-to-br from-transparent to-[#ff6400]/5">
                        <Statistic
                            title={<span className="text-muted text-[10px] font-black uppercase tracking-widest">Today's Revenue</span>}
                            value={dailyRev}
                            precision={2}
                            prefix={<TrendingUp className="text-orange-400 mr-3 inline-block mb-1" size={18} />}
                            valueStyle={{ color: '#ff6400', fontWeight: 900, fontSize: '20px', fontFamily: 'Outfit' }}
                        />
                        <div className="text-[9px] text-muted mt-1">₹ earned from sales</div>
                    </Card>
                </Col>
                <Col xs={24} sm={4}>
                    <Card className="glass-card shadow-lg hover:shadow-[0_0_20px_rgba(0,229,255,0.2)] bg-gradient-to-br from-transparent to-[#00e5ff]/5">
                        <Statistic
                            title={<span className="text-muted text-[10px] font-black uppercase tracking-widest">Active Connections</span>}
                            value={connectedCount}
                            prefix={<Users className="neon-text-cyan mr-3 inline-block mb-1" size={18} />}
                            valueStyle={{ color: '#00e5ff', fontWeight: 900, fontSize: '20px', fontFamily: 'Outfit' }}
                        />
                        <div className="text-[9px] text-muted mt-1">Consumers on your node</div>
                    </Card>
                </Col>
                <Col xs={24} sm={4}>
                    <Card className="glass-card shadow-lg hover:shadow-[0_0_20px_rgba(139,92,246,0.2)] bg-gradient-to-br from-transparent to-[#8b5cf6]/5">
                        <Statistic
                            title={<span className="text-muted text-[10px] font-black uppercase tracking-widest">Total Volume Sold</span>}
                            value={totalSold}
                            precision={2}
                            suffix="kWh"
                            prefix={<Battery className="text-purple-400 mr-3 inline-block mb-1" size={18} />}
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
                                        <TrendingUp size={12} className="text-purple-400" /> All-time Revenue
                                    </span>}
                                    value={totalRev}
                                    precision={2}
                                    valueStyle={{ color: '#fff', fontWeight: 900, fontSize: '20px', fontFamily: 'Outfit' }}
                                />
                                <div className="text-[9px] text-muted mt-1">₹ total earnings</div>
                            </div>
                            <div className="flex-1 text-right">
                                <div className="text-[10px] text-[#00ff88] font-black uppercase tracking-widest mb-1 italic">Resilience: High</div>
                                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-purple-500 h-full transition-all" style={{ width: `${slotPct}%` }} />
                                </div>
                                <div className="text-[9px] text-muted mt-1">{connectedCount} / 5 consumer slots</div>
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>
        );
    }

    // ── CONSUMER VIEW ──────────────────────────────────────────────────────────
    if (userRole === 'consumer') {
        const dailyCons = userStats?.dailyKwh || 0;
        const dailyCost = userStats?.dailyCost || 0;
        const totalBought = userStats?.totalVolumePurchased || 0;
        const totalSpent = userStats?.totalCost || 0;
        const trades = gridStats?.activeTrades || 0;
        const health = gridStats?.health || 99.8;

        return (
            <Row gutter={[16, 16]} className="mb-6">
                <Col xs={24} sm={4}>
                    <Card className="glass-card shadow-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.2)] bg-gradient-to-br from-transparent to-[#00ff88]/5">
                        <Statistic
                            title={<span className="text-muted text-[10px] font-black uppercase tracking-widest">My Daily Usage</span>}
                            value={dailyCons}
                            precision={2}
                            suffix="kWh"
                            prefix={<Zap className="neon-text-green mr-3 inline-block mb-1" size={18} />}
                            valueStyle={{ color: '#00ff88', fontWeight: 900, fontSize: '20px', fontFamily: 'Outfit' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={4}>
                    <Card className="glass-card shadow-lg hover:shadow-[0_0_20px_rgba(255,100,0,0.2)] bg-gradient-to-br from-transparent to-[#ff6400]/5">
                        <Statistic
                            title={<span className="text-muted text-[10px] font-black uppercase tracking-widest">Today's Spend</span>}
                            value={dailyCost}
                            precision={2}
                            prefix={<ShoppingCart className="text-orange-400 mr-3 inline-block mb-1" size={18} />}
                            valueStyle={{ color: '#ff6400', fontWeight: 900, fontSize: '20px', fontFamily: 'Outfit' }}
                        />
                        <div className="text-[9px] text-muted mt-1">₹ spent on energy</div>
                    </Card>
                </Col>
                <Col xs={24} sm={4}>
                    <Card className="glass-card shadow-lg hover:shadow-[0_0_20px_rgba(0,229,255,0.2)] bg-gradient-to-br from-transparent to-[#00e5ff]/5">
                        <Statistic
                            title={<span className="text-muted text-[10px] font-black uppercase tracking-widest">Live Market Trades</span>}
                            value={trades}
                            prefix={<Activity className="neon-text-cyan mr-3 inline-block mb-1" size={18} />}
                            valueStyle={{ color: '#00e5ff', fontWeight: 900, fontSize: '20px', fontFamily: 'Outfit' }}
                        />
                        <div className="text-[9px] text-muted mt-1">settled last 24h</div>
                    </Card>
                </Col>
                <Col xs={24} sm={4}>
                    <Card className="glass-card shadow-lg hover:shadow-[0_0_20px_rgba(139,92,246,0.2)] bg-gradient-to-br from-transparent to-[#8b5cf6]/5">
                        <Statistic
                            title={<span className="text-muted text-[10px] font-black uppercase tracking-widest">Grid Health</span>}
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
                                        <ShoppingCart size={12} className="text-purple-400" /> Total Purchased
                                    </span>}
                                    value={totalBought}
                                    precision={2}
                                    suffix="kWh"
                                    valueStyle={{ color: '#fff', fontWeight: 900, fontSize: '20px', fontFamily: 'Outfit' }}
                                />
                                <div className="text-[9px] text-muted mt-1">₹{totalSpent.toFixed(2)} total spent</div>
                            </div>
                            <div className="flex-1 text-right">
                                <div className="text-[10px] text-[#00ff88] font-black uppercase tracking-widest mb-1 italic">Optimal Buying</div>
                                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-purple-500 h-full w-[61%]" />
                                </div>
                                <div className="text-[9px] text-muted mt-1">Market efficiency</div>
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>
        );
    }

    // ── ADMIN VIEW (unchanged) ─────────────────────────────────────────────────
    const gen = gridStats?.generation || 0;
    const cons = gridStats?.consumption || 0;
    const trades = gridStats?.activeTrades || 0;
    const health = gridStats?.health || 99.8;

    return (
        <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} sm={4}>
                <Card className="glass-card shadow-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.2)] bg-gradient-to-br from-transparent to-[#00ff88]/5">
                    <Statistic
                        title={<span className="text-muted text-[10px] font-black uppercase tracking-widest">Neighborhood Gen</span>}
                        value={gen}
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
                        title={<span className="text-muted text-[10px] font-black uppercase tracking-widest">Neighborhood Cons</span>}
                        value={cons}
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
                        title={<span className="text-muted text-[10px] font-black uppercase tracking-widest">Global Trades</span>}
                        value={trades}
                        prefix={<Activity className="neon-text-cyan mr-3 inline-block mb-1" size={18} />}
                        valueStyle={{ color: '#00e5ff', fontWeight: 900, fontSize: '20px', fontFamily: 'Outfit' }}
                    />
                </Card>
            </Col>
            <Col xs={24} sm={4}>
                <Card className="glass-card shadow-lg hover:shadow-[0_0_20px_rgba(139,92,246,0.2)] bg-gradient-to-br from-transparent to-[#8b5cf6]/5">
                    <Statistic
                        title={<span className="text-muted text-[10px] font-black uppercase tracking-widest">Grid Health</span>}
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
                                    <Zap size={12} className="text-purple-400" /> Global Efficiency
                                </span>}
                                value={84.2}
                                suffix="%"
                                valueStyle={{ color: '#fff', fontWeight: 900, fontSize: '20px', fontFamily: 'Outfit' }}
                            />
                        </div>
                        <div className="flex-1 text-right">
                            <div className="text-[10px] text-[#00ff88] font-black uppercase tracking-widest mb-1 italic">Resilience: High</div>
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
