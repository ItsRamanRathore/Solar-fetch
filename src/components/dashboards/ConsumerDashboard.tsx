import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Form, InputNumber, Button, message, Progress } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap, Activity, Battery, ShieldAlert, ZapOff } from 'lucide-react';
import { useSocket } from '../../contexts/SocketContext';

const ConsumerDashboard: React.FC = () => {
    const queryClient = useQueryClient();
    const { socket } = useSocket();
    const [form] = Form.useForm();
    const [currentTime, setCurrentTime] = useState(new Date().getHours());

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

    const sells = orders?.sells || [];

    // Placing a Bid
    const placeBidMutation = useMutation({
        mutationFn: async (values: any) => {
            const res = await fetch('/api/market/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'buy', ...values }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to place bid');
            return data;
        },
        onSuccess: () => {
            message.success('Bid placed successfully');
            form.resetFields();
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
        onError: (err: Error) => {
            message.error(err.message);
        }
    });

    // Handle Bidding Submission
    const onFinish = (values: any) => {
        placeBidMutation.mutate(values);
    };

    // Calculate usage forecasting
    const nextHour = (currentTime + 1) % 24;
    const isEvening = nextHour >= 18 && nextHour <= 22;
    const predictedLoad = isEvening ? 12.5 : 4.2;
    const riskLevel = isEvening ? 'High' : 'Low';

    return (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black font-['Outfit'] uppercase tracking-tighter text-white m-0">Consumer Market</h2>
                    <p className="text-muted tracking-wide text-xs uppercase mt-1">Energy Procurement & Bidding</p>
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
                                            {isEvening
                                                ? "Evening peak approaching. Secure bids now before neighborhood prices surge by estimated 15%."
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
                                    <Form.Item name="price" label={<span className="text-xs text-white">Max Price (₹/kWh)</span>} rules={[{ required: true, type: 'number', min: 0.01 }]}>
                                        <InputNumber className="w-full glass-input" size="large" placeholder="0.00" precision={3} step={0.01} />
                                    </Form.Item>
                                    <Button type="primary" htmlType="submit" loading={placeBidMutation.isPending} className="w-full h-12 bg-[#00e5ff] hover:bg-[#00ff88] text-black font-black uppercase tracking-widest border-none mt-2">
                                        Submit Bid Request
                                    </Button>
                                </Form>
                            </div>

                            <div>
                                <div className="text-[10px] text-muted font-bold uppercase tracking-widest mb-4">Market Intel</div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10">
                                        <span className="text-xs text-muted">Current Floor Ask</span>
                                        <span className="text-sm font-bold text-white">₹{sells.length > 0 ? (sells[0].price ?? 0).toFixed(2) : '---'}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10">
                                        <span className="text-xs text-muted">Total Available Vol</span>
                                        <span className="text-sm font-bold neon-text-cyan">{sells.reduce((acc: any, curr: any) => acc + (curr.remainingKwh ?? 0), 0).toFixed(2)} kWh</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10">
                                        <span className="text-xs text-muted">Active Suppliers</span>
                                        <span className="text-sm font-bold text-white">{new Set(sells.map((s: any) => s.maker?.username).filter(Boolean)).size} Nodes</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </Col>

                {/* Available Supply Feed */}
                <Col xs={24}>
                    <Card className="glass-card" bodyStyle={{ padding: '32px' }}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-black font-['Outfit'] uppercase text-white m-0 tracking-wider flex items-center gap-2">
                                    <ZapOff size={20} className="text-[#00ff88]" /> Available Supply Feed
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
                            rowClassName="hover:bg-white/5 transition-colors"
                            columns={[
                                {
                                    title: 'SELLER NODE',
                                    dataIndex: ['maker', 'username'],
                                    render: (name, record: any) => (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-white">{name}</span>
                                            {record.maker?.isCertified && <span className="px-1.5 py-0.5 rounded bg-[#00ff88]/20 text-[#00ff88] text-[8px] font-black uppercase border border-[#00ff88]/30">Vetted</span>}
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
                                    render: (price) => <span className="text-sm font-black text-white font-['Outfit']">₹{(price ?? 0).toFixed(2)}/kWh</span>,
                                },
                            ]}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default ConsumerDashboard;
