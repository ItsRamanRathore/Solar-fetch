import React, { useState, useEffect } from 'react';
import { Drawer, Badge, List } from 'antd';
import { Bell, Zap, TrendingUp, Link, Link2Off, UserCheck, UserX } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { motion } from 'framer-motion';

const NotificationDrawer: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const { socket } = useSocket();

    useEffect(() => {
        if (!socket) return;

        const handleNewOrder = (data: any) => {
            const newNotif = {
                id: Date.now(),
                title: 'Market Signal',
                message: `New ${data.type} at ₹${data.price}/kWh (${data.volume}kWh)`,
                icon: <Zap size={14} className="text-cyan-400" />,
                time: data.time
            };
            setNotifications(prev => [newNotif, ...prev].slice(0, 15));
        };

        const handleOrderComplete = (data: any) => {
             const newNotif = {
                id: Date.now(),
                title: 'Trade Settlement',
                message: `Order ${data.txid} settled at ₹${data.price}. Volume: ${data.volume}kW`,
                icon: <TrendingUp size={14} className="text-[#00ff88]" />,
                time: data.time
            };
            setNotifications(prev => [newNotif, ...prev].slice(0, 15));
        };

        const handleConnectionUpdate = (data: any) => {
            const msgMap: Record<string, { title: string; icon: React.ReactNode; message: string }> = {
                requested: {
                    title: 'Connection Request',
                    icon: <Link size={14} className="text-yellow-400" />,
                    message: `${data.consumerUsername} requested a link to ${data.prosumerUsername}`,
                },
                accepted: {
                    title: 'P2P Link Established',
                    icon: <Link size={14} className="text-[#00ff88]" />,
                    message: `${data.prosumerUsername} accepted ${data.consumerUsername}'s connection`,
                },
                rejected: {
                    title: 'Request Declined',
                    icon: <Link2Off size={14} className="text-red-400" />,
                    message: `${data.prosumerUsername} declined ${data.consumerUsername}'s request`,
                },
                disconnected: {
                    title: 'P2P Link Dropped',
                    icon: <Link2Off size={14} className="text-orange-400" />,
                    message: `${data.consumerUsername} unlinked from ${data.prosumerUsername}`,
                },
            };
            const entry = msgMap[data.type];
            if (!entry) return;
            setNotifications(prev => [{ id: Date.now(), ...entry, time: data.time }, ...prev].slice(0, 20));
        };

        const handleUserUpdate = (data: any) => {
            const msgMap: Record<string, { title: string; icon: React.ReactNode; message: string }> = {
                approved: {
                    title: 'User Approved',
                    icon: <UserCheck size={14} className="text-[#00ff88]" />,
                    message: `A ${data.role || 'user'} account has been approved and is now active`,
                },
                suspended: {
                    title: 'User Suspended',
                    icon: <UserX size={14} className="text-red-400" />,
                    message: `An account has been suspended by the grid administrator`,
                },
                registered: {
                    title: 'New Registration',
                    icon: <UserCheck size={14} className="text-cyan-400" />,
                    message: `A new ${data.role || 'user'} registered and is pending approval`,
                },
            };
            const entry = msgMap[data.type];
            if (!entry) return;
            setNotifications(prev => [{ id: Date.now(), ...entry, time: data.time }, ...prev].slice(0, 20));
        };

        socket.on('market:newOrder', handleNewOrder);
        socket.on('market:orderComplete', handleOrderComplete);
        socket.on('connections:updated', handleConnectionUpdate);
        socket.on('users:updated', handleUserUpdate);

        return () => {
            socket.off('market:newOrder', handleNewOrder);
            socket.off('market:orderComplete', handleOrderComplete);
            socket.off('connections:updated', handleConnectionUpdate);
            socket.off('users:updated', handleUserUpdate);
        };
    }, [socket]);

    return (
        <>
            <div 
                className="relative cursor-pointer hover:scale-110 transition-transform"
                onClick={() => setOpen(true)}
            >
                <Badge count={notifications.length} size="small" offset={[-2, 2]} className="text-[8px]">
                    <Bell size={20} className="text-white opacity-60 hover:opacity-100" />
                </Badge>
            </div>

            <Drawer
                title={
                    <div className="flex items-center gap-3">
                        <Bell size={18} className="text-cyan-400" />
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-white">Live System Feed</span>
                    </div>
                }
                placement="right"
                onClose={() => setOpen(false)}
                open={open}
                width={380}
                className="glass-drawer"
                headerStyle={{ background: '#0a0f18', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                bodyStyle={{ background: '#04070a', padding: '12px' }}
            >
                <List
                    itemLayout="horizontal"
                    dataSource={notifications}
                    renderItem={(item) => (
                        <motion.div
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="p-4 rounded-xl border border-white/5 bg-white/[0.02] mb-3 hover:bg-white/[0.04] transition-colors"
                        >
                            <div className="flex gap-4">
                                <div className="p-2 rounded-lg bg-black/40 border border-white/5 h-fit">
                                    {item.icon}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-white m-0">{item.title}</h4>
                                        <span className="text-[8px] text-muted font-bold">{item.time}</span>
                                    </div>
                                    <p className="text-[11px] text-white/50 m-0 mt-1 leading-relaxed">
                                        {item.message}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                    locale={{ emptyText: <div className="py-20 text-center text-[10px] text-muted font-bold uppercase tracking-[0.2em]">No incoming signals</div> }}
                />
            </Drawer>
        </>
    );
};

export default NotificationDrawer;
