import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Table, Form, InputNumber, Button, message, Progress, Statistic, Switch } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap, Activity, ShieldAlert, CheckCircle, MapPin, Settings, HelpCircle, Cpu, Battery, Link2Off } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useSocket } from '../../contexts/SocketContext';
import { useSettings } from '../../contexts/SettingsContext';
import { formatTimeIST } from '../../utils/indiaFormat';

interface ConsumerDashboardProps {
    simMode: string;
    userRole?: string;
}

type HubSwitchKey = 'hvac' | 'ev' | 'fridge' | 'security' | 'washing' | 'lighting';

interface UsagePointResponse {
    timestamp: string;
    consumption: number;
}

interface UsageChartPoint {
    time: string;
    consumption: number;
}

interface ConnectedProsumer {
    _id?: string;
    username: string;
    trustScore?: number;
    isCertified?: boolean;
}

interface ConsumerConnectionState {
    connectionRequestStatus?: 'none' | 'pending';
    connectedProsumer?: ConnectedProsumer | null;
    pendingProsumer?: ConnectedProsumer | null;
}

interface ProsumerNode extends ConnectedProsumer {
    _id: string;
    role: string;
}

interface MarketOrder {
    _id: string;
    type?: 'buy' | 'sell';
    status?: 'PENDING' | 'PARTIAL' | 'MATCHED' | 'CANCELLED';
    createdAt?: string;
    maker?: {
        username?: string;
        isCertified?: boolean;
    };
    remainingKwh?: number;
    price?: number;
    isSelected?: boolean;
}

interface MarketFeedRow extends MarketOrder {
    marketSide: 'ASK' | 'BID';
}

interface MarketOrdersResponse {
    sells: MarketOrder[];
    buys: MarketOrder[];
}

interface UserStats {
    dailyKwh?: number;
    dailyCost?: number;
    connectedProsumer?: ConnectedProsumer | null;
    pendingProsumer?: ConnectedProsumer | null;
    connectionRequestStatus?: 'none' | 'pending';
}

interface GovernancePublic {
    isAiEnabled?: boolean;
}

interface BidFormValues {
    kwh: number;
    price: number;
    source?: 'manual' | 'auto';
}

const ConsumerDashboard: React.FC<ConsumerDashboardProps> = ({ simMode }) => {
    const { settings } = useSettings();
    const queryClient = useQueryClient();
    const { socket } = useSocket();
    const [form] = Form.useForm();
    const [currentTime, setCurrentTime] = useState(new Date().getHours());
    const [switches, setSwitches] = useState<Record<HubSwitchKey, boolean>>({
        hvac: true,
        ev: false,
        fridge: true,
        security: true,
        washing: false,
        lighting: true,
    });
    const [selectedProsumer, setSelectedProsumer] = useState<ProsumerNode | null>(null);
    const [autoBidEnabled, setAutoBidEnabled] = useState(false);
    const [autoBidIntervalSec, setAutoBidIntervalSec] = useState(45);
    const [autoBidVolume, setAutoBidVolume] = useState(1.5);
    const [autoBidMaxPrice, setAutoBidMaxPrice] = useState(7.0);

    const isGridFail = simMode === 'grid-fail';
    const isSunset = simMode === 'sunset';

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date().getHours()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!socket) return;

        const handleOrderUpdate = () => queryClient.invalidateQueries({ queryKey: ['orders'] });
        const handleConnectionUpdate = () => {
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            queryClient.invalidateQueries({ queryKey: ['userStats'] });
            queryClient.invalidateQueries({ queryKey: ['user'] });
        };
        const handleUserUpdate = () => {
            queryClient.invalidateQueries({ queryKey: ['prosumers'] });
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            queryClient.invalidateQueries({ queryKey: ['userStats'] });
        };

        socket.on('market:newOrder', handleOrderUpdate);
        socket.on('market:orderComplete', handleOrderUpdate);
        socket.on('connections:updated', handleConnectionUpdate);
        socket.on('users:updated', handleUserUpdate);

        return () => {
            socket.off('market:newOrder', handleOrderUpdate);
            socket.off('market:orderComplete', handleOrderUpdate);
            socket.off('connections:updated', handleConnectionUpdate);
            socket.off('users:updated', handleUserUpdate);
        };
    }, [socket, queryClient]);

    const { data: prosumers } = useQuery<ProsumerNode[]>({
        queryKey: ['prosumers'],
        queryFn: () => fetch('/api/users/prosumers').then(res => res.json()),
        refetchInterval: 10000,
    });

    const { data: orders, isLoading } = useQuery<MarketOrdersResponse>({
        queryKey: ['orders'],
        queryFn: async () => {
            const res = await fetch('/api/market/orders');
            if (!res.ok) throw new Error('Failed to fetch orders');
            return res.json();
        },
        refetchInterval: 2000,
    });

    const { data: usageHistory } = useQuery<UsageChartPoint[]>({
        queryKey: ['usageHistory'],
        queryFn: async () => {
            const res = await fetch('/api/users/usage?limit=24');
            if (!res.ok) throw new Error('Failed to fetch usage history');
            const data = await res.json();
            return data.map((point: UsagePointResponse) => ({
                time: formatTimeIST(point.timestamp),
                consumption: point.consumption,
            }));
        },
        refetchInterval: 30000,
    });

    const chartData = usageHistory || [];

    const { data: stats } = useQuery<UserStats>({
        queryKey: ['userStats'],
        queryFn: async () => {
            const res = await fetch('/api/users/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        },
        refetchInterval: 5000,
    });

    const { data: gov } = useQuery<GovernancePublic>({
        queryKey: ['governance-public'],
        queryFn: () => fetch('/api/grid/governance-public').then(res => res.json()),
        refetchInterval: 10000,
    });

    const { data: connectionState } = useQuery<ConsumerConnectionState>({
        queryKey: ['connections'],
        queryFn: async () => {
            const res = await fetch('/api/users/connections');
            if (!res.ok) throw new Error('Failed to fetch connection state');
            return res.json();
        },
        refetchInterval: 5000,
    });

    const isAiLocked = gov?.isAiEnabled === false;
    const currentProsumers = (prosumers || []).filter((node: ProsumerNode) => node.role === 'prosumer');
    const surgeMultiplier = isGridFail ? 1.5 : isSunset ? 1.35 : 1;
    const surgeLabel = isGridFail ? '+50% STRESS SURGE' : isSunset ? '+35% PEAK SURGE' : null;

    const rawSells = orders?.sells || [];
    const sells = rawSells.map((sell: MarketOrder) => ({
        ...sell,
        price: (sell.price ?? 0) * surgeMultiplier,
        isSelected: Boolean(selectedProsumer && sell.maker?.username === selectedProsumer.username),
    }));
    const rawBuys = orders?.buys || [];
    const buys = rawBuys.map((buy: MarketOrder) => ({
        ...buy,
        price: buy.price ?? 0,
    }));

    const marketFeed: MarketFeedRow[] = [
        ...sells.map((sell: MarketOrder) => ({ ...sell, marketSide: 'ASK' as const })),
        ...buys.map((buy: MarketOrder) => ({ ...buy, marketSide: 'BID' as const })),
    ].sort((a: MarketFeedRow, b: MarketFeedRow) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
    });

    const offerByUsername = new Map<string, MarketOrder>(
        sells
            .filter((sell: MarketOrder) => sell.maker?.username)
            .map((sell: MarketOrder) => [sell.maker!.username!, sell])
    );

    const placeBidMutation = useMutation({
        mutationFn: async (values: BidFormValues) => {
            const res = await fetch('/api/market/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ type: 'buy', ...values }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error?.[0]?.message || data.error || 'Failed to place bid');
            }
            return data as MarketOrder;
        },
        onSuccess: (createdOrder: MarketOrder, values: BidFormValues) => {
            const isAutoBid = values.source === 'auto';
            if (isAutoBid) {
                message.success(`AI auto-bid queued at ${settings.currency}${values.price.toFixed(2)}/kWh`, 2);
            } else {
                message.success('Bid submitted to market order book');
                form.resetFields();
                setSelectedProsumer(null);
            }

            queryClient.setQueryData<MarketOrdersResponse>(['orders'], previous => {
                if (!previous) {
                    return { sells: [], buys: [createdOrder] };
                }
                return {
                    ...previous,
                    buys: [createdOrder, ...previous.buys],
                };
            });

            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
        onError: (error: Error) => {
            message.error(error.message);
        },
    });

    useEffect(() => {
        if (!autoBidEnabled || isAiLocked) return;

        const autoBidTimer = setInterval(() => {
            if (placeBidMutation.isPending) return;

            const currentBook = queryClient.getQueryData<MarketOrdersResponse>(['orders']);
            const bestAskPrice = currentBook?.sells?.[0]?.price;
            const dynamicPrice = bestAskPrice
                ? Math.min(autoBidMaxPrice, bestAskPrice + 0.05)
                : autoBidMaxPrice;
            const bidPrice = Math.max(0.01, Number(dynamicPrice.toFixed(2)));

            placeBidMutation.mutate({
                kwh: Number(autoBidVolume.toFixed(2)),
                price: bidPrice,
                source: 'auto',
            });
        }, Math.max(10, autoBidIntervalSec) * 1000);

        return () => clearInterval(autoBidTimer);
    }, [
        autoBidEnabled,
        isAiLocked,
        autoBidIntervalSec,
        autoBidVolume,
        autoBidMaxPrice,
        queryClient,
        placeBidMutation,
    ]);

    const disconnectMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/users/connections', { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to disconnect');
            return data;
        },
        onSuccess: () => {
            message.success('Disconnected from prosumer');
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            queryClient.invalidateQueries({ queryKey: ['userStats'] });
            setSelectedProsumer(null);
        },
        onError: (error: Error) => {
            message.error(error.message);
        },
    });

    const requestConnectionMutation = useMutation({
        mutationFn: async (prosumerId: string) => {
            const res = await fetch('/api/users/connections/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prosumerId }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error?.[0]?.message || data.error || 'Failed to request connection');
            }
            return data;
        },
        onSuccess: (_, prosumerId) => {
            const targetProsumer = currentProsumers.find(node => node._id === prosumerId);
            message.success(targetProsumer ? `Connection request sent to ${targetProsumer.username}` : 'Connection request sent');
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            queryClient.invalidateQueries({ queryKey: ['userStats'] });
        },
        onError: (error: Error) => {
            message.error(error.message);
        },
    });

    useEffect(() => {
        if (!selectedProsumer) return;

        const offer = (orders?.sells || []).find((sell: MarketOrder) => sell.maker?.username === selectedProsumer.username);
        form.setFieldsValue({ price: offer?.price });
    }, [selectedProsumer, orders?.sells, form]);

    const dailyKwh = stats?.dailyKwh || 0;
    const dailyCost = stats?.dailyCost || 0;
    const connectedProsumer = connectionState?.connectedProsumer || stats?.connectedProsumer || null;
    const pendingProsumer = connectionState?.pendingProsumer || stats?.pendingProsumer || null;
    const connectionRequestStatus = connectionState?.connectionRequestStatus || stats?.connectionRequestStatus || 'none';
    const nextHour = (currentTime + 1) % 24;
    const isEvening = (nextHour >= 18 && nextHour <= 22) || isSunset;
    const predictedLoad = isGridFail ? 15.8 : isEvening ? 12.5 : 4.2;
    const liveDemand = chartData[chartData.length - 1]?.consumption || 0;
    const activeSellerCount = sells.length;
    const availableSupply = sells.reduce((total: number, sell: MarketOrder) => total + (sell.remainingKwh || 0), 0);

    const applianceBreakdown = [
        { name: 'HVAC & Climate', value: dailyKwh * 0.42, percent: 42, color: '#ff4d4f' },
        { name: 'Devices & Plug Load', value: dailyKwh * 0.22, percent: 22, color: '#00e5ff' },
        { name: 'Kitchen & Refrigeration', value: dailyKwh * 0.18, percent: 18, color: '#faad14' },
        { name: 'Lighting', value: dailyKwh * 0.10, percent: 10, color: '#00ff88' },
        { name: 'Other', value: dailyKwh * 0.08, percent: 8, color: '#475569' },
    ];

    const hubDevices = [
        { key: 'hvac' as HubSwitchKey, label: 'Climate Control', essential: true, icon: <Zap size={10} className="text-cyan-400" /> },
        { key: 'security' as HubSwitchKey, label: 'Home Security', essential: true, icon: <ShieldAlert size={10} className="text-cyan-400" /> },
        { key: 'ev' as HubSwitchKey, label: 'Fast Charge (EV)', essential: false, icon: <Battery size={10} className="text-cyan-400" /> },
        { key: 'fridge' as HubSwitchKey, label: 'Kitchen & Cooling', essential: true, icon: <Zap size={10} className="text-cyan-400" /> },
        { key: 'washing' as HubSwitchKey, label: 'Heavy Laundry', essential: false, icon: <Activity size={10} className="text-cyan-400" /> },
        { key: 'lighting' as HubSwitchKey, label: 'Smart Lighting', essential: false, icon: <Zap size={10} className="text-cyan-400" /> },
    ];

    const essentialDeviceCount = hubDevices.filter(device => device.essential).length;
    const flexibleDeviceCount = hubDevices.length - essentialDeviceCount;
    const essentialDevicesOnline = hubDevices.filter(device => device.essential && switches[device.key]).length;
    const flexibleDevicesOnline = hubDevices.filter(device => !device.essential && switches[device.key]).length;
    const automationCoverage = Math.round((Object.values(switches).filter(Boolean).length / hubDevices.length) * 100);
    const preferredProsumer = selectedProsumer || pendingProsumer || connectedProsumer || null;
    const preferredOffer = preferredProsumer?.username ? offerByUsername.get(preferredProsumer.username) : null;
    const hasPendingConnection = connectionRequestStatus === 'pending';
    const recommendationTitle = isAiLocked
        ? 'Governor lock active'
        : isGridFail
        ? 'Emergency conservation'
        : isEvening
        ? 'Peak-response advised'
        : 'Baseload purchase window';
    const recommendationBody = isAiLocked
        ? 'AI strategist features are suspended by the grid governor. Manual bidding stays online, but automated optimization is constrained.'
        : isGridFail
        ? `Non-essential circuits should remain offline. Shift discretionary loads now to preserve ${settings.currency} savings and resilience.`
        : isEvening
        ? 'Neighborhood demand is climbing into the evening peak. Pin a trusted prosumer and lock pricing before asks continue to rise.'
        : 'Grid load is stable. This is the lowest-friction window for a baseline buy order before the next demand ramp.';
    const recommendationTone = isAiLocked
        ? 'text-red-400'
        : isGridFail
        ? 'text-orange-400'
        : isEvening
        ? 'text-yellow-400'
        : 'text-cyan-400';

    return (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="flex items-center justify-between gap-6 flex-wrap">
                <div>
                    <h2 className="text-3xl font-black font-['Outfit'] uppercase tracking-tighter text-white m-0">Household Dashboard</h2>
                    <p className="text-muted tracking-wide text-xs uppercase mt-1">Personal energy management and market orchestration</p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-4">
                    {connectedProsumer && (
                        <div className="flex items-center gap-2">
                            <div className="px-4 py-2 rounded-full border border-cyan-500/50 bg-cyan-500/10 text-cyan-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                <Zap size={12} fill="currentColor" /> P2P Link: {connectedProsumer.username}
                            </div>
                            <Button
                                size="small"
                                danger
                                loading={disconnectMutation.isPending}
                                className="glass-button text-[9px] font-black uppercase h-7 flex items-center gap-1"
                                icon={<Link2Off size={11} />}
                                onClick={() => disconnectMutation.mutate()}
                            >
                                Unlink
                            </Button>
                        </div>
                    )}
                    {hasPendingConnection && !connectedProsumer && (
                        <Button
                            size="small"
                            danger
                            loading={disconnectMutation.isPending}
                            className="glass-button text-[9px] font-black uppercase h-7 flex items-center gap-1"
                            icon={<Link2Off size={11} />}
                            onClick={() => disconnectMutation.mutate()}
                        >
                            Cancel Request
                        </Button>
                    )}

                    {pendingProsumer && (
                        <div className="px-4 py-2 rounded-full border border-yellow-500/50 bg-yellow-500/10 text-yellow-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <Cpu size={12} /> Awaiting Approval: {pendingProsumer.username}
                        </div>
                    )}

                    {isSunset && !isGridFail && (
                        <div className="px-4 py-2 rounded border border-yellow-500/50 bg-yellow-500/10 text-yellow-400 text-[10px] font-black uppercase tracking-widest">
                            Mode: Peak Response
                        </div>
                    )}

                    {isGridFail && (
                        <div className="px-5 py-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-4">
                            <ShieldAlert className="text-red-500" size={18} />
                            <div>
                                <div className="text-[10px] font-black text-red-500 uppercase tracking-widest">Emergency Load Shedding</div>
                                <div className="text-[10px] text-white/70">Non-essential devices are restricted to protect security and refrigeration loads.</div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <Button className="glass-button !p-2" icon={<Settings size={14} />} />
                        <Button className="glass-button !p-2" icon={<HelpCircle size={14} />} />
                    </div>
                </div>
            </div>

            <Row gutter={[24, 24]}>
                <Col xs={24} lg={16}>
                    <Card className="glass-card h-full" bodyStyle={{ padding: '24px' }}>
                        <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 m-0">
                                <Activity size={16} className="text-[#00ffe0]" /> Household Demand Telemetry
                            </h3>
                            <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
                                <span className="text-cyan-400">Live Monitoring</span>
                                <span className={isEvening ? 'text-orange-400' : 'text-[#00ff88]'}>{isEvening ? 'Peak Window' : 'Stable Window'}</span>
                            </div>
                        </div>

                        <Row gutter={[24, 24]} className="mb-8">
                            <Col xs={24} md={8}>
                                <Statistic
                                    title={<span className="text-[10px] uppercase tracking-widest text-muted">Daily Usage</span>}
                                    value={dailyKwh}
                                    precision={2}
                                    suffix="kWh"
                                    valueStyle={{ color: '#ffffff', fontSize: '28px', fontWeight: 900, fontFamily: 'Outfit' }}
                                />
                                <div className="text-[9px] text-[#00ff88] font-bold mt-1 uppercase tracking-tighter">Today&apos;s household draw</div>
                            </Col>
                            <Col xs={24} md={8}>
                                <Statistic
                                    title={<span className="text-[10px] uppercase tracking-widest text-muted">Daily Spend</span>}
                                    value={dailyCost}
                                    precision={2}
                                    prefix={settings.currency}
                                    valueStyle={{ color: '#00e5ff', fontSize: '28px', fontWeight: 900, fontFamily: 'Outfit' }}
                                />
                                <div className="text-[9px] text-muted font-bold mt-1 uppercase tracking-tighter">Live settlement estimate</div>
                            </Col>
                            <Col xs={24} md={8}>
                                <Statistic
                                    title={<span className="text-[10px] uppercase tracking-widest text-muted">Next-Hour Forecast</span>}
                                    value={predictedLoad}
                                    precision={1}
                                    suffix="kWh"
                                    valueStyle={{ color: isEvening ? '#fb923c' : '#00ff88', fontSize: '28px', fontWeight: 900, fontFamily: 'Outfit' }}
                                />
                                <div className="text-[9px] text-muted font-bold mt-1 uppercase tracking-tighter">Projected demand at {nextHour}:00</div>
                            </Col>
                        </Row>

                        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)] gap-8">
                            <div>
                                <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
                                    <div>
                                        <div className="text-[10px] text-muted font-bold uppercase tracking-widest">24H Consumption Profile</div>
                                        <div className="text-[9px] text-white/50 uppercase tracking-widest mt-1">Grid sync 99.8% • demand trace updates every 30s</div>
                                    </div>
                                    <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
                                        <span className="text-cyan-400">Consumption</span>
                                        <span className="text-[#00ff88]">Live Demand {liveDemand.toFixed(1)} kWh</span>
                                    </div>
                                </div>

                                <div className="h-[260px] w-full mt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="consumerDemand" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} />
                                            <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'rgba(10,15,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', backdropFilter: 'blur(10px)' }}
                                                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                            />
                                            <Area type="monotone" dataKey="consumption" stroke="#00e5ff" strokeWidth={2} fillOpacity={1} fill="url(#consumerDemand)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className={`p-5 rounded-2xl border ${isGridFail ? 'bg-red-500/5 border-red-500/20' : isEvening ? 'bg-orange-500/5 border-orange-500/20' : 'bg-cyan-400/5 border-cyan-400/10'}`}>
                                    <div className="text-[10px] text-muted font-bold uppercase tracking-widest">Forecast Posture</div>
                                    <div className="flex items-end gap-2 mt-3">
                                        <span className={`text-5xl font-black font-['Outfit'] leading-none ${isGridFail ? 'text-red-400' : isEvening ? 'text-orange-400' : 'text-cyan-400'}`}>
                                            {predictedLoad.toFixed(1)}
                                        </span>
                                        <span className="text-muted font-bold mb-1">kWh</span>
                                    </div>
                                    <div className="text-[10px] text-white/60 uppercase tracking-widest mt-2">{recommendationTitle}</div>

                                    <div className="grid grid-cols-2 gap-4 mt-6">
                                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                                            <div className="text-[9px] text-muted uppercase font-black mb-1">Live Draw</div>
                                            <div className="text-sm font-bold text-white">{liveDemand.toFixed(1)} kWh</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                                            <div className="text-[9px] text-muted uppercase font-black mb-1">Automation</div>
                                            <div className="text-sm font-bold text-[#00ff88]">{automationCoverage}%</div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[10px] text-muted font-bold uppercase tracking-widest mb-4">Appliance Consumption Mix</div>
                                    <div className="space-y-3">
                                        {applianceBreakdown.map(item => (
                                            <div key={item.name} className="space-y-1">
                                                <div className="flex justify-between text-[9px] font-bold uppercase">
                                                    <span className="text-white/70">{item.name}</span>
                                                    <span className="text-white">{item.value.toFixed(2)} kWh</span>
                                                </div>
                                                <Progress percent={item.percent} strokeColor={item.color} showInfo={false} size="small" trailColor="rgba(255,255,255,0.05)" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={24} lg={8}>
                    <Card className="glass-card h-full" bodyStyle={{ padding: '24px' }}>
                        <div className="flex justify-between items-center mb-6 gap-4">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 m-0">
                                <Zap size={16} className={isAiLocked ? 'text-red-500' : 'text-[#00ffe0]'} /> Bidding Engine
                            </h3>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase border ${isAiLocked ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'}`}>
                                {isAiLocked ? 'AI Locked' : 'Adaptive'}
                            </span>
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="text-[10px] text-muted font-bold uppercase tracking-widest">Preferred Source Node</div>
                                        <div className="text-lg font-black text-white uppercase tracking-wide mt-2">
                                            {preferredProsumer?.username || 'No node pinned'}
                                        </div>
                                        <div className="text-[10px] text-white/60 uppercase tracking-widest mt-1">
                                            {preferredOffer
                                                ? `${(preferredOffer.remainingKwh ?? 0).toFixed(2)} kWh inventory live`
                                                : pendingProsumer
                                                ? 'Pending approval from selected prosumer'
                                                : connectedProsumer
                                                ? 'Connected via neighborhood link'
                                                : 'Select a node to prefill live ask pricing'}
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded border text-[9px] font-black uppercase tracking-widest ${preferredOffer ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-white/5 border-white/10 text-muted'}`}>
                                        {preferredOffer ? 'Market Live' : 'Scanning'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                                        <div className="text-[8px] text-muted uppercase font-black tracking-widest">Trust</div>
                                        <div className="text-sm font-bold text-white mt-1">{preferredProsumer?.trustScore ?? '--'}%</div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                                        <div className="text-[8px] text-muted uppercase font-black tracking-widest">Ask Ceiling</div>
                                        <div className="text-sm font-bold text-cyan-400 mt-1">
                                            {preferredOffer ? `${settings.currency}${(preferredOffer.price ?? 0).toFixed(2)}` : 'Auto'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={`p-4 rounded-2xl border ${autoBidEnabled ? 'bg-[#00e5ff]/5 border-[#00e5ff]/20' : 'bg-white/5 border-white/10'}`}>
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <div className="text-[10px] text-muted font-bold uppercase tracking-widest">AI Auto Bidder</div>
                                        <div className="text-[10px] text-white/60 uppercase tracking-widest mt-1">
                                            {isAiLocked
                                                ? 'Disabled by governor directive'
                                                : autoBidEnabled
                                                ? `Running every ${Math.max(10, autoBidIntervalSec)}s`
                                                : 'Manual mode active'}
                                        </div>
                                    </div>
                                    <Switch
                                        checked={autoBidEnabled}
                                        disabled={isAiLocked}
                                        onChange={setAutoBidEnabled}
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-3 mt-4">
                                    <div>
                                        <div className="text-[8px] text-muted uppercase font-black tracking-widest mb-1">Cadence (sec)</div>
                                        <InputNumber
                                            className="w-full glass-input"
                                            min={10}
                                            max={300}
                                            value={autoBidIntervalSec}
                                            onChange={(value) => setAutoBidIntervalSec(Number(value || 45))}
                                        />
                                    </div>
                                    <div>
                                        <div className="text-[8px] text-muted uppercase font-black tracking-widest mb-1">Volume (kWh)</div>
                                        <InputNumber
                                            className="w-full glass-input"
                                            min={0.1}
                                            max={50}
                                            step={0.1}
                                            value={autoBidVolume}
                                            onChange={(value) => setAutoBidVolume(Number(value || 1.5))}
                                        />
                                    </div>
                                    <div>
                                        <div className="text-[8px] text-muted uppercase font-black tracking-widest mb-1">Max Price</div>
                                        <InputNumber
                                            className="w-full glass-input"
                                            min={0.01}
                                            step={0.01}
                                            value={autoBidMaxPrice}
                                            onChange={(value) => setAutoBidMaxPrice(Number(value || 7.0))}
                                        />
                                    </div>
                                </div>
                            </div>

                            <Form form={form} layout="vertical" onFinish={values => placeBidMutation.mutate({ ...values, source: 'manual' })} disabled={isAiLocked || placeBidMutation.isPending}>
                                <Form.Item name="kwh" label={<span className="text-xs text-white uppercase tracking-wider">Target Volume (kWh)</span>} rules={[{ required: true, type: 'number', min: 0.1 }]}>
                                    <InputNumber className="w-full glass-input" size="large" placeholder="0.00" precision={2} />
                                </Form.Item>
                                <Form.Item name="price" label={<span className="text-xs text-white uppercase tracking-wider">Max Price ({settings.currency}/kWh)</span>} rules={[{ required: true, type: 'number', min: 0.01 }]}>
                                    <InputNumber className="w-full glass-input" size="large" placeholder="0.00" precision={3} step={0.01} />
                                </Form.Item>
                                <Button type="primary" htmlType="submit" loading={placeBidMutation.isPending} className="w-full h-12 bg-[#00e5ff] hover:bg-[#00ff88] text-black font-black uppercase tracking-widest border-none mt-2">
                                    Dispatch Bid Request
                                </Button>
                            </Form>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                                    <div className="text-[9px] text-muted uppercase font-black mb-1">Active Sellers</div>
                                    <div className="text-base font-black text-white">{activeSellerCount}</div>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                                    <div className="text-[9px] text-muted uppercase font-black mb-1">Live Supply</div>
                                    <div className="text-base font-black text-[#00ff88]">{availableSupply.toFixed(1)} kWh</div>
                                </div>
                            </div>

                            <div className={`p-4 rounded-2xl border ${isAiLocked ? 'bg-red-500/5 border-red-500/20' : 'bg-cyan-400/5 border-cyan-400/10'}`}>
                                <div className="flex items-start gap-3">
                                    <Cpu size={18} className={isAiLocked ? 'text-red-500 mt-0.5' : 'text-cyan-400 mt-0.5'} />
                                    <div>
                                        <div className={`text-sm font-black uppercase tracking-wider mb-2 ${recommendationTone}`}>{recommendationTitle}</div>
                                        <div className="text-xs text-muted leading-relaxed">{recommendationBody}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={24}>
                    <Card className="glass-card" bodyStyle={{ padding: '32px' }}>
                        <div className="flex justify-between items-center mb-8 gap-6 flex-wrap">
                            <div>
                                <h3 className="text-lg font-black font-['Outfit'] uppercase text-white m-0 tracking-wider flex items-center gap-2">
                                    <MapPin size={20} className="text-cyan-400" /> Neighborhood Mesh Access
                                </h3>
                                <p className="text-[10px] text-muted uppercase tracking-widest mt-1">Trusted local energy nodes and household automation controls</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 xl:w-[320px] w-full max-w-[320px]">
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                                    <div className="text-[8px] text-muted uppercase font-black mb-1">Essential Online</div>
                                    <div className="text-sm font-bold text-cyan-400">{essentialDevicesOnline}/{essentialDeviceCount}</div>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                                    <div className="text-[8px] text-muted uppercase font-black mb-1">Flexible Online</div>
                                    <div className="text-sm font-bold text-[#00ff88]">{flexibleDevicesOnline}/{flexibleDeviceCount}</div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] gap-10">
                            <div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {currentProsumers.length > 0 ? currentProsumers.map((prosumer: ProsumerNode) => {
                                        const offer = offerByUsername.get(prosumer.username);
                                        const isConnectedNode = connectedProsumer?.username === prosumer.username;
                                        const isPendingNode = pendingProsumer?.username === prosumer.username;
                                        const isFocusedNode = selectedProsumer?.username === prosumer.username || isConnectedNode || isPendingNode;
                                        const connectionLabel = isConnectedNode
                                            ? 'Connected'
                                            : isPendingNode
                                            ? 'Pending Approval'
                                            : hasPendingConnection
                                            ? 'Redirect Request'
                                            : connectedProsumer
                                            ? 'Request Switch'
                                            : 'Connect';

                                        return (
                                            <div
                                                key={prosumer._id}
                                                className={`p-5 rounded-2xl border transition-all cursor-pointer ${isFocusedNode ? 'bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_20px_rgba(0,255,224,0.1)]' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                                                onClick={() => setSelectedProsumer(prosumer)}
                                            >
                                                <div className="flex justify-between items-start gap-4 mb-4">
                                                    <div>
                                                        <div className="text-xs font-black text-white uppercase tracking-wide">{prosumer.username}</div>
                                                        <div className="text-[9px] text-muted font-bold uppercase tracking-widest mt-1">~150m away • neighborhood peer</div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {isPendingNode && <span className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[8px] font-black uppercase tracking-widest">Pending</span>}
                                                        {isConnectedNode && <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[8px] font-black uppercase tracking-widest">Active Link</span>}
                                                        {prosumer.isCertified && <CheckCircle size={14} className="text-[#00ff88]" />}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                                                        <div className="text-[8px] text-muted uppercase font-black tracking-widest">Trust</div>
                                                        <div className="text-sm font-bold text-white mt-1">{prosumer.trustScore}%</div>
                                                    </div>
                                                    <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                                                        <div className="text-[8px] text-muted uppercase font-black tracking-widest">Live Ask</div>
                                                        <div className="text-sm font-bold text-cyan-400 mt-1">
                                                            {offer ? `${settings.currency}${(offer.price ?? 0).toFixed(2)}` : 'Offline'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5 gap-4">
                                                    <div>
                                                        <div className="text-[8px] text-muted uppercase font-black tracking-widest">Market Inventory</div>
                                                        <div className="text-xs font-black text-white mt-1">{offer ? `${(offer.remainingKwh ?? 0).toFixed(1)} kWh` : 'Awaiting ask'}</div>
                                                    </div>
                                                    <Button
                                                        size="small"
                                                        type={isFocusedNode ? 'primary' : 'default'}
                                                        loading={requestConnectionMutation.isPending && selectedProsumer?._id === prosumer._id}
                                                        disabled={requestConnectionMutation.isPending || isConnectedNode || isPendingNode}
                                                        className={`text-[9px] h-6 px-3 border-none font-bold uppercase transition-all ${isFocusedNode ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,255,224,0.4)]' : 'bg-white/5 text-muted hover:bg-white/10'}`}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setSelectedProsumer(prosumer);
                                                            if (isConnectedNode || isPendingNode) return;
                                                            requestConnectionMutation.mutate(prosumer._id);
                                                        }}
                                                    >
                                                        {connectionLabel}
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="md:col-span-2 p-6 rounded-2xl border border-dashed border-white/10 bg-white/5 text-center">
                                            <div className="text-sm font-black uppercase tracking-wider text-white">No active prosumer nodes found</div>
                                            <div className="text-xs text-muted mt-2">The discovery feed will populate as approved prosumers publish inventory to the local market.</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className={`p-5 rounded-2xl border ${isGridFail ? 'bg-red-500/5 border-red-500/20' : 'bg-white/5 border-white/10'}`}>
                                    <div className="flex items-start gap-4">
                                        {isGridFail ? <ShieldAlert size={20} className="text-orange-400 mt-1" /> : <Battery size={20} className="text-cyan-400 mt-1" />}
                                        <div>
                                            <div className={`text-sm font-black uppercase tracking-wider mb-2 ${recommendationTone}`}>{recommendationTitle}</div>
                                            <div className="text-xs text-muted leading-relaxed">{recommendationBody}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                        <div className="text-[9px] text-muted uppercase font-black tracking-widest">Automation Coverage</div>
                                        <div className="text-2xl font-black text-white font-['Outfit'] mt-2">{automationCoverage}%</div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                        <div className="text-[9px] text-muted uppercase font-black tracking-widest">Protected Circuits</div>
                                        <div className="text-2xl font-black text-[#00ff88] font-['Outfit'] mt-2">{essentialDevicesOnline}</div>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[10px] text-muted font-bold uppercase tracking-widest mb-4">Smart Home API Hub</div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {hubDevices.map(device => (
                                            <div
                                                key={device.key}
                                                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${isGridFail && !device.essential ? 'bg-black/40 border-white/5 opacity-40 grayscale pointer-events-none' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                                onClick={() => {
                                                    if (isGridFail && !device.essential) return;
                                                    setSwitches(previous => ({ ...previous, [device.key]: !previous[device.key] }));
                                                }}
                                            >
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        {device.icon}
                                                        <span className="text-[10px] font-bold text-white uppercase">{device.label}</span>
                                                    </div>
                                                    <span className={`text-[8px] font-black uppercase ${device.essential ? 'text-cyan-400/60' : 'text-muted'}`}>
                                                        {device.essential ? 'Essential' : 'Flexible'}
                                                    </span>
                                                </div>
                                                <div className={`w-4 h-4 rounded-full ${isGridFail && !device.essential ? 'bg-red-500/20' : switches[device.key] ? 'bg-cyan-500 shadow-[0_0_12px_rgba(0,255,224,0.6)]' : 'bg-white/10'}`} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={24}>
                    <Card className="glass-card" bodyStyle={{ padding: '32px' }}>
                        <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
                            <div>
                                <h3 className="text-lg font-black font-['Outfit'] uppercase text-white m-0 tracking-wider flex items-center gap-2">
                                    <Activity size={20} className="text-[#00ff88]" /> Active Market Feed
                                </h3>
                                <p className="text-[10px] text-muted uppercase tracking-widest mt-1">Live asks and bids from neighborhood market nodes</p>
                            </div>

                            <div className="text-[10px] font-black uppercase tracking-widest text-muted">
                                {surgeLabel || 'Standard market pricing'}
                            </div>
                        </div>

                        <Table
                            dataSource={marketFeed}
                            loading={isLoading}
                            rowKey="_id"
                            pagination={{ pageSize: 5 }}
                            className="bg-transparent"
                            locale={{ emptyText: <div className="py-10 text-[10px] font-black uppercase tracking-[0.2em] text-muted">No live asks or bids yet</div> }}
                            rowClassName={(record: MarketFeedRow) => `transition-all ${record.marketSide === 'ASK' && record.isSelected ? 'bg-cyan-500/10 border-l-2 border-l-cyan-400' : 'hover:bg-white/5'}`}
                            columns={[
                                {
                                    title: 'SIDE',
                                    dataIndex: 'marketSide',
                                    render: (side: 'ASK' | 'BID') => (
                                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${side === 'ASK' ? 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/30' : 'bg-[#00e5ff]/10 text-[#00e5ff] border-[#00e5ff]/30'}`}>
                                            {side}
                                        </span>
                                    ),
                                },
                                {
                                    title: 'PARTICIPANT NODE',
                                    dataIndex: ['maker', 'username'],
                                    render: (name: string | undefined, record: MarketFeedRow) => (
                                        <div className="flex items-center gap-3">
                                            <div className={`w-1.5 h-1.5 rounded-full ${record.marketSide === 'ASK' && record.isSelected ? 'bg-cyan-400 animate-pulse' : 'bg-white/20'}`} />
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold ${record.marketSide === 'ASK' && record.isSelected ? 'text-cyan-400' : 'text-white'} uppercase`}>{name}</span>
                                                {record.maker?.isCertified && <span className="px-1.5 py-0.5 rounded bg-[#00ff88]/20 text-[#00ff88] text-[8px] font-black uppercase border border-[#00ff88]/30">Vetted</span>}
                                            </div>
                                        </div>
                                    ),
                                },
                                {
                                    title: 'OPEN KWH',
                                    dataIndex: 'remainingKwh',
                                    render: (kwh: number) => <span className="text-sm font-bold neon-text-green">{(kwh ?? 0).toFixed(2)}</span>,
                                },
                                {
                                    title: 'QUOTED PRICE',
                                    dataIndex: 'price',
                                    render: (price: number, record: MarketFeedRow) => (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-black text-white font-['Outfit']">{settings.currency}{(price ?? 0).toFixed(2)}/kWh</span>
                                            {surgeLabel && record.marketSide === 'ASK' && <span className="text-[8px] font-black text-orange-400 animate-pulse">{surgeLabel}</span>}
                                        </div>
                                    ),
                                },
                                {
                                    title: 'STATUS',
                                    dataIndex: 'status',
                                    render: (status: MarketOrder['status']) => (
                                        <span className="px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border bg-white/5 text-muted border-white/10">
                                            {status || 'PENDING'}
                                        </span>
                                    ),
                                },
                                {
                                    title: 'ROUTE FIT',
                                    key: 'fit',
                                    render: (_: unknown, record: MarketFeedRow) => (
                                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${record.marketSide === 'ASK' && record.isSelected ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-white/5 text-muted border-white/10'}`}>
                                            {record.marketSide === 'ASK' && record.isSelected ? 'Pinned Route' : record.marketSide === 'ASK' ? 'Supply Live' : 'Demand Bid'}
                                        </span>
                                    ),
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
