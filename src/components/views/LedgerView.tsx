import React from 'react';
import { Card, Table, Tag, Input, Button, Row, Col } from 'antd';
import { Database, Search, ShieldCheck, Download, Box, Activity, Zap, Lock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface LedgerViewProps {
    simMode?: string;
    userRole?: 'resident' | 'admin';
}

const LedgerView: React.FC<LedgerViewProps> = () => {
    const [ledgerData, setLedgerData] = React.useState<any[]>([]);

    React.useEffect(() => {
        const fetchLedger = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/ledger');
                if (res.ok) {
                    const data = await res.json();
                    setLedgerData(data.map((tx: any) => ({
                        ...tx,
                        key: tx._id,
                        timestamp: new Date(tx.timestamp).toLocaleTimeString()
                    })));
                }
            } catch (err) {
                console.error("Failed to fetch ledger", err);
            }
        };
        fetchLedger();
    }, []);

    const columns = [
        {
            title: 'Provenance',
            key: 'provenance',
            render: (row: any) => (
                <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-[#00ff88]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#00ff88]">{row.provenance}</span>
                </div>
            )
        },
        {
            title: 'Block / TXID',
            dataIndex: 'txid',
            key: 'txid',
            render: (text: string) => (
                <div className="flex items-center gap-2">
                    <Box size={14} className="text-muted" />
                    <span className="font-mono text-xs font-bold text-[#00e5ff]">{text}</span>
                </div>
            )
        },
        {
            title: 'Audit Hash',
            dataIndex: 'hash',
            key: 'hash',
            render: (text: string) => (
                <div className="flex items-center gap-2">
                    <Lock size={12} className="text-muted" />
                    <span className="font-mono text-[10px] text-muted">{text}</span>
                </div>
            )
        },
        {
            title: 'Counterparties',
            key: 'parties',
            render: (row: any) => (
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-white font-bold">{row.from}</span>
                    <ArrowRight size={12} className="text-muted" />
                    <span className="text-white font-bold">{row.to}</span>
                </div>
            )
        },
        {
            title: 'Energy',
            dataIndex: 'amount',
            key: 'amount',
            render: (val: number) => <span className="font-black text-white">{val} <span className="text-[10px] text-muted">kWh</span></span>
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag className={status === 'SETTLED' ? 'tag-verified' : 'tag-pending'}>
                    {status}
                </Tag>
            )
        }
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4"
        >
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-2xl font-black font-['Outfit'] m-0 uppercase tracking-tighter flex items-center gap-4">
                        Immutable Audit Ledger
                        <Tag color="cyan" className="m-0 text-[10px] font-black uppercase">Consensus Layer v4.1</Tag>
                    </h2>
                    <p className="text-sm text-muted m-0">Verifiable provenance and green certificates for every peer-to-peer settlement</p>
                </div>
                <div className="flex gap-4">
                    <Button icon={<Download size={18} />} className="glass-btn-secondary">Export CSV</Button>
                    <Button type="primary" className="glass-btn-primary">Verify Full Chain</Button>
                </div>
            </div>

            <Card className="glass-card mb-8 border-[#00e5ff]/20 bg-[#00e5ff]/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#00e5ff]/10 flex items-center justify-center text-[#00e5ff]">
                            <Database size={24} />
                        </div>
                        <div>
                            <div className="text-[10px] text-[#00e5ff] font-black uppercase tracking-widest mb-1">Blockchain Synchronized</div>
                            <div className="text-sm font-bold text-white">Genesis Block #822,104 settled with 99.9% network consensus.</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-8">
                        <Input
                            prefix={<Search size={16} className="text-muted" />}
                            placeholder="Search Hash or TXID..."
                            className="w-64 custom-input-dark"
                        />
                    </div>
                </div>
            </Card>

            <Row gutter={[24, 24]} className="mb-8">
                <Col span={6}>
                    <Card className="glass-card">
                        <div className="text-[10px] text-muted font-black uppercase tracking-widest mb-1">Total Settled</div>
                        <div className="text-2xl font-black text-white">1,248.5 <span className="text-xs font-normal">kWh</span></div>
                        <div className="text-[10px] text-[#00ff88] mt-1 font-bold">Resilience Buffer: Active</div>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="glass-card">
                        <div className="text-[10px] text-muted font-black uppercase tracking-widest mb-1">Network Hashrate</div>
                        <div className="text-xl font-bold text-[#00e5ff] flex items-center gap-2">
                            <Activity size={16} />
                            42.5 TH/s
                        </div>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="glass-card">
                        <div className="text-[10px] text-muted font-black uppercase tracking-widest mb-1">Active Validators</div>
                        <div className="text-xl font-bold text-white flex items-center gap-2">
                            <Zap size={16} className="text-[#00ff88]" />
                            16 Nodes
                        </div>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="glass-card">
                        <div className="text-[10px] text-muted font-black uppercase tracking-widest mb-1">Chain State</div>
                        <div className="text-xl font-bold text-[#00ff88] flex items-center gap-2">
                            <Database size={16} />
                            HEALTHY
                        </div>
                    </Card>
                </Col>
            </Row>

            <Card className="glass-card overflow-hidden" bodyStyle={{ padding: 0 }}>
                <Table
                    columns={columns}
                    dataSource={ledgerData}
                    pagination={false}
                    className="glass-table"
                />
            </Card>
        </motion.div>
    );
};

export default LedgerView;
