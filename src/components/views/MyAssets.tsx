import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Progress, Table, Tag, Switch, Space, Button } from 'antd';
import { ShieldCheck, Activity, Cpu, Terminal as TerminalIcon, RefreshCcw, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';

interface MyAssetsProps {
    simMode?: string;
    userRole?: 'resident' | 'admin';
}

const MyAssets: React.FC<MyAssetsProps> = ({ simMode }) => {
    const [autoTrade, setAutoTrade] = useState(true);
    const [logs, setLogs] = useState<string[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Simulated IoT Log Pulses
    useEffect(() => {
        const interval = setInterval(() => {
            const timestamp = new Date().toLocaleTimeString();
            const voltage = (230 + Math.random() * 5).toFixed(2);
            const current = (10 + Math.random() * 2).toFixed(2);
            const activePower = (parseFloat(voltage) * parseFloat(current) / 1000).toFixed(3);

            const newLog = `[${timestamp}] RAW_PACKET: { "v": ${voltage}, "a": ${current}, "p": ${activePower}, "unit": "kW" }`;
            setLogs(prev => [...prev.slice(-15), newLog]);
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const { data: assets = [], isLoading } = useQuery({
        queryKey: ['assets'],
        queryFn: async () => {
            const res = await fetch('/api/assets');
            if (!res.ok) throw new Error('Failed to fetch assets');
            const data = await res.json();
            return data.map((item: any) => ({
                key: item._id,
                name: item.name,
                type: item.type,
                status: item.status,
                output: `${item.output} ${item.type === 'Storage' ? 'kWh' : 'kW'}`,
                efficiency: item.efficiency,
                hardwareId: item.hardwareId
            }));
        }
    });

    const columns = [
        { title: 'Asset Name', dataIndex: 'name', key: 'name', render: (text: string) => <span className="font-bold text-white">{text}</span> },
        { title: 'Type', dataIndex: 'type', key: 'type', render: (type: string) => <Tag className="tag-ledger">{type}</Tag> },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag className="tag-verified">{status}</Tag> },
        { title: 'Live Performance', dataIndex: 'efficiency', key: 'efficiency', render: (eff: number) => <span className="neon-text-green font-mono font-bold text-xs">{eff}%</span> },
    ];

    return (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
            {/* Header with Automation Control */}
            <div className="flex justify-between items-center mb-10 pt-4">
                <div>
                    <h2 className="text-2xl font-black font-['Outfit'] m-0 uppercase tracking-tighter">Prosumer Asset Management</h2>
                    <p className="text-sm text-muted m-0">IoT-integrated monitoring and autonomous energy distribution</p>
                </div>
                <div className="glass-card px-6 py-4 flex items-center gap-6 border-[#00ff88]/20 bg-[#00ff88]/5">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-[#00ff88] font-black uppercase tracking-widest">Autonomous Strategy</span>
                        <span className="text-xs font-bold text-white">Auto-Trade Surplus</span>
                    </div>
                    <Switch
                        checked={autoTrade}
                        onChange={setAutoTrade}
                        className={autoTrade ? 'bg-[#00ff88]' : 'bg-white/20'}
                    />
                </div>
            </div>

            {/* Smart Home API Integration Section */}
            <Card className="glass-card mb-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold m-0 flex items-center gap-3">
                            <Cpu size={22} className="text-[#00e5ff]" />
                            Smart Home integration (API)
                        </h3>
                        <p className="text-xs text-muted m-0 uppercase tracking-widest mt-1">Autonomous device control via SolarFetch API v1.4</p>
                    </div>
                    <Tag className="tag-verified">System: Operational</Tag>
                </div>

                <Row gutter={[24, 24]} className="mb-10">
                    {/* IoT Security Hub */}
                    <Col xs={24} lg={12}>
                        <Card className="glass-card h-full" bodyStyle={{ padding: '1.5rem' }}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-black m-0 uppercase tracking-widest flex items-center gap-3">
                                    <ShieldCheck size={20} className="text-[#00ff88]" />
                                    IoT Security (mTLS + PUF)
                                </h3>
                                <Tag color="success" className="m-0 font-bold uppercase text-[9px] border-none bg-[#00ff88]/10 text-[#00ff88]">Zero-Trust Active</Tag>
                            </div>
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center">
                                    <div>
                                        <div className="text-[10px] text-muted font-bold uppercase mb-1">Hardware ID (PUF Fingerprint)</div>
                                        <div className="text-xs font-mono text-white">GEN2-FPR-8F2D-Q921</div>
                                    </div>
                                    <div className="text-right">
                                        <Tag className="tag-verified m-0">Verified</Tag>
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="text-[10px] text-muted font-bold uppercase">mTLS Certificate Status</div>
                                        <div className="text-[10px] text-[#00ff88] font-bold">Expires: 2027-10</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div className="w-full h-full bg-[#00ff88]" />
                                        </div>
                                        <span className="text-[10px] font-black text-white">SECURE</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </Col>

                    {/* ESG Reporting */}
                    <Col xs={24} lg={12}>
                        <Card className="glass-card h-full" bodyStyle={{ padding: '1.5rem' }}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-black m-0 uppercase tracking-widest flex items-center gap-3">
                                    <Globe size={20} className="text-[#00e5ff]" />
                                    ESG & Carbon Provenance
                                </h3>
                                <Tag className="m-0 font-bold uppercase text-[9px] border-none bg-[#00e5ff]/10 text-[#00e5ff]">Verified Green</Tag>
                            </div>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <div className="p-4 rounded-xl bg-white/2 border border-white/5 text-center">
                                        <div className="text-[10px] text-muted font-bold uppercase mb-2">CO2 Offset (MTD)</div>
                                        <div className="text-2xl font-black text-white">0.84 <span className="text-xs font-normal opacity-50">tons</span></div>
                                        <div className="text-[9px] text-[#00ff88] font-bold mt-1">+12% vs last month</div>
                                    </div>
                                </Col>
                                <Col span={12}>
                                    <div className="p-4 rounded-xl bg-white/2 border border-white/5 text-center">
                                        <div className="text-[10px] text-muted font-bold uppercase mb-2">Green Certificates</div>
                                        <div className="text-2xl font-black text-[#00ff88]">142</div>
                                        <div className="text-[9px] text-muted font-bold mt-1">Blockchain Registered</div>
                                    </div>
                                </Col>
                            </Row>
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[24, 24]}>
                    <Col span={12}>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="text-[10px] text-muted font-bold uppercase tracking-widest mb-3">API Access Token</div>
                            <div className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-white/5 font-mono text-xs">
                                <span className="text-[#00ff88]">sk_live_grid_5521x_alpha_...</span>
                                <Button type="text" size="small" className="text-muted hover:text-white p-0">COPY</Button>
                            </div>
                            <div className="mt-4 text-[10px] text-muted">
                                Integration Hook: <code className="text-[#00e5ff]">POST /v1/market/auto-buy</code>
                            </div>

                            {/* LIVE API QUERY LOG */}
                            <div className="mt-8">
                                <div className="text-[10px] text-muted font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Activity size={10} /> Live Device Requests
                                </div>
                                <div className="api-query-log custom-scrollbar">
                                    <div className="api-query-item">18:24:01 [AUTH] Smart_Fridge_v2 Querying Market Price...</div>
                                    <div className="api-query-item">18:24:02 [GET] /v1/market/price {"->"} $0.11/kWh</div>
                                    <div className="api-query-item">18:24:05 [POST] /v1/auto-buy Triggered (Set: $0.12)</div>
                                    <div className="api-query-item">18:24:10 [AUTH] Tesla_Wall_Gen4 Authenticated.</div>
                                    <div className="api-query-item">18:24:12 [GET] /v1/battery/state {"->"} 88% OK</div>
                                </div>
                            </div>
                        </div>
                    </Col>
                    <Col span={12}>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5 h-full">
                            <div className="text-[10px] text-muted font-bold uppercase tracking-widest mb-3">API Performance (24h)</div>
                            <div className="flex items-center gap-4">
                                <div className="text-2xl font-black text-white">42</div>
                                <div className="text-[10px] text-[#00ff88]">+12.4% vs last period</div>
                            </div>
                            <div className="text-xs text-muted mt-2">API-triggered trades successfully processed by smart contract matching.</div>
                        </div>
                    </Col>
                </Row>
            </Card>

            <Row gutter={[32, 32]}>
                {/* Visual IoT Monitoring */}
                <Col xs={24} lg={16}>
                    <Card className="glass-card mb-8">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-lg font-bold m-0 flex items-center gap-3">
                                <Activity size={22} className="neon-text-green" />
                                Live IoT Telemetry
                            </h3>
                            <Space>
                                <Tag className="bg-white/5 border-white/10 text-muted font-mono text-[9px]">HW_REVISION: v2.4.1</Tag>
                                <Tag className="bg-white/5 border-white/10 text-muted font-mono text-[9px]">MAC: 4F:2E:8A:1B:9C:0D</Tag>
                            </Space>
                        </div>

                        <Row gutter={24} justify="space-around">
                            <Col span={7}>
                                <div className="flex flex-col items-center">
                                    <Progress
                                        type="circle"
                                        percent={88}
                                        strokeColor={{ '0%': '#00ff88', '100%': '#00e5ff' }}
                                        strokeWidth={10}
                                        width={140}
                                        format={(percent) => (
                                            <div className="flex flex-col items-center">
                                                <span className="text-2xl font-black text-white">{percent}%</span>
                                                <span className="text-[8px] text-muted uppercase tracking-widest leading-none mt-1">Solar Yield</span>
                                            </div>
                                        )}
                                    />
                                    <div className="mt-6 text-center">
                                        <div className="text-[10px] text-muted uppercase font-bold tracking-widest mb-1">Current Output</div>
                                        <div className="text-lg font-black text-white">4.82 kW</div>
                                    </div>
                                </div>
                            </Col>
                            <Col span={7}>
                                <div className="flex flex-col items-center">
                                    <Progress
                                        type="circle"
                                        percent={94}
                                        strokeColor={{ '0%': '#8b5cf6', '100%': '#00e5ff' }}
                                        strokeWidth={10}
                                        width={140}
                                        format={(percent) => (
                                            <div className="flex flex-col items-center">
                                                <span className="text-2xl font-black text-white">{percent}%</span>
                                                <span className="text-[8px] text-muted uppercase tracking-widest leading-none mt-1">Batt Health</span>
                                            </div>
                                        )}
                                    />
                                    <div className="mt-6 text-center">
                                        <div className="text-[10px] text-muted uppercase font-bold tracking-widest mb-1">Stored Capacity</div>
                                        <div className="text-lg font-black text-white">12.8 kWh</div>
                                    </div>
                                </div>
                            </Col>
                            <Col span={7}>
                                <div className="flex flex-col items-center">
                                    <Progress
                                        type="circle"
                                        percent={62}
                                        strokeColor={{ '0%': '#ffaa00', '100%': '#ff5500' }}
                                        strokeWidth={10}
                                        width={140}
                                        format={(percent) => (
                                            <div className="flex flex-col items-center">
                                                <span className="text-2xl font-black text-white">{percent}%</span>
                                                <span className="text-[8px] text-muted uppercase tracking-widest leading-none mt-1">Grid Indep.</span>
                                            </div>
                                        )}
                                    />
                                    <div className="mt-6 text-center">
                                        <div className="text-[10px] text-muted uppercase font-bold tracking-widest mb-1">Consumption</div>
                                        <div className="text-lg font-black text-white">2.41 kW</div>
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    </Card>

                    <Card className="glass-card" bodyStyle={{ padding: 0 }}>
                        <div className="p-6 pb-2 flex justify-between items-center">
                            <h3 className="text-lg font-bold m-0 flex items-center gap-3">
                                <Cpu size={22} className="text-muted" />
                                Hardware Inventory
                            </h3>
                            <Button type="text" icon={<RefreshCcw size={16} />} className="text-muted hover:text-[#00ff88]" />
                        </div>
                        <Table
                            columns={columns}
                            dataSource={assets}
                            pagination={false}
                            loading={isLoading}
                            className="custom-table"
                            size="small"
                        />
                    </Card>
                </Col>

                {/* API Log / Terminal Column */}
                <Col xs={24} lg={8}>
                    {/* Household-Level Analytics */}
                    <Card className="glass-card mb-8">
                        <div className="text-[10px] text-muted font-black uppercase tracking-widest mb-4">P2P Financials (MTD)</div>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-xs text-slate-400">Total Income</span>
                                    <span className="text-lg font-black text-[#00ff88]">$342.10</span>
                                </div>
                                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                    <div className="bg-[#00ff88] h-full w-[65%]" />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-xs text-slate-400">Grid Savings</span>
                                    <span className="text-lg font-black text-[#00e5ff]">$128.45</span>
                                </div>
                                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                    <div className="bg-[#00e5ff] h-full w-[40%]" />
                                </div>
                            </div>
                            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted">
                                    <span>Avg. Sell Price</span>
                                    <span className="text-white">$0.12/kWh</span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="glass-card h-full bg-black/40 flex flex-col border-white/5" bodyStyle={{ padding: 0, height: '100%', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
                        <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <TerminalIcon size={18} className="neon-text-cyan" />
                                <span className="text-xs font-black uppercase tracking-widest font-mono text-white">Smart Meter API Feed</span>
                            </div>
                            <div className="flex gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                                <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                                <div className="w-2 h-2 rounded-full bg-green-500/50" />
                            </div>
                        </div>

                        <div
                            ref={scrollRef}
                            className="flex-1 p-4 font-mono text-[10px] overflow-y-auto custom-scrollbar leading-relaxed"
                            style={{ backgroundColor: '#04070a' }}
                        >
                            <div className="text-[#00ff88] mb-2 font-bold uppercase tracking-widest leading-none flex items-center gap-2">
                                {simMode === 'grid-fail' && <span className="text-red-500 animate-pulse">[!]</span>}
                                {">> "} Initializing Secure Handshake...
                            </div>
                            <div className="text-[#00ff88] mb-4">{">> "} Connection Established [MQTT@TLSv1.3]</div>
                            <AnimatePresence>
                                {logs.map((log: string, i: number) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="text-slate-400 mb-1"
                                    >
                                        <span className="text-[#00e5ff] mr-2">LOG:</span>
                                        {log}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            <div className="mt-4 flex items-center gap-2">
                                <span className="w-2 h-4 bg-[#00ff88] animate-pulse" />
                                <span className="text-muted italic">Listening for next pulse...</span>
                            </div>
                        </div>

                        <div className="p-4 bg-white/5 border-t border-white/10">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] text-muted font-bold uppercase tracking-widest">Protocol Buffer Health</span>
                                <span className="text-[10px] text-[#00ff88] font-black">STABLE</span>
                            </div>
                            <Progress percent={98} showInfo={false} strokeColor="#00ff88" size="small" strokeWidth={4} />
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default MyAssets;
