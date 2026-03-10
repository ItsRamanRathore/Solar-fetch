import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Tag, Table, Modal, Form, InputNumber, Select, message, Avatar, Space } from 'antd';
import { ShoppingBag, Zap, Plus, User, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../../contexts/SocketContext';

interface MarketplaceProps {
    simMode?: string;
    userRole?: 'resident' | 'admin';
}

const Marketplace: React.FC<MarketplaceProps> = ({ simMode, userRole }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const queryClient = useQueryClient();
    const { socket } = useSocket();

    const { data: ordersData, isLoading } = useQuery({
        queryKey: ['orders'],
        queryFn: async () => {
            const res = await fetch('/api/market/orders');
            if (!res.ok) throw new Error('Failed to fetch orders');
            const data = await res.json();

            const formatOrder = (o: any) => ({
                key: o._id,
                user: o.maker.username,
                kwh: o.remainingKwh,
                price: o.price,
                status: o.status,
                trustScore: o.maker.trustScore,
                isCertified: o.maker.isCertified
            });

            return {
                sells: data.sells.map(formatOrder),
                buys: data.buys.map(formatOrder)
            };
        },
        refetchInterval: 10000 // Fallback polling
    });

    useEffect(() => {
        if (!socket) return;

        const handleRemoteUpdate = () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        };

        socket.on('market:newOrder', handleRemoteUpdate);
        socket.on('market:orderComplete', handleRemoteUpdate);

        return () => {
            socket.off('market:newOrder', handleRemoteUpdate);
            socket.off('market:orderComplete', handleRemoteUpdate);
        };
    }, [socket, queryClient]);

    const postListingMutation = useMutation({
        mutationFn: async (values: any) => {
            const res = await fetch('/api/market/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: values.type,
                    kwh: values.volume,
                    price: values.price
                })
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error?.[0]?.message || 'Failed to post listing');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            setIsModalOpen(false);
            form.resetFields();
            message.success('Listing published to peer-network');
        },
        onError: (err: Error) => {
            message.error(err.message);
        }
    });

    const handlePostListing = (values: any) => {
        postListingMutation.mutate(values);
    };

    const sells = ordersData?.sells || [];
    const buys = ordersData?.buys || [];
    const availableVolume = sells.reduce((acc: number, sell: any) => acc + (sell.kwh || 0), 0) + 14.5; // Mock base liquidity


    const columns = (marketType: 'sell' | 'buy') => [
        {
            title: marketType === 'sell' ? 'Seller' : 'Buyer',
            dataIndex: 'user',
            key: 'user',
            render: (text: string, row: any) => (
                <Space>
                    <Avatar size="small" icon={<User size={12} />} className="bg-white/5" />
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-xs">{text}</span>
                            {row.isCertified && <Tag color="gold" className="m-0 text-[8px] border-none px-1 font-black">CERTIFIED</Tag>}
                        </div>
                        <div className="text-[9px] text-muted font-bold uppercase tracking-wider">Reputation: {row.trustScore}%</div>
                    </div>
                </Space>
            )
        },
        {
            title: 'kWh',
            dataIndex: 'kwh',
            key: 'kwh',
            render: (vol: number) => <span className={`font-mono font-black ${marketType === 'sell' ? 'text-[#00ff88]' : 'text-[#00e5ff]'}`}>{vol}</span>
        },
        {
            title: 'Price',
            dataIndex: 'price',
            key: 'price',
            render: (price: number) => <span className="font-bold text-white">${price.toFixed(2)}</span>
        },
        {
            title: 'Status',
            key: 'status',
            render: (row: any) => (
                <Tag className={row.status === 'VERIFIED' ? 'tag-verified' : 'tag-pending'}>
                    {row.status}
                </Tag>
            )
        }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4"
        >
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-2xl font-black font-['Outfit'] m-0 uppercase tracking-tighter flex items-center gap-4">
                        Live Market Floor
                        {simMode === 'sunset' && <Tag color="warning" className="animate-pulse">Sunset Dynamics</Tag>}
                    </h2>
                    <p className="text-sm text-muted m-0">Secure P2P energy exchange with double-spend protection</p>
                </div>
                <Button
                    type="primary"
                    icon={<Plus size={18} />}
                    onClick={() => setIsModalOpen(true)}
                    className="bg-[#00ff88] border-none text-black font-black uppercase h-12 px-8 rounded-xl shadow-[0_0_20px_rgba(0,255,136,0.3)]"
                >
                    Post Listing
                </Button>
            </div>

            <Row gutter={[24, 24]} className="mb-8">
                <Col span={6}>
                    <Card className="glass-card">
                        <div className="text-[10px] text-muted font-black uppercase tracking-widest mb-1">Cluster Liquidity</div>
                        <div className="text-2xl font-black text-white">{availableVolume.toFixed(1)} <span className="text-xs font-normal">kWh</span></div>
                        <div className="text-[10px] text-[#00ff88] mt-1 font-bold">Resilience Buffer: Active</div>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="glass-card">
                        <div className="text-[10px] text-muted font-black uppercase tracking-widest mb-1">Market State</div>
                        <div className={`text-xl font-bold ${simMode === 'sunset' ? 'text-orange-400' : 'text-[#00e5ff]'}`}>
                            {simMode === 'sunset' ? 'HIGH DEMAND' : 'LIQUID'}
                        </div>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="glass-card">
                        <div className="text-[10px] text-muted font-black uppercase tracking-widest mb-1">Avg Settlement</div>
                        <div className="text-xl font-bold text-white">420ms</div>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="glass-card">
                        <div className="text-[10px] text-muted font-black uppercase tracking-widest mb-1">Protocol</div>
                        <div className="text-xl font-bold text-[#00ff88]">SOLAR-P2P v4</div>
                    </Card>
                </Col>
            </Row>

            {userRole === 'resident' && (
                <Card className="glass-card mb-8 border-[#00e5ff]/20 bg-[#00e5ff]/5">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-[#00e5ff]/10 flex items-center justify-center text-[#00e5ff]">
                                <Globe size={20} />
                            </div>
                            <div>
                                <div className="text-[10px] text-[#00e5ff] font-black uppercase tracking-widest mb-1">Reputation Engine</div>
                                <div className="text-sm font-bold text-white">Suggested Match: <span className="text-[#00ff88]">Prosumer_01</span> has 98% reliability in your cluster.</div>
                            </div>
                        </div>
                        <Button type="link" className="text-[#00e5ff] font-black text-[10px] uppercase">View Trust Matrix</Button>
                    </div>
                </Card>
            )}

            <Row gutter={[32, 32]}>
                <Col xs={24} lg={12}>
                    <Card className="glass-card overflow-hidden" bodyStyle={{ padding: 0 }}>
                        <div className="p-4 border-b border-white/5 bg-white/2">
                            <h3 className="text-sm font-black m-0 uppercase tracking-widest flex items-center gap-2">
                                <Zap size={16} className="text-[#00ff88]" />
                                Ask Book (Surplus)
                            </h3>
                        </div>
                        <Table
                            columns={columns('sell')}
                            dataSource={sells}
                            pagination={false}
                            loading={isLoading}
                            className="glass-table"
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card className="glass-card overflow-hidden" bodyStyle={{ padding: 0 }}>
                        <div className="p-4 border-b border-white/5 bg-white/2">
                            <h3 className="text-sm font-black m-0 uppercase tracking-widest flex items-center gap-2">
                                <ShoppingBag size={16} className="text-[#00e5ff]" />
                                Bid Book (Demand)
                            </h3>
                        </div>
                        <Table
                            columns={columns('buy')}
                            dataSource={buys}
                            pagination={false}
                            loading={isLoading}
                            className="glass-table"
                        />
                    </Card>
                </Col>
            </Row>

            <Modal
                title="Post Energy Listing"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                className="glass-modal"
                centered
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handlePostListing}
                    initialValues={{ type: 'sell' }}
                >
                    <Form.Item name="type" label="Intent">
                        <Select className="custom-select-dark">
                            <Select.Option value="sell">Sell Surplus Energy</Select.Option>
                            <Select.Option value="buy">Request Energy Buy</Select.Option>
                        </Select>
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="volume" label="Volume (kWh)" rules={[{ required: true }]}>
                                <InputNumber className="w-full custom-input-dark" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="price" label="Price (₹/kWh)" rules={[{ required: true }]}>
                                <InputNumber className="w-full custom-input-dark" precision={2} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Button
                        type="primary"
                        htmlType="submit"
                        block
                        loading={postListingMutation.isPending}
                        className="bg-[#00ff88] border-none text-black font-black uppercase h-10 mt-4"
                    >
                        Publish to Ledger
                    </Button>
                </Form>
            </Modal>
        </motion.div>
    );
};

export default Marketplace;
