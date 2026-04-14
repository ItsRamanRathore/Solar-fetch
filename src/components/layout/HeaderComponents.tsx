import React from 'react';
import { Select, Avatar } from 'antd';
import { User as LucideUser, ChevronDown, LogOut } from 'lucide-react';
import NotificationDrawer from '../NotificationDrawer';
import type { User } from '../../types/user';

export const ConnectivityPulse: React.FC<{ simMode: string }> = ({ simMode }) => (
    <div className="flex items-center gap-3 px-4 py-1.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] shadow-[0_0_20px_rgba(0,0,0,0.2)] h-fit">
        <div className="relative flex items-center justify-center">
            <div className={`w-2 h-2 rounded-full ${simMode === 'grid-fail' ? 'bg-[#ffaa00] shadow-[0_0_8px_#ffaa00]' : 'bg-[#00ff88] shadow-[0_0_8px_#00ff88]'} animate-pulse`} />
            <div className={`absolute w-4 h-4 rounded-full border ${simMode === 'grid-fail' ? 'border-[#ffaa00]/20' : 'border-[#00ff88]/20'} animate-ping`} />
        </div>
        <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${simMode === 'grid-fail' ? 'text-[#ffaa00]' : 'neon-text-green'}`}>
            {simMode === 'grid-fail' ? 'Network: Unstable' : 'Network: Synced'}
        </span>
    </div>
);

export const SimulationSelector: React.FC<{ simMode: string; onModeChange: (val: string) => void }> = ({ simMode, onModeChange }) => (
    <div className="flex flex-col gap-1 justify-center h-full px-6 border-x border-white/5">
        <span className="text-[9px] text-muted font-black uppercase tracking-widest leading-none">Sim Engine</span>
        <Select
            value={simMode}
            className="w-40 glass-select-header"
            onChange={onModeChange}
            suffixIcon={<ChevronDown size={12} className="text-muted" />}
            options={[
                { value: 'standard', label: <span className="text-xs font-bold">Standard Mode</span> },
                { value: 'grid-fail', label: <span className="text-xs font-bold text-orange-400">Grid-Fail Protocol</span> },
                { value: 'sunset', label: <span className="text-xs font-bold text-yellow-400">Sunset Simulation</span> }
            ]}
        />
    </div>
);

export const UserWidget: React.FC<{ user: User | null; credits: number; onLogout: () => void }> = ({ user, credits, onLogout }) => (
    <div className="flex items-center gap-6 pl-4 h-12 my-auto border-l border-white/5">
        <NotificationDrawer />
        <div className="flex flex-col items-end">
            <div className="text-[9px] text-muted font-black uppercase tracking-widest leading-none mb-1">Energy Credits</div>
            <div className="text-lg font-black font-['Outfit'] neon-text-cyan leading-none">₹{credits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
            <Avatar
                size={40}
                icon={<LucideUser size={20} />}
                className="bg-white/5 border border-white/10 flex items-center justify-center"
            />
            <div className="hidden xl:flex flex-col">
                <span className="text-xs font-bold text-white leading-none mb-1">{user?.username || 'Observer'}</span>
                <span className="text-[10px] text-muted font-bold leading-none capitalize">{user?.role || 'Guest'}</span>
            </div>
            <LogOut size={16} className="text-muted hover:text-red-400 ml-2" onClick={onLogout} />
        </div>
    </div>
);
