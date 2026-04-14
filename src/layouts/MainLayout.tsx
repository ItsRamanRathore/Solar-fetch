import React from 'react';
import { Layout } from 'antd';
import Sidebar from '../components/Sidebar';
import DirectiveTicker from '../components/DirectiveTicker';
import { ConnectivityPulse, SimulationSelector, UserWidget } from '../components/layout/HeaderComponents';
import type { User } from '../types/user';

const { Sider, Header, Content } = Layout;

interface MainLayoutProps {
    children: React.ReactNode;
    activeKey: string;
    setActiveKey: (key: string) => void;
    user: User | null;
    userRole: string;
    credits: number;
    simMode: string;
    handleSimModeChange: (val: string) => void;
    handleLogout: () => void;
    getPageTitle: () => string;
    getBreadcrumb: () => string;
}

const MainLayout: React.FC<MainLayoutProps> = ({
    children,
    activeKey,
    setActiveKey,
    user,
    userRole,
    credits,
    simMode,
    handleSimModeChange,
    handleLogout,
    getPageTitle,
    getBreadcrumb
}) => {
    return (
        <Layout style={{ minHeight: '100vh', background: '#04070a' }}>
            <DirectiveTicker />
            {/* Fixed Sider */}
            <Sider
                width={260}
                breakpoint="lg"
                collapsedWidth="0"
                className="glass-card !border-y-0 !border-l-0 !rounded-none"
                style={{
                    overflow: 'auto',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 1001,
                }}
            >
                <Sidebar activeKey={activeKey} onSelect={setActiveKey} role={userRole} />
            </Sider>

            {/* Main Layout Area */}
            <Layout
                style={{
                    marginLeft: 260,
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    filter: simMode === 'grid-fail' ? 'hue-rotate(-15deg) saturate(1.2)' : simMode === 'sunset' ? 'hue-rotate(200deg) brightness(0.8)' : 'none',
                    transition: 'filter 1s ease-in-out'
                }}
                className={simMode === 'grid-fail' ? 'animate-pulse border-red-500/20' : ''}
            >
                {/* Global SaaS Header */}
                <Header
                    className={`px-10 flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] backdrop-blur-2xl sticky top-0 z-[1000] transition-colors duration-500 ${simMode === 'grid-fail' ? 'bg-[rgba(153,50,50,0.15)]' : 'bg-[rgba(15,23,42,0.98)]'}`}
                    style={{
                        height: '112px',
                        lineHeight: '112px',
                        padding: '0 40px',
                        width: '100%',
                        flexShrink: 0
                    }}
                >
                    <div className="flex flex-col justify-center h-full">
                        <div className="text-[10px] text-[rgba(255,255,255,0.3)] font-black uppercase tracking-[0.3em] leading-none mb-2">SolarFetch / {getBreadcrumb()}</div>
                        <div className="flex items-center gap-6 leading-none">
                            <h2 className="text-3xl font-extrabold font-['Outfit'] m-0 tracking-tighter text-white uppercase">{getPageTitle()}</h2>
                            <ConnectivityPulse simMode={simMode} />
                        </div>
                    </div>

                    <div className="flex items-center gap-10 h-full">
                        <SimulationSelector simMode={simMode} onModeChange={handleSimModeChange} />
                        
                        <div className="flex items-center gap-6 px-8 border-l border-white/5 h-12 my-auto">
                            <div className="flex flex-col items-end">
                                <div className="text-[9px] text-muted font-black uppercase tracking-widest leading-none mb-2">Platform Rank</div>
                                <div className="h-8 flex items-center px-4 rounded border border-white/10 bg-white/5 text-xs font-bold uppercase tracking-wider text-white">
                                    {userRole}
                                </div>
                            </div>
                        </div>

                        <UserWidget user={user} credits={credits} onLogout={handleLogout} />
                    </div>
                </Header>

                {/* Scrollable Content Area */}
                <Content
                    className="p-10 overflow-y-auto custom-scrollbar"
                    style={{
                        flex: 1,
                        background: 'transparent'
                    }}
                >
                    <div className="max-w-[1600px] mx-auto space-y-12">
                        {children}
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
};

export default MainLayout;
