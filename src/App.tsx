import React, { useState, useEffect } from 'react';
import { ConfigProvider, message } from 'antd';
import { darkThemeConfig } from './theme/config';
import MainLayout from './layouts/MainLayout';
import LiveGrid from './components/views/LiveGrid';
import LedgerView from './components/views/LedgerView';
import ProsumerDashboard from './components/dashboards/ProsumerDashboard';
import ConsumerDashboard from './components/dashboards/ConsumerDashboard';
import AdminDashboard from './components/dashboards/AdminDashboard';
import AuthModal from './components/AuthModal';
import SettingsView from './components/views/SettingsView';
import HelpView from './components/views/HelpView';
import { motion, AnimatePresence } from 'framer-motion';
import type { User } from './types/user';
import './index.css';

// Dynamic detection of LandingPage
const landingModules = import.meta.glob('./landing/LandingPage.tsx', { eager: true });
const LandingPageComponent = (Object.values(landingModules)[0] as any)?.default;

const App: React.FC = () => {
    const [activeKey, setActiveKey] = useState('dashboard');
    const [simMode, setSimMode] = useState('standard');
    const [userRole, setUserRoleState] = useState<'prosumer' | 'consumer' | 'admin'>('consumer');
    const [credits, setCredits] = useState(0);
    const [user, setUser] = useState<User | null>(null);
    const [landingDismissed, setLandingDismissed] = useState(false);

    const handleStart = () => {
        setLandingDismissed(true);
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [userRes, gridRes] = await Promise.all([
                    fetch('/api/auth/me', { credentials: 'include' }),
                    fetch('/api/grid', { credentials: 'include' })
                ]);
                
                if (userRes.ok) {
                    const userData = await userRes.json();
                    setUser(userData);
                    setUserRoleState(userData.role);
                    setCredits(userData.credits !== undefined ? userData.credits : 1000);
                }
                if (gridRes.ok) {
                    const gridData = await gridRes.json();
                    setSimMode(gridData.simMode);
                }
            } catch (err) {
                console.error('Initial fetch failed', err);
            }
        };
        fetchInitialData();
    }, []);

    const handleSimModeChange = async (val: string) => {
        setSimMode(val);
        message.loading({ content: `Shifted Grid to ${val.toUpperCase()} Protocol`, key: 'simShift', duration: 1 });
        try {
            await fetch('/api/grid', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ simMode: val }),
                credentials: 'include'
            });
            setTimeout(() => message.success({ content: `Grid Protocol: ${val.toUpperCase()} Synced`, key: 'simShift' }), 1000);
        } catch (err) {
            console.error('Failed to update simMode', err);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } catch (err) {
            console.error('Logout failed', err);
        }
        setUser(null);
    };

    const getPageTitle = () => {
        switch (activeKey) {
            case 'dashboard': return `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} Dashboard`;
            case 'live-grid': return 'Grid Overview';
            case 'ledger': return 'Audit Trail';
            case 'settings': return 'System Settings';
            case 'help': return 'Help Center';
            default: return 'Dashboard';
        }
    };

    const getBreadcrumb = () => {
        switch (activeKey) {
            case 'dashboard': return 'Command Center';
            case 'live-grid': return 'System Overview';
            case 'ledger': return 'Immutable Ledger';
            case 'settings': return 'User Configuration';
            case 'help': return 'Knowledge Base';
            default: return 'Command Center';
        }
    };

    const renderView = () => {
        const dashboardProps = { simMode, userRole };
        let content;
        
        if (activeKey === 'dashboard') {
            if (userRole === 'admin') content = <AdminDashboard {...dashboardProps} />;
            else if (userRole === 'prosumer') content = <ProsumerDashboard {...dashboardProps} />;
            else content = <ConsumerDashboard {...dashboardProps} />;
        } else {
            switch (activeKey) {
                case 'live-grid': content = <LiveGrid simMode={simMode} userRole={userRole} />; break;
                case 'ledger': content = <LedgerView simMode={simMode} userRole={userRole} />; break;
                case 'settings': content = <SettingsView />; break;
                case 'help': content = <HelpView />; break;
                default: content = <ConsumerDashboard {...dashboardProps} />;
            }
        }

        return (
            <AnimatePresence mode="wait">
                <motion.div
                    key={`${activeKey}-${simMode}`}
                    initial={{ opacity: 0.5, filter: 'blur(10px) brightness(2)' }}
                    animate={{ opacity: 1, filter: 'blur(0px) brightness(1)' }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                >
                    {content}
                </motion.div>
            </AnimatePresence>
        );
    };

    if (!landingDismissed && LandingPageComponent) {
        return (
            <ConfigProvider theme={darkThemeConfig}>
                <LandingPageComponent onStart={handleStart} />
            </ConfigProvider>
        );
    }

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
            <MainLayout
                activeKey={activeKey}
                setActiveKey={setActiveKey}
                user={user}
                userRole={userRole}
                credits={credits}
                simMode={simMode}
                handleSimModeChange={handleSimModeChange}
                handleLogout={handleLogout}
                getPageTitle={getPageTitle}
                getBreadcrumb={getBreadcrumb}
            >
                {renderView()}
            </MainLayout>
        </ConfigProvider>
    );
};

export default App;
