import React from 'react';
import { Card, Row, Col, Progress, Switch, Tooltip } from 'antd';
import { DualAxes } from '@ant-design/plots';
import { useQuery } from '@tanstack/react-query';
import { Battery, Zap, Info, ShieldCheck } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { formatTimeIST } from '../utils/indiaFormat';

interface UsageData {
    timestamp: string;
    consumption: number;
    generation: number;
}

interface ChartDataPoint {
    time: string;
    value: number;
    type: 'Today' | 'Production';
}

interface EnergyChartsProps {
    simMode?: string;
}

const EnergyCharts: React.FC<EnergyChartsProps> = ({ simMode }) => {
    const { settings } = useSettings();

    const { data: gov } = useQuery({
        queryKey: ['governance-public'],
        queryFn: () => fetch('/api/grid/governance-public').then(res => res.json()),
        refetchInterval: 10000
    });

    const isAiLocked = gov?.isAiEnabled === false;

    const { data: usageHistory } = useQuery({
        queryKey: ['gridUsageHistory'],
        queryFn: async () => {
            const res = await fetch('/api/grid/usage');
            if (!res.ok) throw new Error('Failed to fetch grid usage');
            const raw = await res.json();
            
            // Transform for AreaChart
            const formatted: ChartDataPoint[] = [];
            raw.forEach((d: UsageData) => {
                const time = formatTimeIST(d.timestamp);
                formatted.push({ time, value: d.consumption, type: 'Today' });
                formatted.push({ time, value: d.generation, type: 'Production' });
            });
            return formatted;
        },
        refetchInterval: 30000
    });

    const data: ChartDataPoint[] = usageHistory || [];
    const todayData = data.filter((d) => d.type === 'Today');
    const productionData = data.filter((d) => d.type === 'Production').map((d) => ({
        ...d,
        value: simMode === 'sunset' ? d.value * 0.15 : d.value * 1.6
    }));

    const config: Record<string, unknown> = {
        xField: 'time',
        smooth: true,
        children: [
            {
                data: productionData,
                type: 'area',
                yField: 'value',
                seriesField: 'type',
                colorField: 'type',
                shapeField: 'smooth',
                smooth: true,
                scale: { color: { range: ['#39FF14'] }, y: { min: 0 } },
                style: { fillOpacity: 0.2, fill: 'l(90) 0:#39FF14 1:rgba(57, 255, 20, 0.05)', lineDash: [0], lineWidth: 2, stroke: '#39FF14' },
                axis: { y: { position: 'right', title: 'Production (kWh)', titleFill: '#ffffff80', label: { style: { fill: '#ffffff80' } } } }
            },
            {
                data: todayData,
                type: 'area',
                yField: 'value',
                seriesField: 'type',
                colorField: 'type',
                shapeField: 'smooth',
                smooth: true,
                scale: { color: { range: ['#00F5FF'] }, y: { min: 0 } },
                style: { fillOpacity: 0.2, fill: 'l(90) 0:#00F5FF 1:rgba(0, 245, 255, 0.05)', lineDash: [4, 4], lineWidth: 2, stroke: '#00F5FF' },
                axis: { 
                    x: { title: 'Time (IST)', titleFill: '#ffffff80', grid: { line: { style: { stroke: 'rgba(255,255,255,0.05)' } } }, label: { style: { fill: '#ffffff80' } } }, 
                    y: { title: 'Consumption (kWh)', titleFill: '#ffffff80', label: { style: { fill: '#ffffff80' } }, grid: { line: { style: { stroke: 'rgba(255,255,255,0.05)' } } } } 
                }
            },
        ],
        interaction: { tooltip: { showMarkers: true, shared: true, crosshairs: true } },
        tooltip: {
            domStyles: {
                'g2-tooltip': {
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                    padding: 0,
                }
            },
            customContent: (title: string, items: Array<Record<string, unknown>>) => {
                const prodItem = items.find((i) => i.name === 'Production' || (i.data as Record<string, unknown>)?.type === 'Production');
                const consItem = items.find((i) => i.name === 'Today' || (i.data as Record<string, unknown>)?.type === 'Today');
                const prod = Number(prodItem?.value) || 0;
                const cons = Number(consItem?.value) || 0;
                const net = prod - cons;
                return `
                    <div style="padding: 12px; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(12px); border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.8); min-width: 200px;">
                        <h5 style="margin: 0 0 12px 0; color: #94a3b8; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Live Grid Telemetry<br/><span style="color: #fff; font-size: 14px; font-weight: 400; text-transform: none;">${title}</span></h5>
                        <div style="color: #39FF14; font-size: 13px; font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
                            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#39FF14;box-shadow:0 0 8px #39FF14;"></span>
                            YIELD <strong style="margin-left:auto; font-family: monospace; font-size: 14px;">${prod.toFixed(2)} kWh</strong>
                        </div>
                        <div style="color: #00F5FF; font-size: 13px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#00F5FF;box-shadow:0 0 8px #00F5FF;"></span>
                            DEMAND <strong style="margin-left:auto; font-family: monospace; font-size: 14px;">${cons.toFixed(2)} kWh</strong>
                        </div>
                        <div style="padding-top: 10px; border-top: 1px dashed rgba(255,255,255,0.15); font-weight: 800; font-size: 13px; letter-spacing: 0.5px; color: ${net >= 0 ? '#39FF14' : '#ff4d4f'}; display: flex; justify-content: space-between;">
                            <span>NET BALANCE</span> <span>${net >= 0 ? '+' : ''}${net.toFixed(2)} kWh</span>
                        </div>
                    </div>
                `;
            }
        },
        legend: {
            color: {
                itemMarker: 'circle',
                itemSpacing: 20,
                layout: 'horizontal',
                position: 'top-right',
                itemName: { style: { fill: '#fff', textShadow: '0 0 5px rgba(255,255,255,0.3)', fontWeight: 'bold' } }
            },
        },
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <Card className="glass-card flex-1 cursor-crosshair" style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(16px)', border: '0.5px solid rgba(255, 255, 255, 0.2)' }} bodyStyle={{ height: '100%', padding: '16px' }}>
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
                    <Card className={`glass-card h-full transition-all ${isAiLocked ? 'opacity-50' : ''}`} bodyStyle={{ padding: '16px' }}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Battery size={18} className={isAiLocked ? "text-red-500" : "neon-text-green"} />
                                <span className="text-xs font-bold uppercase tracking-wider">AI Battery Twin</span>
                            </div>
                            <Tooltip title={isAiLocked ? "Restricted by Governor" : "Predictive degradation analysis active"}>
                                <Info size={14} className="text-muted cursor-help" />
                            </Tooltip>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                                    <span>Efficiency</span>
                                    <span className={isAiLocked ? "text-red-500" : "neon-text-green"}>{isAiLocked ? "LOCKED" : "85% Peak"}</span>
                                </div>
                                <Progress percent={isAiLocked ? 0 : 85} size="small" strokeColor={isAiLocked ? "#ef4444" : "#00ff88"} trailColor="rgba(255,255,255,0.05)" showInfo={false} />
                            </div>
                            <p className="text-[10px] text-muted leading-relaxed m-0">
                                {isAiLocked ? (
                                    <>
                                        <ShieldCheck size={10} className="inline mr-1 text-red-500" />
                                        Predictive ROI optimization is <span className="text-red-500 font-bold">suspended</span>.
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck size={10} className="inline mr-1 text-[#00ff88]" />
                                        Selling now optimizes ROI by <span className="text-white font-bold">12.4%</span> vs overnight storage.
                                    </>
                                )}
                            </p>
                        </div>
                    </Card>
                </Col>
                <Col span={12}>
                    <Card className={`glass-card h-full transition-all ${isAiLocked ? 'opacity-50' : ''}`} bodyStyle={{ padding: '16px' }}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Zap size={18} className={isAiLocked ? "text-red-500" : "neon-text-cyan"} />
                                <span className="text-xs font-bold uppercase tracking-wider">Auto-Pilot</span>
                            </div>
                            <Switch size="small" disabled={isAiLocked} checked={isAiLocked ? false : undefined} defaultChecked={!isAiLocked} className={isAiLocked ? "bg-red-500/20" : "bg-slate-700"} />
                        </div>
                        <div className={`bg-black/20 rounded-lg p-2 border ${isAiLocked ? 'border-red-500/20' : 'border-white/5'}`}>
                            <div className="flex justify-between text-[9px] font-bold uppercase mb-1 text-muted">
                                <span>Thresholds</span>
                                <span className={isAiLocked ? "text-red-500" : "text-white"}>{isAiLocked ? "RESTRICTED" : "Active"}</span>
                            </div>
                            <div className="text-[10px] font-medium text-slate-300">
                                {isAiLocked ? "Autonomous trading logic disabled." : (
                                    <>
                                        Buy: &lt; {settings.currency}6.90/kWh<br />
                                        Sell: &gt; {settings.currency}7.40/kWh
                                    </>
                                )}
                            </div>
                        </div>
                        <div className={`text-[9px] mt-2 font-bold uppercase tracking-tighter ${isAiLocked ? 'text-red-500' : 'text-[#00e5ff] animate-pulse'}`}>
                            {isAiLocked ? "Governor Override Active" : "Algorithm: Matching v2.1"}
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default EnergyCharts;
