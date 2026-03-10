import React from 'react';
import { Card, Row, Col, Tag, Button } from 'antd';
import { Activity, Server } from 'lucide-react';
import NeighborhoodMap from '../NeighborhoodMap';
import EnergyCharts from '../EnergyCharts';
import NeighborDiscovery from '../NeighborDiscovery';
import HeaderStats from '../HeaderStats';
import DashboardGrid from '../DashboardGrid';
import LiveBidding from '../LiveBidding';

interface LiveGridProps {
    simMode?: string;
    userRole?: 'resident' | 'admin';
}

const LiveGrid: React.FC<LiveGridProps> = ({ simMode, userRole }) => {
    return (
        <div className="animate-in fade-in duration-500">
            {simMode === 'grid-fail' && (
                <div className="bg-orange-500/20 border border-orange-500/30 p-4 rounded-2xl mb-8 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                            <Activity className="text-orange-500" size={24} />
                        </div>
                        <div>
                            <div className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Active Emergency: Grid-Fail Protocol</div>
                            <div className="text-white text-sm font-bold">Local generation prioritized for life-critical assets. P2P Market restricted.</div>
                        </div>
                    </div>
                    <Button className="bg-orange-500 text-black border-none font-black uppercase tracking-widest text-[10px]">Acknowledge Alert</Button>
                </div>
            )}
            <HeaderStats />
            {userRole === 'admin' && (
                <Row gutter={[24, 24]} className="mb-10">
                    <Col span={24}>
                        <Card className="glass-card bg-gradient-to-r from-cyan-900/10 to-transparent border-cyan-500/20">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                                        <Server size={24} className="text-cyan-400" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-cyan-400 font-black uppercase tracking-[0.2em] mb-1">Global Stability Matrix</div>
                                        <div className="text-xl font-black text-white uppercase tracking-tight">Neighborhood Cluster Monitoring (Active)</div>
                                    </div>
                                </div>
                                <div className="flex gap-10">
                                    <div className="text-right">
                                        <div className="text-[9px] text-muted font-bold uppercase mb-1">Grid Sync</div>
                                        <div className="text-lg font-black text-[#00ff88]">99.98%</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[9px] text-muted font-bold uppercase mb-1">Harmonic Dist.</div>
                                        <div className="text-lg font-black text-white">0.02%</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[9px] text-muted font-bold uppercase mb-1">Fault Recovery</div>
                                        <Tag color="cyan" className="m-0 font-bold uppercase tracking-wider text-[10px]">Auto-Healing Active</Tag>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </Col>
                </Row>
            )}
            <DashboardGrid
                topLeft={<NeighborhoodMap />}
                topRight={<LiveBidding />}
                bottomLeft={<EnergyCharts />}
                bottomRight={<NeighborDiscovery />}
            />
        </div>
    );
};

export default LiveGrid;
