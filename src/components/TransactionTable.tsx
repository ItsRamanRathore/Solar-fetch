import React from 'react';
import { Card, Table, Tag, Space } from 'antd';
import { ShieldCheck, Database, Box, ArrowRight, Zap } from 'lucide-react';

const TransactionTable: React.FC = () => {
    const columns = [
        {
            title: 'TX HASH',
            dataIndex: 'hash',
            key: 'hash',
            render: (text: string) => (
                <span className="font-mono text-[10px] text-slate-400 hover:text-[#00e5ff] cursor-pointer transition-colors">
                    {text.substring(0, 10)}...
                </span>
            ),
        },
        {
            title: 'ASSET (TOKEN)',
            dataIndex: 'asset',
            key: 'asset',
            render: (asset: string) => (
                <Space size="small">
                    <Box size={14} className="neon-text-green" />
                    <span className="text-xs font-bold text-slate-200">{asset}</span>
                </Space>
            ),
        },
        {
            title: 'VOLUME',
            dataIndex: 'volume',
            key: 'volume',
            render: (vol: number) => (
                <span className="text-xs font-bold text-[#00ff88]">+{vol} kWh</span>
            ),
        },
        {
            title: 'STATUS',
            key: 'status',
            dataIndex: 'status',
            render: (status: string) => (
                <Tag color={status === 'Verified' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(0, 229, 255, 0.1)'}
                    className={`border-none text-[10px] font-bold uppercase rounded-full ${status === 'Verified' ? 'neon-text-green' : 'neon-text-cyan'}`}>
                    <div className="flex items-center gap-1">
                        <ShieldCheck size={10} />
                        {status}
                    </div>
                </Tag>
            ),
        },
    ];

    const data = [
        {
            key: '1',
            hash: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
            asset: 'DET-402 (Minted)',
            volume: 4.2,
            status: 'Verified',
        },
        {
            key: '2',
            hash: '0x123f35Cc6634C0532925a3b844Bc454e4438f221',
            asset: 'DET-401 (P2P)',
            volume: 1.5,
            status: 'In Ledger',
        },
        {
            key: '3',
            hash: '0x992d35Cc6634C0532925a3b844Bc454e4438f99a',
            asset: 'DET-400 (Minted)',
            volume: 12.0,
            status: 'Verified',
        },
        {
            key: '4',
            hash: '0xab2d35Cc6634C0532925a3b844Bc454e4438faab',
            asset: 'DET-399 (P2P)',
            volume: 2.1,
            status: 'Verified',
        },
    ];

    return (
        <Card className="glass-card h-full flex flex-col" bodyStyle={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="p-6 pb-2">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <Database size={18} className="text-muted" />
                        <h3 className="text-lg font-bold font-['Outfit'] m-0">Smart Ledger</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-[10px] text-muted font-bold uppercase tracking-widest">Network:</div>
                        <div className="text-[10px] neon-text-cyan font-bold uppercase tracking-widest bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">AeroMesh v4</div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden px-4">
                <Table
                    columns={columns}
                    dataSource={data}
                    pagination={false}
                    size="small"
                    className="custom-table"
                />
            </div>

            <div className="p-4 mt-auto">
                <div className="bg-[#00ff88]/5 rounded-xl p-3 border border-[#00ff88]/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#00ff88]/10 flex items-center justify-center">
                            <Zap size={16} className="neon-text-green animate-pulse" />
                        </div>
                        <div>
                            <div className="text-xs font-bold neon-text-green">GRID STABILIZER ALERT</div>
                            <div className="text-[10px] text-muted font-medium">Earn +5 Community Credits by discharging now.</div>
                        </div>
                    </div>
                    <ArrowRight size={16} className="text-muted" />
                </div>
            </div>
        </Card>
    );
};

export default TransactionTable;
