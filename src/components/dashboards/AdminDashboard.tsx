import React from 'react';
import { Card, Row, Col, Table, Button, message, Form, InputNumber, Tabs } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, CheckCircle, XCircle, Power, Settings2, ShieldCheck, Database } from 'lucide-react';
import LedgerView from '../views/LedgerView';

const AdminDashboard: React.FC = () => {
    const queryClient = useQueryClient();
    const [form] = Form.useForm();

    // Fetch Pending Users
    const { data: users, isLoading: loadingUsers } = useQuery({
        queryKey: ['adminUsers'],
        queryFn: async () => {
            const res = await fetch('/api/admin/users');
            if (!res.ok) throw new Error('Failed to fetch users');
            return res.json();
        },
        refetchInterval: 5000
    });

    // Fetch Governance
    const { data: gov } = useQuery({
        queryKey: ['governance'],
        queryFn: async () => {
            const res = await fetch('/api/admin/governance');
            if (!res.ok) throw new Error('Failed to fetch governance');
            return res.json();
        }
    });

    // Mutations
    const approveUser = useMutation({
        mutationFn: async (id: string) => fetch(`/api/admin/users/${id}/approve`, { method: 'PUT' }),
        onSuccess: () => { message.success('User Approved'); queryClient.invalidateQueries({ queryKey: ['adminUsers'] }); }
    });

    const suspendUser = useMutation({
        mutationFn: async (id: string) => fetch(`/api/admin/users/${id}/suspend`, { method: 'PUT' }),
        onSuccess: () => { message.warning('User Suspended'); queryClient.invalidateQueries({ queryKey: ['adminUsers'] }); }
    });

    const updateGovernance = useMutation({
        mutationFn: async (payload: any) => {
            const res = await fetch('/api/admin/governance', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Update failed');
            return res.json();
        },
        onSuccess: (data) => {
            message.success('Grid Governance Updated');
            form.setFieldsValue(data);
            queryClient.invalidateQueries({ queryKey: ['governance'] });
        }
    });

    // Set form initial values when gov loads
    React.useEffect(() => {
        if (gov) form.setFieldsValue({ priceCap: gov.priceCap, floorPrice: gov.floorPrice });
    }, [gov, form]);

    return (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black font-['Outfit'] uppercase tracking-tighter text-cyan-400 m-0">Grid Governor Admin</h2>
                    <p className="text-muted tracking-wide text-xs uppercase mt-1">Network Security & Market Ethics Control</p>
                </div>
            </div>

            <Row gutter={[24, 24]}>
                {/* Kill Switch Widget */}
                <Col xs={24} lg={8}>
                    <Card className="glass-card h-full" bodyStyle={{ padding: '24px' }}>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 m-0 mb-6">
                            <ShieldAlert size={16} className="text-[#ff3b6a]" /> Grid-Wide Kill Switch
                        </h3>

                        <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-white/5 border border-white/10 relative overflow-hidden">
                            {gov?.isTradingPaused && (
                                <div className="absolute inset-0 bg-[#ff3b6a]/10 animate-pulse pointer-events-none" />
                            )}

                            <Button
                                type="primary"
                                danger={!gov?.isTradingPaused}
                                icon={<Power size={32} />}
                                style={{
                                    width: 120, height: 120, borderRadius: '50%',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: gov?.isTradingPaused ? '0 0 40px rgba(0,255,136,0.3)' : '0 0 40px rgba(255,59,106,0.5)',
                                    background: gov?.isTradingPaused ? '#00e5ff' : '#ff3b6a',
                                    border: 'none'
                                }}
                                onClick={() => updateGovernance.mutate({ isTradingPaused: !gov?.isTradingPaused })}
                                loading={updateGovernance.isPending}
                            />

                            <div className="mt-8 text-center">
                                <div className="text-xl font-black text-white uppercase tracking-widest">
                                    {gov?.isTradingPaused ? 'Trading Suspended' : 'Trading Active'}
                                </div>
                                <div className="text-[10px] text-muted uppercase mt-2 w-64">
                                    {gov?.isTradingPaused
                                        ? "P2P Matching Engine is currently offline. No new orders are being accepted."
                                        : "Network is stable. Market matching engine is operational."}
                                </div>
                            </div>
                        </div>
                    </Card>
                </Col>

                {/* Neighborhood Governance Form */}
                <Col xs={24} lg={16}>
                    <Card className="glass-card h-full" bodyStyle={{ padding: '24px' }}>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 m-0 mb-6">
                            <Settings2 size={16} className="text-cyan-400" /> Neighborhood Governance (Price Limits)
                        </h3>
                        <p className="text-xs text-muted mb-8">Set ethical boundaries on the market engine to prevent predatory pricing during local grid stress (e.g. blackouts) or to protect active generators from crashing prices.</p>

                        <Form form={form} layout="vertical" onFinish={(values) => updateGovernance.mutate(values)}>
                            <Row gutter={24}>
                                <Col span={12}>
                                    <Form.Item name="priceCap" label={<span className="text-xs text-white uppercase">Ceiling Price (₹/kWh)</span>}>
                                        <InputNumber className="w-full glass-input" size="large" precision={3} step={0.05} />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="floorPrice" label={<span className="text-xs text-white uppercase">Floor Price (₹/kWh)</span>}>
                                        <InputNumber className="w-full glass-input" size="large" precision={3} step={0.05} />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Button type="primary" htmlType="submit" className="bg-[#00e5ff] hover:bg-[#00ff88] text-black font-black uppercase border-none w-48 h-10 mt-2" loading={updateGovernance.isPending}>
                                Apply Directives
                            </Button>
                        </Form>
                    </Card>
                </Col>

                <Col xs={24}>
                    <Card bodyStyle={{ padding: '32px' }} className="glass-card mt-4">
                        <Tabs
                            defaultActiveKey="vetting"
                            items={[
                                {
                                    key: 'vetting',
                                    label: <span className="font-bold uppercase tracking-wider text-xs flex items-center gap-2"><ShieldCheck size={16} /> Vetting Queue</span>,
                                    children: (
                                        <div className="mt-4">
                                            <p className="text-[10px] text-muted uppercase tracking-widest mb-6">Pending Nodes require cryptographic approval before P2P trading access is granted.</p>
                                            <Table
                                                dataSource={users}
                                                loading={loadingUsers}
                                                rowKey="_id"
                                                pagination={{ pageSize: 5 }}
                                                className="bg-transparent"
                                                rowClassName="hover:bg-white/5 transition-colors"
                                                columns={[
                                                    { title: 'ALIAS', dataIndex: 'username', render: (val) => <span className="text-xs font-bold text-white uppercase tracking-wider">{val}</span> },
                                                    { title: 'ROLE', dataIndex: 'role', render: (val) => <span className="text-xs text-cyan-400 font-bold uppercase">{val}</span> },
                                                    { title: 'EMAIL', dataIndex: 'email', render: (val) => <span className="text-xs text-muted font-mono">{val}</span> },
                                                    {
                                                        title: 'STATUS',
                                                        dataIndex: 'status',
                                                        render: (status) => {
                                                            let color = status === 'approved' ? '#00ff88' : status === 'suspended' ? '#ff3b6a' : '#ffaa00';
                                                            return <span style={{ color, border: `1px solid ${color}40`, background: `${color}10` }} className="px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest">{status}</span>;
                                                        }
                                                    },
                                                    {
                                                        title: 'ADMIN OVERRIDE',
                                                        key: 'action',
                                                        render: (_, record: any) => (
                                                            <div className="flex gap-2">
                                                                {record.status !== 'approved' && (
                                                                    <Button size="small" type="primary" onClick={() => approveUser.mutate(record._id)} loading={approveUser.isPending} className="bg-[#00ff88] hover:bg-[#00e5ff] text-black border-none font-bold text-[10px] uppercase h-7 flex items-center gap-1">
                                                                        <CheckCircle size={12} /> Approve
                                                                    </Button>
                                                                )}
                                                                {record.status !== 'suspended' && (
                                                                    <Button size="small" danger onClick={() => suspendUser.mutate(record._id)} loading={suspendUser.isPending} className="font-bold text-[10px] uppercase h-7 flex items-center gap-1">
                                                                        <XCircle size={12} /> Suspend
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        ),
                                                    }
                                                ]}
                                            />
                                        </div>
                                    )
                                },
                                {
                                    key: 'audit',
                                    label: <span className="font-bold uppercase tracking-wider text-xs flex items-center gap-2"><Database size={16} /> Global Audit Ledger</span>,
                                    children: (
                                        <div className="mt-4 -m-8">
                                            {/* Render Ledger without a Card wrap since we are in one */}
                                            <LedgerView />
                                        </div>
                                    )
                                }
                            ]}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default AdminDashboard;
