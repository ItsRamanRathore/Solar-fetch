import React from 'react';
import { Card, Row, Col, Progress, Switch, Tooltip } from 'antd';
import { DualAxes } from '@ant-design/plots';
import { Battery, Zap, Info, ShieldCheck } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

const EnergyCharts: React.FC = () => {
    const { settings } = useSettings();
    const data = [
        { time: '00:00', value: 2.1, type: 'Consumption' },
        { time: '04:00', value: 1.8, type: 'Consumption' },
        { time: '08:00', value: 3.5, type: 'Consumption' },
        { time: '12:00', value: 4.8, type: 'Consumption' },
        { time: '16:00', value: 4.2, type: 'Consumption' },
        { time: '20:00', value: 3.2, type: 'Consumption' },
        { time: '00:00', value: 0.1, type: 'Production' },
        { time: '04:00', value: 0.2, type: 'Production' },
        { time: '08:00', value: 2.8, type: 'Production' },
        { time: '12:00', value: 6.5, type: 'Production' },
        { time: '16:00', value: 5.1, type: 'Production' },
        { time: '20:00', value: 1.2, type: 'Production' },
    ];

    const consumptionData = data.filter(d => d.type === 'Consumption');
    const productionData = data.filter(d => d.type === 'Production');

    const config = {
        xField: 'time',
        children: [
            {
                data: consumptionData,
                type: 'area',
                yField: 'value',
                seriesField: 'type',
                colorField: 'type',
                scale: { color: { range: ['#00e5ff'] } },
                style: { fillOpacity: 0.3 },
                axis: { y: { label: { style: { fill: '#475569' } }, grid: { line: { style: { stroke: 'rgba(255,255,255,0.05)' } } } } }
            },
            {
                data: productionData,
                type: 'line',
                yField: 'value',
                seriesField: 'type',
                colorField: 'type',
                scale: { color: { range: ['#00ff88'] } },
                style: { lineWidth: 2 },
                axis: { y: { position: 'right', label: { style: { fill: '#475569' } } } }
            },
        ],
        interaction: { tooltip: { showMarkers: true } },
        legend: {
            color: {
                itemMarker: 'square',
                itemSpacing: 20,
            },
        },
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <Card className="glass-card flex-1" bodyStyle={{ height: '100%', padding: '16px' }}>
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-muted m-0">Consumption vs Production</h4>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[#00ff88] bg-[#00ff88]/10 px-2 py-0.5 rounded-full border border-[#00ff88]/20">Surplus Delta: +1.7 kWh</span>
                    </div>
                </div>
                <div style={{ height: '220px' }}>
                    <DualAxes {...config} />
                </div>
            </Card>

            <Row gutter={16}>
                <Col span={12}>
                    <Card className="glass-card h-full" bodyStyle={{ padding: '16px' }}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Battery size={18} className="neon-text-green" />
                                <span className="text-xs font-bold uppercase tracking-wider">AI Battery Twin</span>
                            </div>
                            <Tooltip title="Predictive degradation analysis active">
                                <Info size={14} className="text-muted cursor-help" />
                            </Tooltip>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                                    <span>Efficiency</span>
                                    <span className="neon-text-green">85% Peak</span>
                                </div>
                                <Progress percent={85} size="small" strokeColor="#00ff88" trailColor="rgba(255,255,255,0.05)" showInfo={false} />
                            </div>
                            <p className="text-[10px] text-muted leading-relaxed m-0">
                                <ShieldCheck size={10} className="inline mr-1 text-[#00ff88]" />
                                Selling now optimizes ROI by <span className="text-white font-bold">12.4%</span> vs overnight storage.
                            </p>
                        </div>
                    </Card>
                </Col>
                <Col span={12}>
                    <Card className="glass-card h-full" bodyStyle={{ padding: '16px' }}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Zap size={18} className="neon-text-cyan" />
                                <span className="text-xs font-bold uppercase tracking-wider">Auto-Pilot</span>
                            </div>
                            <Switch size="small" defaultChecked className="bg-slate-700" />
                        </div>
                        <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                            <div className="flex justify-between text-[9px] font-bold uppercase mb-1 text-muted">
                                <span>Thresholds</span>
                                <span className="text-white">Active</span>
                            </div>
                            <div className="text-[10px] font-medium text-slate-300">
                                Buy: &lt; {settings.currency}0.09/kWh<br />
                                Sell: &gt; {settings.currency}0.14/kWh
                            </div>
                        </div>
                        <div className="text-[9px] mt-2 text-[#00e5ff] font-bold uppercase tracking-tighter animate-pulse">
                            Algorithm: Matching v2.1
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default EnergyCharts;
