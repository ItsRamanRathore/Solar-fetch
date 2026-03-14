import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Button, message, Alert } from 'antd';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Zap, Activity, Battery, Award, Settings, HelpCircle, CheckCircle, XCircle, Users } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import GreenCertificate from '../GreenCertificate';
import { useSettings } from '../../contexts/SettingsContext';
import { useSocket } from '../../contexts/SocketContext';
import { formatDateIST, formatTimeIST } from '../../utils/indiaFormat';

interface ProsumerDashboardProps {
    simMode: string;
    userRole: string;
    user?: {
        _id?: string;
        username: string;
        storedEnergy: number;
        batteryCapacity: number;
        isBrokerActive: boolean;
    };
}

interface UsageHistoryResponse {
    timestamp: string;
    generation: number;
    consumption: number;
}

interface YieldChartPoint {
    time: string;
    generation: number;
    consumption: number;
}

interface CurrentUser {
    _id?: string;
    username?: string;
    storedEnergy?: number;
    batteryCapacity?: number;
    isBrokerActive?: boolean;
}

interface ProsumerStats {
    connectedConsumers?: number;
    pendingRequests?: number;
    dailyGeneration?: number;
    dailyRevenue?: number;
}

interface GovernancePublic {
    isAiEnabled?: boolean;
}

interface MarketOrder {
    _id: string;
    type?: 'buy' | 'sell';
    status?: 'PENDING' | 'PARTIAL' | 'MATCHED' | 'CANCELLED';
    createdAt?: string;
    remainingKwh?: number;
    price?: number;
    maker?: {
        username?: string;
        trustScore?: number;
        isCertified?: boolean;
    };
}

interface MarketOrdersResponse {
    sells: MarketOrder[];
    buys: MarketOrder[];
}

interface LedgerTransaction {
    _id: string;
    createdAt: string;
    toUsername?: string;
    to?: string;
    from?: string;
    amount: number;
    price?: number;
    settlementTotal?: number;
    greenHash?: string;
    status?: string;
}

interface ConnectionConsumer {
    _id: string;
    username: string;
    status?: string;
    trustScore?: number;
    isCertified?: boolean;
    credits?: number;
    connectionRequestedAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

interface ProsumerConnections {
    pendingRequests: ConnectionConsumer[];
    connectedConsumers: ConnectionConsumer[];
    newRegistrations: ConnectionConsumer[];
}

interface ConnectionUpdateEvent {
    type?: 'requested' | 'accepted' | 'rejected' | 'disconnected';
    prosumerId?: string;
    consumerId?: string;
    consumerUsername?: string;
}

interface UserUpdateEvent {
    type?: 'registered' | 'approved' | 'suspended';
    role?: 'consumer' | 'prosumer' | 'admin';
}

const ProsumerDashboard: React.FC<ProsumerDashboardProps> = ({ user, simMode }) => {
    const { settings } = useSettings();
    const queryClient = useQueryClient();
    const { socket } = useSocket();
    const [brokerOverride, setBrokerOverride] = useState<boolean | null>(null);
    const [localStoredEnergy, setLocalStoredEnergy] = useState<number | null>(null);
    const [batteryState, setBatteryState] = useState<string>('Idle');

    useEffect(() => {
        if (brokerOverride === true || (user?.isBrokerActive && brokerOverride !== false)) {
            const interval = setInterval(() => {
                if (Math.random() > 0.7) {
                    message.info('AI Broker: Optimal trade path identified. Executing match...', 3);
                }
            }, 10000);
            return () => clearInterval(interval);
        }
    }, [brokerOverride, user?.isBrokerActive]);

    const { data: usageHistory } = useQuery<YieldChartPoint[]>({
        queryKey: ['yieldHistory'],
        queryFn: async () => {
            const res = await fetch('/api/users/usage?limit=24', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch usage history');
            const data = await res.json();
            return data.map((point: UsageHistoryResponse) => {
                const isSunset = simMode === 'sunset';
                const baseGen = point.generation * (isSunset ? 0.4 : 2.5);
                const guaranteedGen = Math.max(baseGen, point.consumption * 1.2);
                return {
                    time: formatTimeIST(point.timestamp),
                    generation: guaranteedGen,
                    consumption: point.consumption,
                };
            });
        },
        refetchInterval: 30000,
    });

    const yieldData = usageHistory || [];

    const { data: fetchedUser } = useQuery<CurrentUser>({
        queryKey: ['user'],
        queryFn: async () => {
            const res = await fetch('/api/auth/me', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch user');
            return res.json();
        },
    });

    const currentUser: CurrentUser = {
        ...(user || fetchedUser),
        isBrokerActive: brokerOverride !== null ? brokerOverride : (user?.isBrokerActive || fetchedUser?.isBrokerActive),
    };

    const { data: stats } = useQuery<ProsumerStats>({
        queryKey: ['userStats'],
        queryFn: async () => {
            const res = await fetch('/api/users/stats', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        },
        refetchInterval: 5000,
    });

    const { data: transactions, isLoading } = useQuery<LedgerTransaction[]>({
        queryKey: ['ledger'],
        queryFn: async () => {
            const res = await fetch('/api/ledger', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch ledger');
            return res.json();
        },
        refetchInterval: 5000,
    });

    const { data: connections, error: connectionsError } = useQuery<ProsumerConnections>({
        queryKey: ['prosumerConnections'],
        queryFn: async () => {
            const res = await fetch('/api/users/connections', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch connection queue');
            return res.json();
        },
        refetchInterval: 2000,
    });

    const { data: orderBook, isLoading: orderBookLoading } = useQuery<MarketOrdersResponse>({
        queryKey: ['prosumerOrderBook'],
        queryFn: async () => {
            const res = await fetch('/api/market/orders', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch market order book');
            return res.json();
        },
        refetchInterval: 2000,
    });

    const { data: gov } = useQuery<GovernancePublic>({
        queryKey: ['governance-public'],
        queryFn: () => fetch('/api/grid/governance-public', { credentials: 'include' }).then(res => res.json()),
        refetchInterval: 10000,
    });

    useEffect(() => {
        if (!socket) return;

        const handleConnectionUpdate = (payload: ConnectionUpdateEvent) => {
            queryClient.invalidateQueries({ queryKey: ['prosumerConnections'] });
            queryClient.invalidateQueries({ queryKey: ['userStats'] });
            queryClient.invalidateQueries({ queryKey: ['user'] });

            if (payload.type === 'requested' && payload.prosumerId === currentUser?._id) {
                message.info(`${payload.consumerUsername} requested a neighborhood link`, 3);
            }
        };

        const handleUserUpdate = (payload: UserUpdateEvent) => {
            queryClient.invalidateQueries({ queryKey: ['prosumerConnections'] });
            queryClient.invalidateQueries({ queryKey: ['userStats'] });
            queryClient.invalidateQueries({ queryKey: ['user'] });

            if (payload.type === 'registered' && payload.role === 'consumer') {
                message.info('New consumer registration detected (awaiting admin approval)', 3);
            }
        };

        const handleMarketUpdate = () => {
            queryClient.invalidateQueries({ queryKey: ['prosumerOrderBook'] });
        };

        socket.on('connections:updated', handleConnectionUpdate);
        socket.on('users:updated', handleUserUpdate);
        socket.on('market:newOrder', handleMarketUpdate);
        socket.on('market:orderComplete', handleMarketUpdate);

        return () => {
            socket.off('connections:updated', handleConnectionUpdate);
            socket.off('users:updated', handleUserUpdate);
            socket.off('market:newOrder', handleMarketUpdate);
            socket.off('market:orderComplete', handleMarketUpdate);
        };
    }, [socket, queryClient, currentUser?._id]);

    const acceptConnectionMutation = useMutation({
        mutationFn: async (consumerId: string) => {
            const res = await fetch(`/api/users/connections/requests/${consumerId}/accept`, {
                method: 'POST',
                credentials: 'include',
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to accept connection request');
            }
            return data;
        },
        onSuccess: (_, consumerId) => {
            const consumer = connections?.pendingRequests.find(entry => entry._id === consumerId);
            message.success(consumer ? `${consumer.username} linked to your microgrid` : 'Consumer linked to your microgrid');
            queryClient.invalidateQueries({ queryKey: ['prosumerConnections'] });
            queryClient.invalidateQueries({ queryKey: ['userStats'] });
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
        onError: (error: Error) => {
            message.error(error.message);
        },
    });

    const rejectConnectionMutation = useMutation({
        mutationFn: async (consumerId: string) => {
            const res = await fetch(`/api/users/connections/requests/${consumerId}/reject`, {
                method: 'POST',
                credentials: 'include',
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to reject connection request');
            }
            return data;
        },
        onSuccess: (_, consumerId) => {
            const consumer = connections?.pendingRequests.find(entry => entry._id === consumerId);
            message.warning(consumer ? `${consumer.username} request declined` : 'Connection request declined');
            queryClient.invalidateQueries({ queryKey: ['prosumerConnections'] });
            queryClient.invalidateQueries({ queryKey: ['userStats'] });
        },
        onError: (error: Error) => {
            message.error(error.message);
        },
    });

    const acceptBidMutation = useMutation({
        mutationFn: async (bidId: string) => {
            const res = await fetch(`/api/market/bids/${bidId}/respond`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'accept' })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to accept bid request');
            }
            return data;
        },
        onSuccess: () => {
            message.success('Bid request accepted and routed to settlement engine');
            queryClient.invalidateQueries({ queryKey: ['prosumerOrderBook'] });
            queryClient.invalidateQueries({ queryKey: ['ledger'] });
            queryClient.invalidateQueries({ queryKey: ['userStats'] });
        },
        onError: (error: Error) => {
            message.error(error.message);
        }
    });

    const rejectBidMutation = useMutation({
        mutationFn: async (bidId: string) => {
            const res = await fetch(`/api/market/bids/${bidId}/respond`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject' })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to reject bid request');
            }
            return data;
        },
        onSuccess: () => {
            message.warning('Bid request rejected');
            queryClient.invalidateQueries({ queryKey: ['prosumerOrderBook'] });
        },
        onError: (error: Error) => {
            message.error(error.message);
        }
    });

    const mySales = transactions && transactions.length > 0 && currentUser
        ? transactions.filter((tx: LedgerTransaction) => 
            tx.from === currentUser.username || 
            tx.from === currentUser._id || 
            tx.from === currentUser._id?.toString()
        )
        : [];

    const currentGen = yieldData[yieldData.length - 1]?.generation || 0;
    const currentCons = yieldData[yieldData.length - 1]?.consumption || 0;
    const isIslanding = simMode === 'grid-fail';

    useEffect(() => {
        if (currentUser?.storedEnergy !== undefined && localStoredEnergy === null) {
            setLocalStoredEnergy(currentUser.storedEnergy);
        } else if (localStoredEnergy === null) {
            setLocalStoredEnergy(12);
        }
    }, [currentUser?.storedEnergy, localStoredEnergy]);

    const batteryCapacity = currentUser?.batteryCapacity && currentUser.batteryCapacity > 0 ? currentUser.batteryCapacity : 20;

    useEffect(() => {
        if (localStoredEnergy === null) return;
        
        const tick = setInterval(() => {
            setLocalStoredEnergy(previous => {
                if (previous === null) return null;
                let next = previous;
                let stateLabel = 'Idle';
                const surplus = currentGen - currentCons;
                const reserveLimit = simMode === 'grid-fail' ? batteryCapacity * 0.05 : batteryCapacity * 0.20;

                if (simMode === 'sunset' || simMode === 'grid-fail') {
                    if (next > reserveLimit) {
                        stateLabel = simMode === 'grid-fail' ? 'Emergency Discharging' : 'Arbitrage (Selling)';
                        next -= batteryCapacity * 0.02;
                    } else {
                        stateLabel = 'Safety Reserve Locked';
                    }
                } else if (surplus > 0) {
                    if (next < batteryCapacity) {
                        stateLabel = 'Charging (Surplus)';
                        next += surplus * 0.05;
                        if (next > batteryCapacity) next = batteryCapacity;
                    } else {
                        stateLabel = 'Selling Max Surplus';
                    }
                } else if (surplus < 0) {
                    if (next > reserveLimit) {
                        stateLabel = 'Discharging (Gap Fill)';
                        next -= Math.abs(surplus) * 0.05;
                    } else {
                        stateLabel = 'Grid Assist (Reserve Reached)';
                    }
                }

                setBatteryState(stateLabel);
                return Math.max(0, Math.min(batteryCapacity, next));
            });
        }, 1500);

        return () => clearInterval(tick);
    }, [currentGen, currentCons, batteryCapacity, simMode, localStoredEnergy]);

    const isAiLocked = gov?.isAiEnabled === false;
    const isBatteryMode = currentGen < currentCons || simMode !== 'standard';
    const pendingRequests = connections?.pendingRequests || [];
    const connectedConsumers = connections?.connectedConsumers || [];
    const newRegistrations = connections?.newRegistrations || [];
    const liveBuyBids = orderBook?.buys || [];
    const connectionsErrorMessage = connectionsError instanceof Error ? connectionsError.message : '';

    return (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-6">
                <div>
                    <h2 className="text-3xl font-black font-['Outfit'] uppercase tracking-tighter text-white m-0">Prosumer Studio</h2>
                    <p className="text-muted tracking-wide text-xs uppercase mt-1">Live yield, consumer approvals, and revenue analytics</p>
                </div>
                
                <div className="flex gap-4 flex-wrap items-center justify-end">
                    <div className="px-4 py-2 rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Users size={12} /> Pending Requests: {pendingRequests.length}
                    </div>
                    <div className="px-4 py-2 rounded border border-[#00ff88]/40 bg-[#00ff88]/10 text-[#00ff88] text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle size={12} /> Active Links: {connectedConsumers.length}
                    </div>
                    <div className="px-4 py-2 rounded border border-yellow-500/40 bg-yellow-500/10 text-yellow-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Activity size={12} /> New Registrations: {newRegistrations.length}
                    </div>
                    {isIslanding && (
                        <div className="px-4 py-2 rounded border border-red-500/50 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                            Micro-grid Islanding Active
                        </div>
                    )}
                    {isBatteryMode && (
                        <div className="px-4 py-2 rounded border border-yellow-500/50 bg-yellow-500/10 text-yellow-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <Battery size={12} className="animate-bounce" /> Battery Discharge Mode
                        </div>
                    )}
                    <div className="flex items-center gap-2 ml-2">
                        <Button className="glass-button !p-2" icon={<Settings size={14} />} />
                        <Button className="glass-button !p-2" icon={<HelpCircle size={14} />} />
                    </div>
                </div>
            </div>

            <Row gutter={[24, 24]}>
                <Col xs={24} lg={16}>
                    <Card className="glass-card h-full" bodyStyle={{ padding: '24px' }}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 m-0">
                                <Activity size={16} className="text-[#00ffe0]" /> Live Microgrid Yield
                            </h3>
                            <div className="flex gap-4 text-xs font-bold uppercase tracking-wider">
                                <span className="text-[#00ffe0] flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#00ffe0]"></div>Generation</span>
                                <span className="text-[#ff3b6a] flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#ff3b6a]"></div>Consumption</span>
                            </div>
                        </div>

                        <Row gutter={24} className="mb-8">
                            <Col span={8}>
                                <Statistic title={<span className="text-[10px] uppercase tracking-widest text-muted">Daily Yield</span>} value={stats?.dailyGeneration || 0} suffix="kWh" valueStyle={{ color: '#00ffe0', fontSize: '28px', fontWeight: 900, fontFamily: 'Outfit' }} />
                                <div className="text-[9px] text-[#00ff88] font-bold mt-1 uppercase tracking-tighter">Last 24 Hours</div>
                            </Col>
                            <Col span={8}>
                                <Statistic title={<span className="text-[10px] uppercase tracking-widest text-muted">Daily Revenue</span>} value={stats?.dailyRevenue || 0} precision={2} prefix={settings.currency} valueStyle={{ color: '#ff3b6a', fontSize: '28px', fontWeight: 900, fontFamily: 'Outfit' }} />
                                <div className="text-[9px] text-muted font-bold mt-1 uppercase tracking-tighter">Est. Settlements</div>
                            </Col>
                            <Col span={8}>
                                <Statistic title={<span className="text-[10px] uppercase tracking-widest text-muted">Connected Clients</span>} value={connectedConsumers.length} suffix="Nodes" valueStyle={{ color: '#00ff88', fontSize: '28px', fontWeight: 900, fontFamily: 'Outfit' }} />
                                <div className="text-[9px] text-muted font-bold mt-1 uppercase tracking-tighter">P2P peer directives</div>
                            </Col>
                        </Row>

                        <div className="h-[250px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={yieldData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorGen" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00ffe0" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#00ffe0" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorCons" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ff3b6a" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ff3b6a" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} />
                                    <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(10,15,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', backdropFilter: 'blur(10px)' }}
                                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                    />
                                    <Area type="monotone" dataKey="generation" stroke="#00ffe0" strokeWidth={2} fillOpacity={1} fill="url(#colorGen)" />
                                    <Area type="monotone" dataKey="consumption" stroke="#ff3b6a" strokeWidth={2} fillOpacity={1} fill="url(#colorCons)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>

                <Col xs={24} lg={8}>
                    <Card className="glass-card h-full" bodyStyle={{ padding: '24px' }}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 m-0">
                                <Battery size={16} className="text-[#00ff88]" /> Virtual Battery (VBM)
                            </h3>
                            <div className="px-2 py-0.5 rounded bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] text-[9px] font-black uppercase tracking-widest">
                                Optimized
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center py-4">
                            <div className="relative w-32 h-32 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                                <div 
                                    className="absolute inset-0 rounded-full border-4 border-[#00ff88] transition-all duration-1000"
                                    style={{ 
                                        clipPath: `inset(${100 - ((localStoredEnergy ?? 0) / batteryCapacity * 100)}% 0 0 0)`,
                                        filter: batteryState.includes('Charging') ? 'drop-shadow(0 0 15px #00ffe0)' : batteryState.includes('Discharging') ? 'drop-shadow(0 0 12px #ffaa00)' : 'drop-shadow(0 0 8px #00ff88)',
                                        borderColor: batteryState.includes('Charging') ? '#00ffe0' : batteryState.includes('Discharging') ? '#ffaa00' : '#00ff88'
                                    }}
                                />
                                <div className="text-center">
                                    <div className="text-2xl font-black text-white leading-none">
                                        {(((localStoredEnergy ?? 0) / batteryCapacity) * 100).toFixed(0)}%
                                    </div>
                                    <div className="text-[10px] text-muted uppercase font-bold">Stored</div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 w-full mt-8">
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                                    <div className="text-[9px] text-muted uppercase font-black mb-1">Capacity</div>
                                    <div className="text-sm font-bold text-white">{batteryCapacity} kWh</div>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center flex flex-col justify-center items-center">
                                    <div className="text-[9px] text-muted uppercase font-black mb-1">State</div>
                                    <div className={`text-[10px] uppercase font-black text-center ${batteryState.includes('Charging') ? 'text-[#00ffe0] animate-pulse' : batteryState.includes('Discharging') ? 'text-[#ffaa00]' : 'text-[#00ff88]'}`}>
                                        {batteryState}
                                    </div>
                                </div>
                            </div>

                            <div className="w-full mt-6 p-4 rounded-2xl bg-cyan-400/5 border border-cyan-400/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${isAiLocked ? 'bg-red-500/10' : currentUser?.isBrokerActive ? 'bg-cyan-400/20 animate-pulse' : 'bg-white/10'}`}>
                                        <Activity size={16} className={isAiLocked ? 'text-red-500' : currentUser?.isBrokerActive ? 'text-cyan-400' : 'text-muted'} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-white uppercase leading-none mb-1">
                                            {isAiLocked ? 'AI Broker (Locked)' : 'AI Smart Broker'}
                                        </div>
                                        <div className="text-[9px] text-muted uppercase tracking-tighter">
                                            {isAiLocked ? 'Disabled by System Governor' : 'Auto-Arbitrage Logic'}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    disabled={isAiLocked}
                                    onClick={async () => {
                                        if (isAiLocked) return;
                                        setBrokerOverride(!currentUser.isBrokerActive);
                                        message.success(`AI Broker ${!currentUser.isBrokerActive ? 'Enabled' : 'Disabled'}`);
                                        try {
                                            await fetch('/api/assets/broker/toggle', { method: 'POST' });
                                            queryClient.invalidateQueries({ queryKey: ['user'] });
                                        } catch {
                                            console.warn('Backend disconnected, using local simulation');
                                        }
                                    }}
                                    className={`w-12 h-6 rounded-full transition-all relative ${isAiLocked ? 'bg-red-500/20 cursor-not-allowed opacity-50' : currentUser?.isBrokerActive ? 'bg-cyan-400' : 'bg-white/10'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${currentUser?.isBrokerActive ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={24}>
                    <Card className="glass-card" bodyStyle={{ padding: '32px' }}>
                        <div className="flex justify-between items-center mb-8 gap-4 flex-wrap">
                            <div>
                                <h3 className="text-lg font-black font-['Outfit'] uppercase text-white m-0 tracking-wider flex items-center gap-2">
                                    <Users size={20} className="text-cyan-400" /> Consumer Access Queue
                                </h3>
                                <p className="text-[10px] text-muted uppercase tracking-widest mt-1">Accept or reject consumer requests and monitor active household links</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 w-full max-w-[320px]">
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                                    <div className="text-[8px] text-muted uppercase font-black mb-1">Pending</div>
                                    <div className="text-sm font-bold text-cyan-400">{pendingRequests.length}</div>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                                    <div className="text-[8px] text-muted uppercase font-black mb-1">Active Links</div>
                                    <div className="text-sm font-bold text-[#00ff88]">{connectedConsumers.length}</div>
                                </div>
                            </div>
                        </div>

                        {connectionsErrorMessage && (
                            <Alert
                                type="warning"
                                showIcon
                                className="mb-6"
                                message="Queue refresh issue"
                                description={`Live queue fetch failed: ${connectionsErrorMessage}. Please confirm this account is authenticated and approved.`}
                            />
                        )}

                        <div className="mb-8 p-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/5">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div>
                                    <div className="text-[10px] text-yellow-400 font-black uppercase tracking-widest">Latest Consumer Registrations</div>
                                    <div className="text-[10px] text-muted uppercase tracking-widest mt-1">Realtime registration feed from auth events</div>
                                </div>
                                <div className="text-[10px] text-yellow-300 font-black uppercase tracking-widest">{newRegistrations.length} pending vetting</div>
                            </div>
                            {newRegistrations.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
                                    {newRegistrations.slice(0, 6).map(consumer => (
                                        <div key={consumer._id} className="p-3 rounded-xl border border-yellow-500/20 bg-black/20">
                                            <div className="text-[11px] font-black text-white uppercase tracking-wide">{consumer.username}</div>
                                            <div className="text-[9px] text-yellow-400 uppercase font-black tracking-widest mt-1">{consumer.status || 'pending'}</div>
                                            <div className="text-[9px] text-muted uppercase tracking-widest mt-2">
                                                Registered {consumer.createdAt ? formatTimeIST(consumer.createdAt) : 'recently'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-xs text-muted mt-4">No fresh consumer registrations right now.</div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8">
                            <div className="space-y-4">
                                <div className="text-[10px] text-muted font-bold uppercase tracking-widest">Pending Approval Requests</div>
                                {pendingRequests.length > 0 ? pendingRequests.map(consumer => (
                                    <div key={consumer._id} className="p-5 rounded-2xl bg-white/5 border border-white/10">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <div className="text-sm font-black text-white uppercase tracking-wide">{consumer.username}</div>
                                                <div className="text-[9px] text-muted font-bold uppercase tracking-widest mt-1">
                                                    Requested {consumer.connectionRequestedAt ? formatTimeIST(consumer.connectionRequestedAt) : 'recently'}
                                                </div>
                                            </div>
                                            {consumer.isCertified && <CheckCircle size={14} className="text-[#00ff88]" />}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mt-4">
                                            <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                                                <div className="text-[8px] text-muted uppercase font-black tracking-widest">Trust</div>
                                                <div className="text-sm font-bold text-white mt-1">{consumer.trustScore ?? 0}%</div>
                                            </div>
                                            <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                                                <div className="text-[8px] text-muted uppercase font-black tracking-widest">Credits</div>
                                                <div className="text-sm font-bold text-cyan-400 mt-1">{settings.currency}{(consumer.credits ?? 0).toFixed(2)}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
                                            <Button
                                                type="primary"
                                                loading={acceptConnectionMutation.isPending}
                                                className="bg-[#00ff88] hover:bg-[#00e5ff] text-black border-none font-black text-[10px] uppercase h-8 flex items-center gap-1"
                                                onClick={() => acceptConnectionMutation.mutate(consumer._id)}
                                            >
                                                <CheckCircle size={12} /> Accept
                                            </Button>
                                            <Button
                                                danger
                                                loading={rejectConnectionMutation.isPending}
                                                className="font-black text-[10px] uppercase h-8 flex items-center gap-1"
                                                onClick={() => rejectConnectionMutation.mutate(consumer._id)}
                                            >
                                                <XCircle size={12} /> Reject
                                            </Button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-6 rounded-2xl border border-dashed border-white/10 bg-white/5 text-center">
                                        <div className="text-sm font-black uppercase tracking-wider text-white">No pending consumers</div>
                                        <div className="text-xs text-muted mt-2">New connection requests will appear here the moment a consumer targets your node.</div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="text-[10px] text-muted font-bold uppercase tracking-widest">Active Consumer Links</div>
                                {connectedConsumers.length > 0 ? connectedConsumers.map(consumer => (
                                    <div key={consumer._id} className="p-5 rounded-2xl bg-cyan-500/5 border border-cyan-500/10">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <div className="text-sm font-black text-white uppercase tracking-wide">{consumer.username}</div>
                                                <div className="text-[9px] text-muted font-bold uppercase tracking-widest mt-1">
                                                    Linked {consumer.updatedAt ? formatDateIST(consumer.updatedAt) : 'recently'}
                                                </div>
                                            </div>
                                            <span className="px-2 py-0.5 rounded bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] text-[8px] font-black uppercase tracking-widest">Active</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mt-4">
                                            <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                                                <div className="text-[8px] text-muted uppercase font-black tracking-widest">Trust</div>
                                                <div className="text-sm font-bold text-white mt-1">{consumer.trustScore ?? 0}%</div>
                                            </div>
                                            <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                                                <div className="text-[8px] text-muted uppercase font-black tracking-widest">Credits</div>
                                                <div className="text-sm font-bold text-cyan-400 mt-1">{settings.currency}{(consumer.credits ?? 0).toFixed(2)}</div>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-6 rounded-2xl border border-dashed border-white/10 bg-white/5 text-center">
                                        <div className="text-sm font-black uppercase tracking-wider text-white">No active consumer links</div>
                                        <div className="text-xs text-muted mt-2">Accepted households will show up here and refresh automatically across connected dashboards.</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={24}>
                    <Card className="glass-card" bodyStyle={{ padding: '32px' }}>
                        <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
                            <div>
                                <h3 className="text-lg font-black font-['Outfit'] uppercase text-white m-0 tracking-wider flex items-center gap-2">
                                    <Activity size={20} className="text-[#00e5ff]" /> Live Bid Demand
                                </h3>
                                <p className="text-[10px] text-muted uppercase tracking-widest mt-1">Realtime consumer buy orders entering the market book</p>
                            </div>
                            <div className="px-4 py-2 rounded border border-[#00e5ff]/40 bg-[#00e5ff]/10 text-[#00e5ff] text-[10px] font-black uppercase tracking-widest">
                                Active Bids: {liveBuyBids.length}
                            </div>
                        </div>

                        <Table
                            dataSource={liveBuyBids}
                            loading={orderBookLoading}
                            rowKey="_id"
                            pagination={{ pageSize: 5 }}
                            className="bg-transparent"
                            locale={{ emptyText: <div className="py-10 text-[10px] font-black uppercase tracking-[0.2em] text-muted">No live bids in order book</div> }}
                            rowClassName="hover:bg-white/5 transition-colors"
                            columns={[
                                {
                                    title: 'BIDDER',
                                    dataIndex: ['maker', 'username'],
                                    render: (name: string | undefined) => <span className="text-xs font-bold text-white uppercase">{name || 'Unknown'}</span>,
                                },
                                {
                                    title: 'OPEN VOLUME',
                                    dataIndex: 'remainingKwh',
                                    render: (kwh: number | undefined) => <span className="text-sm font-bold text-[#00ff88]">{(kwh ?? 0).toFixed(2)} kWh</span>,
                                },
                                {
                                    title: 'BID PRICE',
                                    dataIndex: 'price',
                                    render: (price: number | undefined) => <span className="text-sm font-black text-white">{settings.currency}{(price ?? 0).toFixed(2)}/kWh</span>,
                                },
                                {
                                    title: 'STATUS',
                                    dataIndex: 'status',
                                    render: (status: string | undefined) => <span className="px-2 py-1 rounded bg-[#00e5ff]/10 border border-[#00e5ff]/20 text-[#00e5ff] text-[9px] font-black uppercase tracking-widest">{status || 'PENDING'}</span>,
                                },
                                {
                                    title: 'PLACED',
                                    dataIndex: 'createdAt',
                                    render: (createdAt: string | undefined) => <span className="text-xs text-muted">{createdAt ? formatTimeIST(createdAt) : '-'}</span>,
                                },
                                {
                                    title: 'ACTIONS',
                                    key: 'actions',
                                    render: (_: unknown, record: MarketOrder) => (
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="primary"
                                                size="small"
                                                loading={acceptBidMutation.isPending}
                                                className="bg-[#00ff88] hover:bg-[#00e5ff] text-black border-none font-black text-[9px] uppercase h-7"
                                                onClick={() => acceptBidMutation.mutate(record._id)}
                                            >
                                                Accept
                                            </Button>
                                            <Button
                                                danger
                                                size="small"
                                                loading={rejectBidMutation.isPending}
                                                className="font-black text-[9px] uppercase h-7"
                                                onClick={() => rejectBidMutation.mutate(record._id)}
                                            >
                                                Reject
                                            </Button>
                                        </div>
                                    )
                                }
                            ]}
                        />
                    </Card>
                </Col>

                <Col xs={24}>
                    <Card className="glass-card" bodyStyle={{ padding: '32px' }}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-black font-['Outfit'] uppercase text-white m-0 tracking-wider flex items-center gap-2">
                                    <Zap size={20} className="neon-text-cyan" /> My Sales Ledger
                                </h3>
                                <p className="text-[10px] text-muted uppercase tracking-widest mt-1">Verified exported energy contracts</p>
                            </div>
                        </div>

                        <Table
                            dataSource={mySales}
                            loading={isLoading}
                            rowKey="_id"
                            pagination={{ pageSize: 5 }}
                            className="bg-transparent"
                            rowClassName="hover:bg-white/5 transition-colors"
                            columns={[
                                {
                                    title: 'TIME',
                                    dataIndex: 'createdAt',
                                    render: (date: string) => <span className="text-xs text-muted font-mono">{formatTimeIST(date)}</span>,
                                },
                                {
                                    title: 'PURCHASER',
                                    dataIndex: 'toUsername',
                                    render: (username: string | undefined, record: LedgerTransaction) => {
                                        const display = username || record.to || 'Unknown';
                                        return (
                                            <span className="text-xs font-bold text-white tracking-wider flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] uppercase border border-cyan-500/30">
                                                    {String(display).substring(0, 1)}
                                                </div>
                                                {display}
                                            </span>
                                        );
                                    },
                                },
                                {
                                    title: 'VOLUME',
                                    dataIndex: 'amount',
                                    render: (amount: number) => <span className="text-sm font-bold neon-text-green">{amount.toFixed(2)} kWh</span>,
                                },
                                {
                                    title: 'PRICE',
                                    dataIndex: 'price',
                                    render: (price: number | undefined) => <span className="text-xs text-muted font-mono">{settings.currency}{((price ?? 0) * (isIslanding ? 2.0 : 1.0)).toFixed(2)}/kWh</span>,
                                },
                                {
                                    title: 'REVENUE',
                                    dataIndex: 'settlementTotal',
                                    render: (total: number | undefined) => <span className="text-sm font-black text-white font-['Outfit']">{settings.currency}{((total ?? 0) * (isIslanding ? 2.0 : 1.0)).toFixed(2)}</span>,
                                },
                                {
                                    title: 'ESG HASH',
                                    dataIndex: 'greenHash',
                                    render: (hash: string | undefined) => hash ? (
                                        <div className="flex items-center gap-1 text-cyan-400">
                                            <Award size={12} />
                                            <span className="text-[10px] font-mono">{hash.substring(0, 8)}</span>
                                        </div>
                                    ) : <span className="text-[10px] text-muted">-</span>,
                                },
                                {
                                    title: 'STATUS',
                                    dataIndex: 'status',
                                    render: () => <span className="px-2 py-1 rounded bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] text-[9px] font-black uppercase tracking-widest">Settled</span>,
                                }
                            ]}
                        />
                    </Card>
                    
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {mySales.filter((tx: LedgerTransaction) => tx.greenHash).slice(0, 3).map((tx: LedgerTransaction) => (
                            <GreenCertificate key={tx._id} tx={tx} />
                        ))}
                    </div>
                </Col>
            </Row>
        </div>
    );
};

export default ProsumerDashboard;
