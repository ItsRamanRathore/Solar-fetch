import React, { useState, useEffect } from 'react';
import { ConfigProvider, Layout, Select, Avatar } from 'antd';
import { darkThemeConfig } from './theme/config';
import Sidebar from './components/Sidebar';
import LiveGrid from './components/views/LiveGrid';
import LedgerView from './components/views/LedgerView';
import ProsumerDashboard from './components/dashboards/ProsumerDashboard';
import ConsumerDashboard from './components/dashboards/ConsumerDashboard';
import AdminDashboard from './components/dashboards/AdminDashboard';
import { User, ChevronDown, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthModal from './components/AuthModal';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

const { Sider, Header, Content } = Layout;

const App: React.FC = () => {
  const [activeKey, setActiveKey] = useState('dashboard');
  const [simMode, setSimMode] = useState('standard');
  const [userRole, setUserRoleState] = useState<'prosumer' | 'consumer' | 'admin'>('consumer');
  const [credits, setCredits] = useState(0);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Fetch initial user and grid state with retry
    const fetchWithRetry = async (url: string, options: RequestInit = {}, retries = 2): Promise<Response | null> => {
      for (let i = 0; i <= retries; i++) {
        try {
          const res = await fetch(url, {
            ...options,
            credentials: 'include',
            signal: AbortSignal.timeout(25000),
          });
          return res;
        } catch (err) {
          if (i === retries) {
            console.error(`Failed to fetch ${url} after ${retries + 1} attempts:`, err);
            return null;
          }
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        }
      }
      return null;
    };

    const fetchData = async () => {
      const [userRes, gridRes] = await Promise.all([
        fetchWithRetry('/api/auth/me'),
        fetchWithRetry('/api/grid')
      ]);
      if (userRes?.ok) {
        const userData = await userRes.json();
        setUser(userData);
        setUserRoleState(userData.role);
        setCredits(userData.credits !== undefined ? userData.credits : 1000);
      }
      if (gridRes?.ok) {
        const gridData = await gridRes.json();
        setSimMode(gridData.simMode);
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
        body: JSON.stringify({ simMode: val }),
        credentials: 'include',
        signal: AbortSignal.timeout(10000),
      });
    } catch (err) {
      console.error('Failed to update simMode', err);
    }
  };

  const renderContent = () => {
    if (activeKey === 'dashboard') {
      if (userRole === 'admin') return <AdminDashboard />;
      if (userRole === 'prosumer') return <ProsumerDashboard />;
      return <ConsumerDashboard />;
    }
    switch (activeKey) {
      case 'live-grid':
        return <LiveGrid simMode={simMode} userRole={userRole} />;
      case 'ledger':
        return <LedgerView simMode={simMode} userRole={userRole} />;
      default:
        if (userRole === 'admin') return <AdminDashboard />;
        if (userRole === 'prosumer') return <ProsumerDashboard />;
        return <ConsumerDashboard />;
    }
  };

  const getPageTitle = () => {
    switch (activeKey) {
      case 'dashboard': return `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} Dashboard`;
      case 'live-grid': return 'Grid Overview';
      case 'ledger': return 'Audit Trail';
      default: return 'Dashboard';
    }
  };

  const getBreadcrumb = () => {
    switch (activeKey) {
      case 'dashboard': return 'Command Center';
      case 'live-grid': return 'System Overview';
      case 'ledger': return 'Immutable Ledger';
      default: return 'Command Center';
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error('Logout request failed:', err);
    }
    setUser(null);
  };

  if (!user) {
    return (
      <ConfigProvider theme={darkThemeConfig}>
        <div className="flex items-center justify-center min-h-screen bg-[#04070a]">
          <AuthModal open={true} onSuccess={(u) => {
            setUser(u);
            setUserRoleState(u.role);
            setCredits(u.credits !== undefined ? u.credits : 1000);
          }} />
        </div>
      </ConfigProvider>
    );
  }

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
          <Sidebar activeKey={activeKey} onSelect={setActiveKey} role={userRole} />
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
                  <div className="h-8 flex items-center px-4 rounded border border-white/10 bg-white/5 text-xs font-bold uppercase tracking-wider text-white">
                    {userRole}
                  </div>
                </div>

              </div>

              {/* User Profile & Credits */}
              <div className="flex items-center gap-6 pl-4 h-12 my-auto border-l border-white/5">
                <div className="flex flex-col items-end">
                  <div className="text-[9px] text-muted font-black uppercase tracking-widest leading-none mb-1">Energy Credits</div>
                  <div className="text-lg font-black font-['Outfit'] neon-text-cyan leading-none">₹{credits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                  <Avatar
                    size={40}
                    icon={<User size={20} />}
                    className="bg-white/5 border border-white/10 flex items-center justify-center"
                  />
                  <div className="hidden xl:flex flex-col">
                    <span className="text-xs font-bold text-white leading-none mb-1">{user?.username || 'Observer'}</span>
                    <span className="text-[10px] text-muted font-bold leading-none capitalize">{user?.role || 'Guest'}</span>
                  </div>
                  <LogOut size={16} className="text-muted hover:text-red-400 ml-2" onClick={handleLogout} />
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
                  <ErrorBoundary>
                    {renderContent()}
                  </ErrorBoundary>
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
