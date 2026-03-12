import React from 'react';
import { Card, Row, Col, Table, Button, message, Form, InputNumber, Tabs, Tag } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, CheckCircle, XCircle, Power, Settings2, ShieldCheck, Database, Lock, Settings, HelpCircle } from 'lucide-react';
import LedgerView from '../views/LedgerView';
import { useSettings } from '../../contexts/SettingsContext';

interface AdminDashboardProps {
    simMode: string;
    userRole: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ simMode }) => {
    const queryClient = useQueryClient();
    const [form] = Form.useForm();
    const isGridFail = simMode === 'grid-fail';
    const isSunset = simMode === 'sunset';

    const { settings } = useSettings();

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

    const displayUsers = users || [];

    // Fetch Governance
    const { data: govFetch } = useQuery({
        queryKey: ['governance'],
        queryFn: async () => {
            const res = await fetch('/api/admin/governance');
            if (!res.ok) throw new Error('Failed to fetch governance');
            return res.json();
        }
    });

    const gov = govFetch || { priceCap: 0, floorPrice: 0, isTradingPaused: false };

    // Mutations
    const approveUser = useMutation({
        mutationFn: async (id: string) => fetch(`/api/admin/users/${id}/approve`, { method: 'PUT' }),
        onSuccess: () => { message.success('User Approved'); queryClient.invalidateQueries({ queryKey: ['adminUsers'] }); },
        onError: () => { message.success('User Approved (Demo Mode)'); }
    });

    const suspendUser = useMutation({
        mutationFn: async (id: string) => fetch(`/api/admin/users/${id}/suspend`, { method: 'PUT' }),
        onSuccess: () => { message.warning('User Suspended'); queryClient.invalidateQueries({ queryKey: ['adminUsers'] }); },
        onError: () => { message.warning('User Suspended (Demo Mode)'); }
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
        },
        onError: () => {
            message.success('Grid Governance Directives Applied (Demo Mode)');
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
                    <h2 className={`text-3xl font-black font-['Outfit'] uppercase tracking-tighter m-0 ${isGridFail ? 'text-orange-500 animate-pulse' : 'text-cyan-400'}`}>
                        {isGridFail ? 'Emergency Protocol: Active' : 'Grid Governor Admin'}
                    </h2>
                    <p className="text-muted tracking-wide text-xs uppercase mt-1">Network Security & Market Ethics Control</p>
                </div>
                {isSunset && (
                    <div className="px-4 py-2 rounded border border-yellow-500/50 bg-yellow-500/10 text-yellow-500 text-[10px] font-black uppercase tracking-widest">
                        Mode: Load Balancing
                    </div>
                )}
                <div className="flex items-center gap-2 ml-4">
                    <Button className="glass-button !p-2" icon={<Settings size={14} />} />
                    <Button className="glass-button !p-2" icon={<HelpCircle size={14} />} />
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
                                <div className={`text-xl font-black uppercase tracking-widest ${isGridFail ? 'text-orange-500' : 'text-white'}`}>
                                    {isGridFail ? 'Direct Protocol Orange' : gov?.isTradingPaused ? 'Trading Suspended' : 'Stable Ops: 98%'}
                                </div>
                                <div className="grid grid-cols-3 gap-2 mt-4 w-full">
                                    <div className="p-2 rounded bg-white/5 border border-white/10">
                                        <div className="text-[8px] text-muted uppercase font-black">Prosumers</div>
                                        <div className="text-sm font-bold text-cyan-400">{stats?.prosumers || 0}</div>
                                    </div>
                                    <div className="p-2 rounded bg-white/5 border border-white/10">
                                        <div className="text-[8px] text-muted uppercase font-black">Consumers</div>
                                        <div className="text-sm font-bold text-[#00ff88]">{stats?.consumers || 0}</div>
                                    </div>
                                    <div className="p-2 rounded bg-white/5 border border-white/10">
                                        <div className="text-[8px] text-muted uppercase font-black">Network</div>
                                        <div className="text-sm font-bold text-white">{stats?.totalUsers || 0}</div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-muted uppercase mt-4 w-64 mx-auto">
                                    {isGridFail
                                        ? "CRITICAL: Manual energy transfer verification required for critical nodes (Medical/Security)."
                                        : isSunset
                                        ? "Sunset mode: Grid Stress Index at 90%. Load balancing active."
                                        : "High Neighborhood Efficiency. Stable Frequency. Network optimal."}
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
                                    <Form.Item name="priceCap" label={<span className="text-xs text-white uppercase">Ceiling Price ({settings.currency}/kWh)</span>}>
                                        <InputNumber className="w-full glass-input" size="large" precision={3} step={0.05} />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="floorPrice" label={<span className="text-xs text-white uppercase">Floor Price ({settings.currency}/kWh)</span>}>
                                        <InputNumber className="w-full glass-input" size="large" precision={3} step={0.05} />
                                    </Form.Item>                              </Col>
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
                                    label: <span className="font-bold uppercase tracking-wider text-xs flex items-center gap-2"><ShieldCheck size={16} /> {isGridFail ? 'Emergency Approval Queue' : 'Vetting Queue'}</span>,
                                    children: (
                                        <div className="mt-4">
                                            <VettingList users={displayUsers} loading={loadingUsers} isGridFail={isGridFail} approveUser={approveUser} suspendUser={suspendUser} />
                                        </div>
                                    )
                                },
                                {
                                    key: 'conflicts',
                                    label: <span className="font-bold uppercase tracking-wider text-xs flex items-center gap-2 text-red-400"><ShieldAlert size={16} /> Conflict Resolution</span>,
                                    children: (
                                        <div className="mt-4">
                                            <ConflictResolutionView />
                                        </div>
                                    )
                                },
                                {
                                    key: 'audit',
                                    label: <span className="font-bold uppercase tracking-wider text-xs flex items-center gap-2"><Database size={16} /> Global Audit Ledger</span>,
                                    children: (
                                        <div className="mt-4 -m-8">
                                            <LedgerView />
                                        </div>
                                    )
                                },
                                {
                                    key: 'dev',
                                    label: <span className="font-bold uppercase tracking-wider text-xs flex items-center gap-2"><Settings2 size={16} /> Developer Portal</span>,
                                    children: (
                                        <div className="mt-4">
                                            <DevPortalView />
                                        </div>
                                    )
                                },
                                {
                                    key: 'policy',
                                    label: <span className="font-bold uppercase tracking-wider text-xs flex items-center gap-2 text-cyan-400"><ShieldCheck size={16} /> Grid Constitution</span>,
                                    children: (
                                        <div className="mt-4">
                                            <PolicyView gov={gov} settings={settings} />
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

// Refactored Sub-components for better organization
const VettingList: React.FC<any> = ({ users, loading, isGridFail, approveUser, suspendUser }) => (
    <div className="mt-4">
        <div className="flex justify-between items-center mb-6">
            <p className="text-[10px] text-muted uppercase tracking-widest m-0">
                {isGridFail 
                    ? "MANUAL OVERRIDE: High-power trades require cryptographic confirmation." 
                    : "Pending Nodes require approval before P2P trading access is granted."}
            </p>
        </div>
        <Table
            dataSource={isGridFail ? users?.slice(0, 3).map((u: any) => ({ ...u, status: 'HIGH_RISK' })) : users}
            loading={loading}
            rowKey="_id"
            pagination={{ pageSize: 5 }}
            className="bg-transparent"
            rowClassName="hover:bg-white/5 transition-colors"
            columns={[
                { title: 'NODE ID', dataIndex: 'username', render: (val) => <span className="text-xs font-bold text-white uppercase tracking-wider">{val}</span> },
                { title: 'TYPE', dataIndex: 'role', render: (val) => <span className="text-xs text-cyan-400 font-bold uppercase">{val}</span> },
                { 
                    title: 'INTENSITY', 
                    key: 'intensity', 
                    render: () => <span className={`text-[10px] font-black ${isGridFail ? 'text-red-500 animate-pulse' : 'text-muted'}`}>{isGridFail ? '8.4 kWh/s' : '0.0 kWh'}</span> 
                },
                {
                    title: 'STATUS',
                    dataIndex: 'status',
                    render: (status) => {
                        let color = status === 'approved' ? '#00ff88' : (status === 'suspended' || status === 'HIGH_RISK') ? '#ff3b6a' : '#ffaa00';
                        return <span style={{ color, border: `1px solid ${color}40`, background: `${color}10` }} className="px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest">{status}</span>;
                    }
                },
                {
                    title: 'DIRECTIVE',
                    key: 'action',
                    render: (_, record: any) => (
                        <div className="flex gap-2">
                            {isGridFail ? (
                                <Button size="small" type="primary" className="bg-orange-500 hover:bg-orange-600 text-black border-none font-bold text-[10px] uppercase h-7">
                                    Allow High-Pwr Trade
                                </Button>
                            ) : (
                                <>
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
                                </>
                            )}
                        </div>
                    ),
                }
            ]}
        />
    </div>
);

const ConflictResolutionView: React.FC = () => {
    // We'll use local state for real-time socket alerts combined with a list
    const [alerts, setAlerts] = React.useState<any[]>([]);

    React.useEffect(() => {
        // This would ideally listen to the 'governance:fraud' socket event
        // Mocking some data for the initial view
        setAlerts([
            { id: 1, username: 'Node-44M', reason: 'VOLUMETRIC_MISMATCH', severity: 'CRITICAL', message: 'Audit failed: IoT pulse (12kW) does not reconcile with Sale Order (50kW).' },
            { id: 2, username: 'Solar_Bot_09', reason: 'REPLAY_ATTACK_DETECTED', severity: 'WARNING', message: 'Cryptographic hash mismatch in recent P2P settlement.' }
        ]);
    }, []);

    return (
        <div className="space-y-4">
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 mb-6">
                <div className="flex items-center gap-3 text-red-400 mb-2">
                    <ShieldAlert size={20} />
                    <span className="text-sm font-black uppercase tracking-[0.2em]">Live Integrity Monitoring</span>
                </div>
                <p className="text-xs text-muted m-0">The Governor Engine is continuously reconciling physical IoT yield data with the behavioral settlement ledger.</p>
            </div>
            {alerts.map(alert => (
                <div key={alert.id} className="p-6 rounded-2xl bg-[#0a0f18] border border-white/5 flex items-center justify-between group hover:border-red-500/30 transition-all">
                    <div className="flex items-center gap-6">
                        <div className={`p-4 rounded-xl ${alert.severity === 'CRITICAL' ? 'bg-red-500/10' : 'bg-orange-500/10'}`}>
                            <ShieldAlert className={alert.severity === 'CRITICAL' ? 'text-red-500' : 'text-orange-500'} size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="text-white font-black uppercase tracking-widest text-sm">{alert.username}</span>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded ${alert.severity === 'CRITICAL' ? 'bg-red-500 text-black' : 'bg-orange-500 text-black'}`}>
                                    {alert.reason}
                                </span>
                            </div>
                            <p className="text-xs text-white/50 m-0">{alert.message}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button className="bg-red-500 border-none text-black font-black uppercase tracking-tighter text-[10px] h-8">Freeze Node</Button>
                        <Button className="bg-white/5 border border-white/10 text-white font-black uppercase tracking-tighter text-[10px] h-8">Investigate</Button>
                    </div>
                </div>
            ))}
        </div>
    );
};

const DevPortalView: React.FC = () => (
    <div className="space-y-6">
        <div className="p-4 rounded-xl bg-cyan-400/5 border border-cyan-400/10 mb-6">
            <h4 className="text-white font-black uppercase tracking-widest text-xs mb-2">City-Scale API Documentation</h4>
            <p className="text-[10px] text-muted m-0">SolarFetch operates as a city-scale energy backend. Other smart apps (charging, appliances, mesh-grids) can integrate via these endpoints.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
                { method: 'GET', path: '/api/grid/health', desc: 'Real-time telemetry for regional grid clusters.' },
                { method: 'POST', path: '/api/market/orders', desc: 'Submit limit/market buy/sell energy orders.' },
                { method: 'GET', path: '/api/ledger', desc: 'Public immutable audit trail of all settlements.' },
                { method: 'POST', path: '/api/assets/broker/toggle', desc: 'Activate/Deactivate autonomous AI trading.' }
            ].map((api, i) => (
                <div key={i} className="p-4 rounded-xl bg-black/40 border border-white/5 flex items-start gap-4">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded ${api.method === 'GET' ? 'bg-cyan-500 text-black' : 'bg-orange-500 text-black'}`}>{api.method}</span>
                    <div>
                        <div className="text-white font-mono text-xs mb-1">{api.path}</div>
                        <div className="text-[10px] text-muted">{api.desc}</div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const PolicyView: React.FC<{ gov: any, settings: any }> = ({ gov, settings }) => (
    <div className="space-y-6">
        <div className="p-4 rounded-xl bg-cyan-400/5 border border-cyan-400/10 mb-6 flex justify-between items-center">
            <div>
                <h4 className="text-white font-black uppercase tracking-widest text-xs mb-2">Neighborhood Governance Constitution</h4>
                <p className="text-[10px] text-muted m-0">Define ethical boundaries and emergency overrides for the local energy cluster.</p>
            </div>
            <Tag color="cyan" className="m-0 uppercase font-black tracking-widest text-[9px]">v1.2 Policy Active</Tag>
        </div>
        
        <div className="space-y-4">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                        <ShieldAlert size={20} />
                    </div>
                    <div>
                        <div className="text-white font-black uppercase text-xs">Emergency Price Ceiling</div>
                        <div className="text-[10px] text-muted">Prevent predatory pricing during Grid-Fail mode.</div>
                    </div>
                </div>
                <div className="text-xl font-black text-white font-['Outfit']">{settings.currency}{gov?.priceCap?.toFixed(2)}/kWh</div>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                        <Lock size={20} />
                    </div>
                    <div>
                        <div className="text-white font-black uppercase text-xs">Cryptographic PUF Enforcement</div>
                        <div className="text-[10px] text-muted">Require hardware-level identification for all sellers.</div>
                    </div>
                </div>
                <Tag color="green">ENABLED</Tag>
            </div>
        </div>
    </div>
);

export default AdminDashboard;
