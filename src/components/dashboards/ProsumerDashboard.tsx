import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Button, message } from 'antd';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Zap, Activity, Battery, Award, Settings, HelpCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import GreenCertificate from '../GreenCertificate';
import { useSettings } from '../../contexts/SettingsContext';

interface ProsumerDashboardProps {
    simMode: string;
    userRole: string;
    user?: {
        username: string;
        storedEnergy: number;
        batteryCapacity: number;
        isBrokerActive: boolean;
    };
}

const ProsumerDashboard: React.FC<ProsumerDashboardProps> = ({ user, simMode }) => {
    const { settings } = useSettings();
    const queryClient = useQueryClient();
    const [brokerOverride, setBrokerOverride] = useState<boolean | null>(null);

    // Mock AI Activity Simulator
    useEffect(() => {
        if (brokerOverride === true || (user?.isBrokerActive && brokerOverride !== false)) {
            const interval = setInterval(() => {
                if (Math.random() > 0.7) {
                    message.info('AI Broker: Optimal trade path identified. Executing match...', 3);
                }
            }, 10000);
            return () => clearInterval(interval);
        }
    }, [brokerOverride, user?.isBrokerActive]);

    // Generate mock yield data — initialized synchronously to avoid empty-data Recharts crash
    const [yieldData, setYieldData] = useState<any[]>(() =>
        Array.from({ length: 24 }).map((_, i) => ({
            time: `${i}:00`,
            // BOOSTED for demo: peak at ~40kW, nightly floor at 15kW
            generation: Math.max(15, 30 - Math.pow(i - 12, 2) * 0.4 + Math.random() * 5),
            consumption: 2 + Math.random() * 3 + (i > 18 ? 4 : 0),
        }))
    );

    useEffect(() => {
        const interval = setInterval(() => {
            setYieldData(prev => {
                const newData = [...prev];
                const last = newData[newData.length - 1];
                newData.shift();
                
                let genFactor = 1.0;
                if (simMode === 'sunset') genFactor = 0.3; // 70% decrease
                if (simMode === 'grid-fail') genFactor = 0.5 + Math.random(); // Wild noise factor
                
                newData.push({
                    time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                    // Force generation to be significantly higher than consumption for demo
                    generation: Math.max(15, last.generation + (Math.random() - 0.2)) * genFactor,
                    consumption: Math.min(10, Math.max(2, last.consumption + (Math.random() - 0.5)))
                });
                return newData;
            });
        }, 5000);
        return () => clearInterval(interval);
    }, [simMode]);

    // Fetch user so we can filter ledger
    const { data: fetchedUser } = useQuery({ queryKey: ['user'], queryFn: () => fetch('/api/auth/me').then(res => res.json()) });
    const currentUser = { 
        ...(user || fetchedUser), 
        isBrokerActive: brokerOverride !== null ? brokerOverride : (user?.isBrokerActive || fetchedUser?.isBrokerActive) 
    }; 

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

    // Demo Masking & Rich Mock Data
    const mockRevenue = [
        { _id: 'm1', from: currentUser?.username, to: 'Node-Z8', amount: 45.2, price: 12.5, settlementTotal: 565, createdAt: new Date(Date.now() - 3600000).toISOString(), status: 'Settled', greenHash: '0x8f7d2e...' },
        { _id: 'm2', from: currentUser?.username, to: 'Cluster-B', amount: 120.5, price: 14.2, settlementTotal: 1711.1, createdAt: new Date(Date.now() - 7200000).toISOString(), status: 'Settled', greenHash: '0xac32b1...' },
        { _id: 'm3', from: currentUser?.username, to: 'Node-C4', amount: 12.8, price: 11.8, settlementTotal: 151.04, createdAt: new Date(Date.now() - 86400000).toISOString(), status: 'Settled', greenHash: '0x9d4a8c...' }
    ];

    const mySales = transactions && transactions.length > 0 
        ? [...mockRevenue, ...transactions.filter((tx: any) => tx.from === currentUser?.username)]
        : mockRevenue;

    const currentGen = yieldData[yieldData.length - 1]?.generation || 0;
    const currentCons = yieldData[yieldData.length - 1]?.consumption || 0;
    const surplus = currentGen - currentCons;
    const isIslanding = simMode === 'grid-fail';
    const isBatteryMode = currentGen < currentCons || simMode !== 'standard';

    return (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black font-['Outfit'] uppercase tracking-tighter text-white m-0">Prosumer Studio</h2>
                    <p className="text-muted tracking-wide text-xs uppercase mt-1">Live Yield & Revenue Analytics</p>
                </div>
                
                <div className="flex gap-4">
                    {isIslanding && (
                        <div className="px-4 py-2 rounded border border-red-500/50 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                            Micro-grid Islanding Active
                        </div>
                    )}
                    {isBatteryMode && (
                        <div className="px-4 py-2 rounded border border-yellow-500/50 bg-yellow-500/10 text-yellow-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <Battery size={12} className="animate-bounce" /> Battery Discharge Mode
                        </div>
                    )}
                    <div className="flex items-center gap-2 ml-2">
                        <Button className="glass-button !p-2" icon={<Settings size={14} />} />
                        <Button className="glass-button !p-2" icon={<HelpCircle size={14} />} />
                    </div>
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

                {/* VBM & Smart Broker Widget */}
                <Col xs={24} lg={8}>
                    <Card className="glass-card h-full" bodyStyle={{ padding: '24px' }}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 m-0">
                                <Battery size={16} className="text-[#00ff88]" /> Virtual Battery (VBM)
                            </h3>
                            <div className="px-2 py-0.5 rounded bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] text-[9px] font-black uppercase tracking-widest">
                                Optimized
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center py-4">
                            <div className="relative w-32 h-32 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                                <div 
                                    className="absolute inset-0 rounded-full border-4 border-[#00ff88] transition-all duration-1000"
                                    style={{ 
                                        clipPath: `inset(${100 - (currentUser?.storedEnergy / currentUser?.batteryCapacity * 100)}% 0 0 0)`,
                                        filter: 'drop-shadow(0 0 8px #00ff88)' 
                                    }}
                                />
                                <div className="text-center">
                                    <div className="text-2xl font-black text-white leading-none">
                                        {((currentUser?.storedEnergy / currentUser?.batteryCapacity) * 100).toFixed(0)}%
                                    </div>
                                    <div className="text-[10px] text-muted uppercase font-bold">Stored</div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 w-full mt-8">
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                                    <div className="text-[9px] text-muted uppercase font-black mb-1">Capacity</div>
                                    <div className="text-sm font-bold text-white">{currentUser?.batteryCapacity} kWh</div>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                                    <div className="text-[9px] text-muted uppercase font-black mb-1">State</div>
                                    <div className="text-sm font-bold text-[#00ff88]">{simMode === 'sunset' ? 'Discharging' : 'Idle'}</div>
                                </div>
                            </div>

                            <div className="w-full mt-6 p-4 rounded-2xl bg-cyan-400/5 border border-cyan-400/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${currentUser?.isBrokerActive ? 'bg-cyan-400/20 animate-pulse' : 'bg-white/10'}`}>
                                        <Activity size={16} className={currentUser?.isBrokerActive ? 'text-cyan-400' : 'text-muted'} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-white uppercase leading-none mb-1">AI Smart Broker</div>
                                        <div className="text-[9px] text-muted uppercase tracking-tighter">Auto-Arbitrage Logic</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={async () => {
                                        setBrokerOverride(!currentUser.isBrokerActive);
                                        message.success(`AI Broker ${!currentUser.isBrokerActive ? 'Enabled' : 'Disabled'}`);
                                        try {
                                            await fetch(`/api/assets/broker/toggle`, { method: 'POST' });
                                            queryClient.invalidateQueries({ queryKey: ['user'] });
                                        } catch (e) {
                                            console.warn('Backend disconnected, using local simulation');
                                        }
                                    }}
                                    className={`w-12 h-6 rounded-full transition-all relative ${currentUser?.isBrokerActive ? 'bg-cyan-400' : 'bg-white/10'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${currentUser?.isBrokerActive ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
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
                                    render: (price) => <span className="text-xs text-muted font-mono">{settings.currency}{((price ?? 0) * (isIslanding ? 2.0 : 1.0)).toFixed(2)}/kWh</span>,
                                },
                                {
                                    title: 'REVENUE',
                                    dataIndex: 'settlementTotal',
                                    render: (total) => <span className="text-sm font-black text-white font-['Outfit']">{settings.currency}{((total ?? 0) * (isIslanding ? 2.0 : 1.0)).toFixed(2)}</span>,
                                },
                                {
                                    title: 'ESG HASH',
                                    dataIndex: 'greenHash',
                                    render: (hash) => hash ? (
                                        <div className="flex items-center gap-1 text-cyan-400">
                                            <Statistic 
                                                title={<span className="text-[10px] text-muted font-bold uppercase tracking-widest">Total Yield Revenue</span>} 
                                                value={2458.50} 
                                                prefix={<span className="text-cyan-400">{settings.currency}</span>}
                                                valueStyle={{ color: '#fff', fontSize: '24px', fontWeight: '900', fontFamily: 'Outfit' }} 
                                            />
                                            <Award size={12} />
                                            <span className="text-[10px] font-mono">{hash.substring(0, 8)}</span>
                                        </div>
                                    ) : <span className="text-[10px] text-muted">-</span>,
                                },
                                {
                                    title: 'STATUS',
                                    dataIndex: 'status',
                                    render: () => <span className="px-2 py-1 rounded bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] text-[9px] font-black uppercase tracking-widest">Settled</span>,
                                }
                            ]}
                        />
                    </Card>
                    
                    {/* Phase 2: ESG Certificate Preview */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {mySales.filter((tx: any) => tx.greenHash).slice(0, 3).map((tx: any) => (
                            <GreenCertificate key={tx._id} tx={tx} />
                        ))}
                    </div>
                </Col>
            </Row>
        </div>
    );
};

export default ProsumerDashboard;
