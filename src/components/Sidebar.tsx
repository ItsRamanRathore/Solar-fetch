import React from 'react';
import { Menu } from 'antd';
import {
    Activity,
    Zap,
    Cpu,
    ShieldCheck,
    Settings,
    HelpCircle,
} from 'lucide-react';

interface SidebarProps {
    onSelect: (key: string) => void;
    activeKey: string;
}

const Sidebar: React.FC<SidebarProps> = ({ onSelect, activeKey }) => {
    return (
        <div className="h-full flex flex-col">
            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00ff88] to-[#00e5ff] flex items-center justify-center shadow-[0_0_15px_rgba(0,255,136,0.4)]">
                    <div className="w-4 h-4 rounded-sm bg-[#04070a]" />
                </div>
                <span className="text-xl font-bold font-['Outfit'] tracking-tight">Solar<span className="neon-text-green">Fetch</span></span>
            </div>

            <Menu
                mode="inline"
                selectedKeys={[activeKey]}
                onClick={({ key }) => onSelect(key)}
                className="flex-1 border-none py-4"
                items={[
                    { key: 'live-grid', icon: <Activity size={18} />, label: 'Grid Overview' },
                    { key: 'marketplace', icon: <Zap size={18} />, label: 'Live Marketplace' },
                    { key: 'my-assets', icon: <Cpu size={18} />, label: 'My Energy Assets' },
                    { key: 'ledger', icon: <ShieldCheck size={18} />, label: 'Audit Trail' },
                ]}
            />

            <div className="p-4 mt-auto border-t border-[rgba(255,255,255,0.1)]">
                <Menu
                    mode="inline"
                    className="border-none"
                    selectable={false}
                    items={[
                        { key: 'settings', icon: <Settings size={18} />, label: 'Settings' },
                        { key: 'help', icon: <HelpCircle size={18} />, label: 'Help & Support' },
                    ]}
                />
            </div>
        </div>
    );
};

export default Sidebar;
