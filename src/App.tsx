import React, { useState, useEffect } from 'react';
import { ConfigProvider, Layout, Select, Avatar } from 'antd';
import { darkThemeConfig } from './theme/config';
import Sidebar from './components/Sidebar';
import LiveGrid from './components/views/LiveGrid';
import MyAssets from './components/views/MyAssets';
import Marketplace from './components/views/Marketplace';
import LedgerView from './components/views/LedgerView';
import { User, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './index.css';

const { Sider, Header, Content } = Layout;

const App: React.FC = () => {
  const [activeKey, setActiveKey] = useState('live-grid');
  const [simMode, setSimMode] = useState('standard');
  const [userRole, setUserRoleState] = useState<'resident' | 'admin'>('resident');
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    // Fetch initial user and grid state
    const fetchData = async () => {
      try {
        const [userRes, gridRes] = await Promise.all([
          fetch('/api/users/me'),
          fetch('/api/grid')
        ]);
        if (userRes.ok) {
          const userData = await userRes.json();
          setUserRoleState(userData.role);
          setCredits(userData.credits);
        }
        if (gridRes.ok) {
          const gridData = await gridRes.json();
          setSimMode(gridData.simMode);
        }
      } catch (err) {
        console.error('Failed to fetch initial state:', err);
      }
    };
    fetchData();
  }, []);

  const handleSimModeChange = async (val: string) => {
    setSimMode(val);
    try {
      await fetch('/api/grid', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simMode: val })
      });
    } catch (err) {
      console.error('Failed to update simMode', err);
    }
  };

  const handleRoleChange = async (val: 'resident' | 'admin') => {
    setUserRoleState(val);
    try {
      await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: val })
      });
    } catch (err) {
      console.error('Failed to update role', err);
    }
  };

  const renderContent = () => {
    switch (activeKey) {
      case 'live-grid':
        return <LiveGrid simMode={simMode} userRole={userRole} />;
      case 'my-assets':
        return <MyAssets simMode={simMode} userRole={userRole} />;
      case 'marketplace':
        return <Marketplace simMode={simMode} userRole={userRole} />;
      case 'ledger':
        return <LedgerView simMode={simMode} userRole={userRole} />;
      default:
        return <LiveGrid simMode={simMode} userRole={userRole} />;
    }
  };

  const getPageTitle = () => {
    switch (activeKey) {
      case 'live-grid': return 'Grid Overview';
      case 'my-assets': return 'Energy Assets';
      case 'marketplace': return 'Live Marketplace';
      case 'ledger': return 'Audit Trail';
      default: return 'Grid Overview';
    }
  };

  const getBreadcrumb = () => {
    switch (activeKey) {
      case 'live-grid': return 'System Overview';
      case 'my-assets': return 'Asset Management';
      case 'marketplace': return 'P2P Trade Floor';
      case 'ledger': return 'Immutable Ledger';
      default: return 'System Overview';
    }
  };

  return (
    <ConfigProvider theme={darkThemeConfig}>
      <Layout style={{ minHeight: '100vh', background: '#04070a' }}>
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
          <Sidebar activeKey={activeKey} onSelect={setActiveKey} />
        </Sider>

        {/* Main Layout Area */}
        <Layout style={{ marginLeft: 260, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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

                {/* Connectivity Pulse */}
                <div className="flex items-center gap-3 px-4 py-1.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] shadow-[0_0_20px_rgba(0,0,0,0.2)] h-fit">
                  <div className="relative flex items-center justify-center">
                    <div className={`w-2 h-2 rounded-full ${simMode === 'grid-fail' ? 'bg-[#ffaa00] shadow-[0_0_8px_#ffaa00]' : 'bg-[#00ff88] shadow-[0_0_8px_#00ff88]'} animate-pulse`} />
                    <div className={`absolute w-4 h-4 rounded-full border ${simMode === 'grid-fail' ? 'border-[#ffaa00]/20' : 'border-[#00ff88]/20'} animate-ping`} />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${simMode === 'grid-fail' ? 'text-[#ffaa00]' : 'neon-text-green'}`}>
                    {simMode === 'grid-fail' ? 'Network: Unstable' : 'Network: Synced'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-10 h-full">
              {/* Simulation Selector */}
              <div className="flex flex-col gap-1 justify-center h-full px-6 border-x border-white/5">
                <span className="text-[9px] text-muted font-black uppercase tracking-widest leading-none">Sim Engine</span>
                <Select
                  value={simMode}
                  className="w-40 glass-select-header"
                  onChange={handleSimModeChange}
                  suffixIcon={<ChevronDown size={12} className="text-muted" />}
                  options={[
                    { value: 'standard', label: <span className="text-xs font-bold">Standard Mode</span> },
                    { value: 'grid-fail', label: <span className="text-xs font-bold text-orange-400">Grid-Fail Protocol</span> },
                    { value: 'sunset', label: <span className="text-xs font-bold text-yellow-400">Sunset Simulation</span> }
                  ]}
                />
              </div>

              {/* Role & Security Pulse */}
              <div className="flex items-center gap-6 px-8 border-l border-white/5 h-12 my-auto">
                <div className="flex flex-col items-end">
                  <div className="text-[9px] text-muted font-black uppercase tracking-widest leading-none mb-2">Platform Rank</div>
                  <Select
                    value={userRole}
                    onChange={handleRoleChange}
                    className="w-32 glass-select-header"
                    options={[
                      { value: 'resident', label: <span className="text-[10px] font-black uppercase">Resident</span> },
                      { value: 'admin', label: <span className="text-[10px] font-black uppercase text-cyan-400">Grid Admin</span> }
                    ]}
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="text-[8px] text-muted font-black uppercase">Zero-Trust</div>
                  <div className="flex gap-1">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`w-1 h-3 rounded-full ${i <= (userRole === 'admin' ? 3 : 2) ? 'bg-[#00ff88] shadow-[0_0_5px_#00ff88]' : 'bg-white/10'}`} />
                    ))}
                  </div>
                </div>
              </div>

              {/* User Profile & Credits */}
              <div className="flex items-center gap-6 pl-4 h-12 my-auto border-l border-white/5">
                <div className="flex flex-col items-end">
                  <div className="text-[9px] text-muted font-black uppercase tracking-widest leading-none mb-1">Energy Credits</div>
                  <div className="text-lg font-black font-['Outfit'] neon-text-cyan leading-none">${credits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                  <Avatar
                    size={40}
                    icon={<User size={20} />}
                    className="bg-white/5 border border-white/10 flex items-center justify-center"
                  />
                  <div className="hidden xl:flex flex-col">
                    <span className="text-xs font-bold text-white leading-none mb-1">Major Tom</span>
                    <span className="text-[10px] text-muted font-bold leading-none">Prosumer IV</span>
                  </div>
                </div>
              </div>
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
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeKey}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  {renderContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default App;
