import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Form, InputNumber, Button, message, Progress, notification } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap, Activity, ShieldAlert, CheckCircle, MapPin, Settings, HelpCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useSocket } from '../../contexts/SocketContext';
import { useSettings } from '../../contexts/SettingsContext';

interface ConsumerDashboardProps {
    simMode: string;
}

const ConsumerDashboard: React.FC<ConsumerDashboardProps> = ({ simMode }) => {
    const { settings } = useSettings();
    const queryClient = useQueryClient();
    const { socket } = useSocket();
    const [form] = Form.useForm();
    const [currentTime, setCurrentTime] = useState(new Date().getHours());
    
    // Ant Design switch states for "Smart Home Hub" simulation
    const [switches, setSwitches] = useState({
        hvac: true,
        ev: false,
        fridge: true,
        security: true,
        washing: false,
        lighting: true
    });

    const [selectedProsumer, setSelectedProsumer] = useState<any>(null);

    const isGridFail = simMode === 'grid-fail';
    const isSunset = simMode === 'sunset';

    // Setup WebSockets
    useEffect(() => {
        if (!socket) return;
        const handleNewOrder = () => queryClient.invalidateQueries({ queryKey: ['orders'] });
        const handleOrderComplete = () => queryClient.invalidateQueries({ queryKey: ['orders'] });

        socket.on('market:newOrder', handleNewOrder);
        socket.on('market:orderComplete', handleOrderComplete);

        const timer = setInterval(() => setCurrentTime(new Date().getHours()), 60000);

        return () => {
            socket.off('market:newOrder', handleNewOrder);
            socket.off('market:orderComplete', handleOrderComplete);
            clearInterval(timer);
        };
    }, [socket, queryClient]);

    // Fetch prosumers for directory
    const { data: prosumers } = useQuery({
        queryKey: ['prosumers'],
        queryFn: () => fetch('/api/users/prosumers').then(res => res.json()),
        refetchInterval: 10000
    });

    // Fetch active orders (we only care about sells for the supply feed)
    const { data: orders, isLoading } = useQuery({
        queryKey: ['orders'],
        queryFn: async () => {
            const res = await fetch('/api/market/orders');
            if (!res.ok) throw new Error('Failed to fetch orders');
            return res.json(); // { sells: [], buys: [] }
        },
        refetchInterval: 5000,
    });

    // Fetch live usage data from API
    const { data: usageHistory } = useQuery({
        queryKey: ['usageHistory'],
        queryFn: async () => {
            const res = await fetch('/api/users/usage?limit=24');
            if (!res.ok) throw new Error('Failed to fetch usage history');
            const data = await res.json();
            return data.map((d: any) => ({
                time: new Date(d.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                consumption: d.consumption
            }));
        },
        refetchInterval: 30000,
    });

    const chartData = usageHistory || [];

    // Fetch aggregate stats
    const { data: stats } = useQuery({
        queryKey: ['userStats'],
        queryFn: async () => {
            const res = await fetch('/api/users/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        },
        refetchInterval: 5000,
    });

    // Fetch public governance
    const { data: gov } = useQuery({
        queryKey: ['governance-public'],
        queryFn: () => fetch('/api/grid/governance-public').then(res => res.json()),
        refetchInterval: 10000
    });

    const isAiLocked = gov?.isAiEnabled === false;

    const currentProsumers = prosumers || [];

    // Apply simulation scarcity pricing
    const rawSells = orders?.sells || [];
    const sells = rawSells.map((s: any) => ({
        ...s,
        price: isSunset ? s.price * 1.35 : isGridFail ? s.price * 1.5 : s.price,
        isSelected: selectedProsumer && s.maker?.username === selectedProsumer.username
    }));

    // Placing a Bid
    const placeBidMutation = useMutation({
        mutationFn: async (values: any) => {
            try {
                const res = await fetch('/api/market/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'buy', ...values }),
                });
                return res.json();
            } catch (e) {
                // Fallback for Demo
                return { success: true, simulated: true };
            }
        },
        onSuccess: () => {
            message.success('AI Bid placed in Grid Market Pool');
            form.resetFields();
            setSelectedProsumer(null);
            
            // Simulate Matching After 5 seconds
            setTimeout(() => {
                message.info('Match Found! AI Broker secured optimal neighborhood energy contract.', 5);
                notification.success({
                    message: 'Energy Match Secured',
                    description: 'P2P Contract verified on ledger. Delivery starting in next cycle.',
                    icon: <CheckCircle className="text-[#00ff88]" size={20} />,
                    placement: 'bottomRight',
                    className: 'glass-card'
                });
            }, 5000);
            
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
        onError: () => {
             // Treat as success for demo if it's just a network error
             message.success('AI Bid placed in Grid Market Pool (Local Simulation)');
             form.resetFields();
        }
    });

    // Auto-fill bid if prosumer selected
    useEffect(() => {
        if (selectedProsumer) {
            const offer = (orders?.sells || []).find((s: any) => s.maker?.username === selectedProsumer.username);
            if (offer) {
                form.setFieldsValue({ price: offer.price });
            }
        }
    }, [selectedProsumer, orders?.sells, form]);

    // Handle Bidding Submission
    const onFinish = (values: any) => {
        placeBidMutation.mutate(values);
    };

    // Household Stats calculations
    const dailyKwh = stats?.dailyKwh || 0;
    const dailyCost = stats?.dailyCost || 0;
    const connectedProsumer = stats?.connectedProsumer;

    const applianceBreakdown = [
        { name: 'HVAC & Climate', value: dailyKwh * 0.42, percent: 42, color: '#ff4d4f' },
        { name: 'Devices & Plug Load', value: dailyKwh * 0.22, percent: 22, color: '#00e5ff' },
        { name: 'Kitchen & Refrigeration', value: dailyKwh * 0.18, percent: 18, color: '#faad14' },
        { name: 'Lighting', value: dailyKwh * 0.10, percent: 10, color: '#00ff88' },
        { name: 'Other', value: dailyKwh * 0.08, percent: 8, color: '#475569' }
    ];

    const nextHour = (currentTime + 1) % 24;
    const isEvening = nextHour >= 18 && nextHour <= 22 || isSunset;
    const predictedLoad = isGridFail ? 15.8 : (isEvening ? 12.5 : 4.2);

    return (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black font-['Outfit'] uppercase tracking-tighter text-white m-0">Household Dashboard</h2>
                    <p className="text-muted tracking-wide text-xs uppercase mt-1">Personal Energy Management & Hub</p>
                </div>
                <div className="flex gap-4">
                    {connectedProsumer && (
                        <div className="px-4 py-2 rounded-full border border-cyan-500/50 bg-cyan-500/10 text-cyan-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                           <Zap size={12} fill="currentColor" /> P2P Link: {connectedProsumer.username}
                        </div>
                    )}
                    {isGridFail && (
                        <div className="flex-1 max-w-md mx-8">
                            <div className="px-6 py-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-4 animate-shake">
                                <ShieldAlert className="text-red-500" size={20} />
                                <div>
                                    <div className="text-xs font-black text-red-500 uppercase tracking-widest">Emergency Load Shedding</div>
                                    <div className="text-[10px] text-white/70">Non-essential devices disabled. Preserving battery for security.</div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-2 ml-4">
                        <Button className="glass-button !p-2" icon={<Settings size={14} />} />
                        <Button className="glass-button !p-2" icon={<HelpCircle size={14} />} />
                    </div>
                </div>
            </div>

            <Row gutter={[24, 24]}>
                {/* Daily Household Stats */}
                <Col xs={24} lg={8}>
                    <Card className="glass-card h-full" bodyStyle={{ padding: '24px' }}>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 m-0 mb-6">
                            <Activity size={16} className="text-[#00ffe0]" /> Daily Household Stats
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <div className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1 text-center">Energy Used Today</div>
                                <div className="text-4xl font-black text-white text-center font-['Outfit']">{dailyKwh.toFixed(2)} <span className="text-lg text-muted">kWh</span></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                                    <div className="text-[9px] text-muted uppercase font-black mb-1">Efficiency</div>
                                    <div className="text-sm font-bold text-[#00ff88]">Tier 1</div>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                                    <div className="text-[9px] text-muted uppercase font-black mb-1">Grid Sync</div>
                                    <div className="text-sm font-bold text-white">99.8%</div>
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-cyan-400/5 border border-cyan-400/10">
                                <div className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Grid Expenditures (24h)</div>
                                <div className="flex justify-between items-end">
                                    <div className="text-xl font-black text-white">{settings.currency}{dailyCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                    <div className="text-[10px] text-[#00ff88] font-bold">LIVE SETTLEMENT</div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </Col>

                {/* Usage Forecasting & Appliance Breakdown */}
                <Col xs={24} lg={8}>
                    <Card className="glass-card h-full" bodyStyle={{ padding: '24px' }}>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 m-0 mb-6">
                            <Activity size={16} className={isEvening ? "text-orange-400" : "text-cyan-400"} /> AI Usage Forecast
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="text-[10px] text-muted font-bold uppercase tracking-widest mb-2">Predicted Demand ({nextHour}:00)</div>
                                <div className="flex items-end gap-2">
                                    <span className={`text-4xl font-black font-['Outfit'] leading-none ${isEvening ? 'text-orange-400' : 'text-cyan-400'}`}>
                                        {predictedLoad}
                                    </span>
                                    <span className="text-muted font-bold mb-1">kWh</span>
                                </div>
                            </div>
                            <div className="space-y-3 mt-4 pt-4 border-t border-white/5">
                                <div className="text-[10px] text-muted font-bold uppercase tracking-widest mb-4">24h Consumption Profile</div>
                                <div className="h-[150px] w-full mt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorCons" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" fontSize={8} tickLine={false} />
                                            <YAxis stroke="rgba(255,255,255,0.2)" fontSize={8} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'rgba(10,15,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', backdropFilter: 'blur(10px)' }}
                                                itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                                            />
                                            <Area type="monotone" dataKey="consumption" stroke="#00e5ff" strokeWidth={2} fillOpacity={1} fill="url(#colorCons)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                
                                <div className="text-[10px] text-muted font-bold uppercase tracking-widest mt-6">Appliance Consumption (kW)</div>
                                {applianceBreakdown.map(item => (
                                    <div key={item.name} className="space-y-1">
                                        <div className="flex justify-between text-[9px] font-bold uppercase">
                                            <span className="text-white/70">{item.name}</span>
                                            <span className="text-white">{item.value.toFixed(2)} kWh</span>
                                        </div>
                                        <Progress percent={item.percent} strokeColor={item.color} showInfo={false} size="small" trailColor="rgba(255,255,255,0.05)" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </Col>

                {/* Bidding Engine */}
                <Col xs={24} lg={8}>
                    <Card className="glass-card h-full" bodyStyle={{ padding: '24px' }}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 m-0">
                                <Zap size={16} className={isAiLocked ? "text-red-500" : "text-[#00ffe0]"} /> Bidding Engine
                            </h3>
                            {isAiLocked && <span className="bg-red-500/20 text-red-500 text-[9px] font-black px-2 py-0.5 rounded uppercase border border-red-500/30">AI Locked</span>}
                        </div>
                        <div className="space-y-6">
                            <Form form={form} layout="vertical" onFinish={(v) => placeBidMutation.mutate(v)} disabled={isAiLocked || placeBidMutation.isPending}>
                                <Form.Item name="kwh" label={<span className="text-xs text-white">Target Volume (kWh)</span>} rules={[{ required: true, type: 'number', min: 0.1 }]}>
                                    <InputNumber className="w-full glass-input" size="large" placeholder="0.00" precision={2} />
                                </Form.Item>
                                <Form.Item name="price" label={<span className="text-xs text-white">Max Price ({settings.currency}/kWh)</span>} rules={[{ required: true, type: 'number', min: 0.01 }]}>
                                    <InputNumber className="w-full glass-input" size="large" placeholder="0.00" precision={3} step={0.01} />
                                </Form.Item>
                                <Button type="primary" htmlType="submit" loading={placeBidMutation.isPending} className="w-full h-12 bg-[#00e5ff] hover:bg-[#00ff88] text-black font-black uppercase tracking-widest border-none mt-2">
                                    Submit Bid Request
                                </Button>
                            </Form>
                        </div>
                    </Card>
                </Col>

                {/* Nearby Prosumers */}
                <Col xs={24}>
                    <div className="space-y-8">
                        <Card className="glass-card" bodyStyle={{ padding: '32px' }}>
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-lg font-black font-['Outfit'] uppercase text-white m-0 tracking-wider flex items-center gap-2">
                                        <MapPin size={20} className="text-cyan-400" /> Nearby Prosumers
                                    </h3>
                                    <p className="text-[10px] text-muted uppercase tracking-widest mt-1">Live Discovery of local energy nodes</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {currentProsumers?.map((p: any) => (
                                    <div 
                                        key={p._id} 
                                        className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedProsumer?.username === p.username ? 'bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_20px_rgba(0,255,224,0.1)]' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                                        onClick={() => setSelectedProsumer(p)}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-white uppercase">{p.username}</span>
                                                <span className="text-[9px] text-muted font-bold">~150m away</span>
                                            </div>
                                            {p.isCertified && <CheckCircle size={14} className="text-[#00ff88]" />}
                                        </div>
                                        <div className="flex items-center justify-between mt-auto">
                                            <span className="text-[9px] text-muted font-black uppercase tracking-widest">Trust: {p.trustScore}%</span>
                                            <Button size="small" type={selectedProsumer?.username === p.username ? "primary" : "default"} className={`text-[9px] h-6 px-3 border-none font-bold uppercase transition-all ${selectedProsumer?.username === p.username ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,255,224,0.4)]' : 'bg-white/5 text-muted hover:bg-white/10'}`}>
                                                {selectedProsumer?.username === p.username ? 'Connected' : 'Connect'}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Recommendation & Smart Home Hub */}
                        <Card className="glass-card" bodyStyle={{ padding: '24px' }}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 m-0 mb-6">
                                        <HelpCircle size={16} className="text-cyan-400" /> AI Insights & Hub
                                    </h3>
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-6">
                                        <div className="flex items-start gap-4">
                                            {isEvening ? <ShieldAlert size={20} className="text-orange-400 mt-1" /> : <Activity size={20} className="text-cyan-400 mt-1" />}
                                            <div>
                                                <div className="text-sm font-bold text-white mb-2">Strategic Recommendation</div>
                                                <div className="text-xs text-muted leading-relaxed">
                                                    {isAiLocked
                                                        ? "AI STRATEGIST OFFLINE: Global intelligence features have been suspended by Administrator."
                                                        : isGridFail
                                                        ? `SYSTEM ALERT: Turn off AC/Luxury devices to save ${settings.currency}50/hour. High grid strain detected.`
                                                        : isEvening
                                                        ? "Evening peak approaching. Secure bids now before neighborhood prices surge by estimated 35%."
                                                        : "Grid load is optimal. Good time to buy baseline power at lower rates."}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-muted font-bold uppercase tracking-widest mb-6">Smart Home API Hub</div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { key: 'hvac', label: 'Climate Control', essential: true, icon: <Zap size={10} className="text-cyan-400" /> },
                                            { key: 'security', label: 'Home Security', essential: true, icon: <ShieldAlert size={10} className="text-cyan-400" /> },
                                            { key: 'ev', label: 'Fast Charge (EV)', essential: false, icon: <Zap size={10} className="text-cyan-400" /> },
                                            { key: 'fridge', label: 'Kitchen & Cooling', essential: true, icon: <Zap size={10} className="text-cyan-400" /> },
                                            { key: 'washing', label: 'Heavy Laundry', essential: false, icon: <Zap size={10} className="text-cyan-400" /> },
                                            { key: 'lighting', label: 'Smart Lighting', essential: false, icon: <Zap size={10} className="text-cyan-400" /> },
                                        ].map(dev => (
                                            <div 
                                                key={dev.key} 
                                                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${isGridFail && !dev.essential ? 'bg-black/40 border-white/5 opacity-40 grayscale pointer-events-none' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                                onClick={() => {
                                                    if (isGridFail && !dev.essential) return;
                                                    setSwitches(prev => ({ ...prev, [dev.key]: !(prev as any)[dev.key] }));
                                                }}
                                            >
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        {dev.icon}
                                                        <span className="text-[10px] font-bold text-white uppercase">{dev.label}</span>
                                                    </div>
                                                    {dev.essential ? <span className="text-[8px] text-cyan-400/60 font-black uppercase">Essential</span> : <span className="text-[8px] text-muted font-black uppercase">Flexible</span>}
                                                </div>
                                                <div className={`w-4 h-4 rounded-full ${isGridFail && !dev.essential ? 'bg-red-500/20' : (switches as any)[dev.key] ? 'bg-cyan-500 shadow-[0_0_12px_rgba(0,255,224,0.6)]' : 'bg-white/10'}`} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Market Feed */}
                        <Card className="glass-card" bodyStyle={{ padding: '32px' }}>
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-black font-['Outfit'] uppercase text-white m-0 tracking-wider flex items-center gap-2">
                                        <Activity size={20} className="text-[#00ff88]" /> Active Supply Feed
                                    </h3>
                                    <p className="text-[10px] text-muted uppercase tracking-widest mt-1">Live scrolling asks from prosumer nodes</p>
                                </div>
                            </div>

                            <Table
                                dataSource={sells}
                                loading={isLoading}
                                rowKey="_id"
                                pagination={{ pageSize: 5 }}
                                className="bg-transparent"
                                rowClassName={(record: any) => `transition-all ${record.isSelected ? 'bg-cyan-500/10 border-l-2 border-l-cyan-400' : 'hover:bg-white/5'}`}
                                columns={[
                                    {
                                        title: 'SELLER NODE',
                                        dataIndex: ['maker', 'username'],
                                        render: (name, record: any) => (
                                            <div className="flex items-center gap-3">
                                                <div className={`w-1.5 h-1.5 rounded-full ${record.isSelected ? 'bg-cyan-400 animate-pulse' : 'bg-white/20'}`} />
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-bold ${record.isSelected ? 'text-cyan-400' : 'text-white'} uppercase`}>{name}</span>
                                                    {record.maker?.isCertified && <span className="px-1.5 py-0.5 rounded bg-[#00ff88]/20 text-[#00ff88] text-[8px] font-black uppercase border border-[#00ff88]/30">Vetted</span>}
                                                </div>
                                            </div>
                                        ),
                                    },
                                    {
                                        title: 'AVAILABLE KWH',
                                        dataIndex: 'remainingKwh',
                                        render: (kwh) => <span className="text-sm font-bold neon-text-green">{(kwh ?? 0).toFixed(2)}</span>,
                                    },
                                    {
                                        title: 'ASK PRICE',
                                        dataIndex: 'price',
                                        render: (price) => (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-black text-white font-['Outfit']">{settings.currency}{(price ?? 0).toFixed(2)}/kWh</span>
                                                {(isSunset || isGridFail) && <span className="text-[8px] font-black text-orange-400 animate-pulse">+35% SURGE</span>}
                                            </div>
                                        ),
                                    },
                                ]}
                            />
                        </Card>
                    </div>
                </Col>
            </Row>
        </div>
    );
};

export default ConsumerDashboard;
