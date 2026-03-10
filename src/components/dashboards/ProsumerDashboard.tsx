import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Timeline } from 'antd';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Zap, TrendingUp, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const ProsumerDashboard: React.FC = () => {
    // Generate mock yield data — initialized synchronously to avoid empty-data Recharts crash
    const [yieldData, setYieldData] = useState<any[]>(() =>
        Array.from({ length: 24 }).map((_, i) => ({
            time: `${i}:00`,
            generation: Math.max(0, 15 - Math.pow(i - 12, 2) * 0.3 + Math.random() * 2),
            consumption: 3 + Math.random() * 5 + (i > 17 ? 4 : 0),
        }))
    );

    useEffect(() => {

        const interval = setInterval(() => {
            setYieldData(prev => {
                const newData = [...prev];
                const last = newData[newData.length - 1];
                newData.shift();
                newData.push({
                    time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                    generation: last.generation + (Math.random() - 0.5),
                    consumption: last.consumption + (Math.random() - 0.5)
                });
                return newData;
            });
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Fetch user so we can filter ledger
    const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => fetch('/api/auth/me').then(res => res.json()) });

    // Fetch ledger
    const { data: transactions, isLoading } = useQuery({
        queryKey: ['ledger'],
        queryFn: async () => {
            const res = await fetch('/api/ledger');
            if (!res.ok) throw new Error('Failed to fetch ledger');
            return res.json();
        },
        refetchInterval: 5000,
    });

    const mySales = transactions?.filter((tx: any) => tx.from === user?.username) || [];

    const currentGen = yieldData[yieldData.length - 1]?.generation || 0;
    const currentCons = yieldData[yieldData.length - 1]?.consumption || 0;
    const surplus = currentGen - currentCons;

    return (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black font-['Outfit'] uppercase tracking-tighter text-white m-0">Prosumer Studio</h2>
                    <p className="text-muted tracking-wide text-xs uppercase mt-1">Live Yield & Revenue Analytics</p>
                </div>
            </div>

            <Row gutter={[24, 24]}>
                {/* Yield Analytics Widget */}
                <Col xs={24} lg={16}>
                    <Card className="glass-card h-full" bodyStyle={{ padding: '24px' }}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 m-0">
                                <Activity size={16} className="text-[#00ffe0]" /> Live Microgrid Yield
                            </h3>
                            <div className="flex gap-4 text-xs font-bold uppercase tracking-wider">
                                <span className="text-[#00ffe0] flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#00ffe0]"></div>Generation</span>
                                <span className="text-[#ff3b6a] flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#ff3b6a]"></div>Consumption</span>
                            </div>
                        </div>

                        <Row gutter={24} className="mb-8">
                            <Col span={8}>
                                <Statistic title={<span className="text-[10px] uppercase tracking-widest text-muted">Current Output</span>} value={currentGen.toFixed(2)} suffix="kW" valueStyle={{ color: '#00ffe0', fontSize: '28px', fontWeight: 900, fontFamily: 'Outfit' }} />
                            </Col>
                            <Col span={8}>
                                <Statistic title={<span className="text-[10px] uppercase tracking-widest text-muted">Home Load</span>} value={currentCons.toFixed(2)} suffix="kW" valueStyle={{ color: '#ff3b6a', fontSize: '28px', fontWeight: 900, fontFamily: 'Outfit' }} />
                            </Col>
                            <Col span={8}>
                                <Statistic title={<span className="text-[10px] uppercase tracking-widest text-muted">Live Surplus</span>} value={surplus.toFixed(2)} suffix="kW" valueStyle={{ color: surplus > 0 ? '#00ff88' : '#ffaa00', fontSize: '28px', fontWeight: 900, fontFamily: 'Outfit' }} />
                            </Col>
                        </Row>

                        <div className="h-[250px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={yieldData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorGen" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00ffe0" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#00ffe0" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorCons" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ff3b6a" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ff3b6a" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} />
                                    <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(10,15,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', backdropFilter: 'blur(10px)' }}
                                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                    />
                                    <Area type="monotone" dataKey="generation" stroke="#00ffe0" strokeWidth={2} fillOpacity={1} fill="url(#colorGen)" />
                                    <Area type="monotone" dataKey="consumption" stroke="#ff3b6a" strokeWidth={2} fillOpacity={1} fill="url(#colorCons)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>

                {/* Global Consumption Feed */}
                <Col xs={24} lg={8}>
                    <Card className="glass-card h-full" bodyStyle={{ padding: '24px' }}>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 m-0 mb-6">
                            <TrendingUp size={16} className="text-[#ffaa00]" /> Neighborhood Demand
                        </h3>
                        <div className="space-y-6">
                            <div className="p-4 rounded-xl bg-[rgba(255,60,100,0.05)] border border-[rgba(255,60,100,0.1)]">
                                <div className="text-[10px] font-black uppercase tracking-widest text-[#ff3b6a] mb-1">Peak Alert</div>
                                <div className="text-sm font-bold text-white">Local transformer load is 15% above average. High demand expected in next hour.</div>
                            </div>
                            <Timeline
                                className="custom-timeline mt-4"
                                items={[
                                    { color: '#00ffe0', children: <span className="text-xs text-white">Grid load normal at 450kW</span> },
                                    { color: '#ffaa00', children: <span className="text-xs text-white">12 EVs began charging (+84kW)</span> },
                                    { color: '#ff3b6a', children: <span className="text-xs text-white">Demand spike: East Sector (+45kW)</span> },
                                ]}
                            />
                        </div>
                    </Card>
                </Col>

                {/* Sales Ledger */}
                <Col xs={24}>
                    <Card className="glass-card" bodyStyle={{ padding: '32px' }}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-black font-['Outfit'] uppercase text-white m-0 tracking-wider flex items-center gap-2">
                                    <Zap size={20} className="neon-text-cyan" /> My Sales Ledger
                                </h3>
                                <p className="text-[10px] text-muted uppercase tracking-widest mt-1">Verified exported energy contracts</p>
                            </div>
                        </div>

                        <Table
                            dataSource={mySales}
                            loading={isLoading}
                            rowKey="_id"
                            pagination={{ pageSize: 5 }}
                            className="bg-transparent"
                            rowClassName="hover:bg-white/5 transition-colors"
                            columns={[
                                {
                                    title: 'TIME',
                                    dataIndex: 'createdAt',
                                    render: (date) => <span className="text-xs text-muted font-mono">{new Date(date).toLocaleTimeString()}</span>,
                                },
                                {
                                    title: 'PURCHASER (MASKED)',
                                    dataIndex: 'to',
                                    render: (to) => <span className="text-xs font-bold text-white uppercase tracking-wider">USR_***{to.substring(0, 3)}</span>,
                                },
                                {
                                    title: 'VOLUME',
                                    dataIndex: 'amount',
                                    render: (amt) => <span className="text-sm font-bold neon-text-green">{amt.toFixed(2)} kWh</span>,
                                },
                                {
                                    title: 'PRICE',
                                    dataIndex: 'price',
                                    render: (price) => <span className="text-xs text-muted font-mono">₹{(price ?? 0).toFixed(2)}/kWh</span>,
                                },
                                {
                                    title: 'REVENUE',
                                    dataIndex: 'settlementTotal',
                                    render: (total) => <span className="text-sm font-black text-white font-['Outfit']">₹{(total ?? 0).toFixed(2)}</span>,
                                },
                                {
                                    title: 'STATUS',
                                    dataIndex: 'status',
                                    render: () => <span className="px-2 py-1 rounded bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] text-[9px] font-black uppercase tracking-widest">Settled</span>,
                                }
                            ]}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default ProsumerDashboard;
