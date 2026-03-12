import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Form, InputNumber, Button, message, Progress, notification } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap, Activity, Battery, ShieldAlert, ZapOff, CheckCircle, X, MapPin, Settings, HelpCircle } from 'lucide-react';
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
        lux: true,
        security: true
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

    // Mock Data for Demo
    const mockProsumers = [
        { _id: 'p1', username: 'Solar_Maven', isCertified: true, trustScore: 98 },
        { _id: 'p2', username: 'Green_Node_4', isCertified: false, trustScore: 82 },
        { _id: 'p3', username: 'Battery_Bank_Z', isCertified: true, trustScore: 94 }
    ];

    const mockSells = [
        { _id: 's1', maker: { username: 'Solar_Maven', isCertified: true }, remainingKwh: 45.5, price: 14.2, isSelected: false },
        { _id: 's2', maker: { username: 'Green_Node_4', isCertified: false }, remainingKwh: 12.8, price: 12.5, isSelected: false },
        { _id: 's3', maker: { username: 'Battery_Bank_Z', isCertified: true }, remainingKwh: 156.0, price: 15.8, isSelected: false }
    ];

    const currentProsumers = prosumers && prosumers.length > 0 ? prosumers : mockProsumers;

    // Apply simulation scarcity pricing
    const rawSells = orders?.sells && orders.sells.length > 0 ? orders.sells : mockSells;
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
        onSuccess: (data) => {
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
            const offer = sells.find((s: any) => s.maker?.username === selectedProsumer.username);
            if (offer) {
                form.setFieldsValue({ price: offer.price });
            }
        }
    }, [selectedProsumer, sells, form]);

    // Handle Bidding Submission
    const onFinish = (values: any) => {
        placeBidMutation.mutate(values);
    };

    // Calculate usage forecasting
    const nextHour = (currentTime + 1) % 24;
    const isEvening = nextHour >= 18 && nextHour <= 22 || isSunset;
    const predictedLoad = isGridFail ? 15.8 : (isEvening ? 12.5 : 4.2);
    const riskLevel = isGridFail ? 'Critical' : (isEvening ? 'High' : 'Low');

    return (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black font-['Outfit'] uppercase tracking-tighter text-white m-0">Consumer Market</h2>
                    <p className="text-muted tracking-wide text-xs uppercase mt-1">Energy Procurement & Bidding</p>
                </div>
                <div className="flex gap-4">
                    {selectedProsumer && (
                        <div className="px-4 py-2 rounded-full border border-cyan-500/50 bg-cyan-500/10 text-cyan-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                           <Zap size={12} fill="currentColor" /> P2P Link: {selectedProsumer.username}
                           <X size={12} className="cursor-pointer hover:text-white" onClick={() => setSelectedProsumer(null)} />
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
                {/* Usage Forecasting Widget */}
                <Col xs={24} lg={8}>
                    <Card className="glass-card h-full" bodyStyle={{ padding: '24px' }}>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 m-0 mb-6">
                            <Activity size={16} className={isEvening ? "text-orange-400" : "text-cyan-400"} /> AI Usage Forecast
                        </h3>

                        <div className="flex flex-col gap-6">
                            <div>
                                <div className="text-[10px] text-muted font-bold uppercase tracking-widest mb-2">Predicted Demand ({nextHour}:00)</div>
                                <div className="flex items-end gap-2">
                                    <span className={`text-4xl font-black font-['Outfit'] leading-none ${isEvening ? 'text-orange-400' : 'text-cyan-400'}`}>
                                        {predictedLoad}
                                    </span>
                                    <span className="text-muted font-bold mb-1">kWh</span>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="text-[10px] text-muted font-bold uppercase tracking-widest">Pricing Risk Alert</div>
                                    <div className={`text-[10px] font-black uppercase ${isEvening ? 'text-red-400' : 'text-green-400'}`}>{riskLevel}</div>
                                </div>
                                <Progress percent={isEvening ? 85 : 30} strokeColor={isEvening ? '#ff4d4f' : '#52c41a'} showInfo={false} trailColor="rgba(255,255,255,0.1)" />
                            </div>

                            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex items-start gap-3">
                                    {isEvening ? <ShieldAlert size={18} className="text-orange-400 mt-1" /> : <Battery size={18} className="text-cyan-400 mt-1" />}
                                    <div>
                                        <div className="text-xs font-bold text-white mb-1">Recommendation</div>
                                        <div className="text-[11px] text-muted leading-relaxed">
                                            {isGridFail
                                                ? `SYSTEM ALERT: Turn off AC/Luxury devices to save ${settings.currency}50/hour. High grid strain detected.`
                                                : isEvening
                                                ? "Evening peak approaching. Secure bids now before neighborhood prices surge by estimated 35%."
                                                : "Grid load is optimal. Good time to buy baseline power at lower rates."}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </Col>

                {/* Bidding Engine */}
                <Col xs={24} lg={16}>
                    <Card className="glass-card h-full" bodyStyle={{ padding: '24px' }}>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 m-0 mb-6">
                            <Zap size={16} className="text-[#00ffe0]" /> Bidding Engine
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <div className="text-[10px] text-muted font-bold uppercase tracking-widest mb-4">Place Competitive Bid</div>
                                <Form form={form} layout="vertical" onFinish={onFinish}>
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

                            <div>
                                <div className="text-[10px] text-muted font-bold uppercase tracking-widest mb-4">Smart Home API Hub</div>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { key: 'hvac', label: 'Climate Control', essential: true },
                                        { key: 'security', label: 'Node Security', essential: true },
                                        { key: 'ev', label: 'Fast Charge (EV)', essential: false },
                                        { key: 'lux', label: 'Entertainment', essential: false },
                                    ].map(dev => (
                                        <div 
                                            key={dev.key} 
                                            className={`p-3 rounded-lg border transition-all cursor-pointer ${isGridFail && !dev.essential ? 'bg-black/40 border-white/5 opacity-40 grayscale pointer-events-none' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                            onClick={() => {
                                                if (isGridFail && !dev.essential) return;
                                                setSwitches(prev => ({ ...prev, [dev.key]: !(prev as any)[dev.key] }));
                                            }}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-white uppercase">{dev.label}</span>
                                                <div className={`w-3 h-3 rounded-full ${isGridFail && !dev.essential ? 'bg-red-500/20' : (switches as any)[dev.key] ? 'bg-cyan-500 shadow-[0_0_8px_white]' : 'bg-white/10'}`} />
                                            </div>
                                            {!dev.essential && isGridFail && <div className="text-[8px] text-red-500 font-black uppercase mt-1">Force-Disabled</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Card>
                </Col>

                {/* Supply Feed & Prosumer Directory */}
                <Col xs={24}>
                    <div className="space-y-8">
                        {/* Prosumer Directory */}
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
                                {(!currentProsumers || currentProsumers.length === 0) && <div className="col-span-3 py-8 text-center text-xs text-muted font-bold uppercase italic border border-dashed border-white/10 rounded-xl">No local prosumers discovered in this sector</div>}
                            </div>
                        </Card>

                        <Card className="glass-card" bodyStyle={{ padding: '32px' }}>
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-black font-['Outfit'] uppercase text-white m-0 tracking-wider flex items-center gap-2">
                                        <ZapOff size={20} className="text-[#00ff88]" /> Active Supply Feed
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
                                                <span className="text-sm font-black text-white font-['Outfit']">₹{(price ?? 0).toFixed(2)}/kWh</span>
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
