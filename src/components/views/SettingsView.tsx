import React from 'react';
import { Card, Row, Col, Switch, Select, Button, Slider, Input, message } from 'antd';
import { Bell, Shield, Palette, Globe } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';

const SettingsView: React.FC = () => {
    const { settings, updateSettings } = useSettings();

    const handleSave = () => {
        message.success('System preferences synced to local node');
    };

    return (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div>
                <h2 className="text-3xl font-black font-['Outfit'] uppercase tracking-tighter text-white m-0 text-cyan-400">System Preferences</h2>
                <p className="text-muted tracking-wide text-xs uppercase mt-1">Configure your terminal and grid node behavior</p>
            </div>

            <Row gutter={[24, 24]}>
                <Col xs={24} lg={12}>
                    <Card className="glass-card" bodyStyle={{ padding: '24px' }}>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-6">
                            <Bell size={16} className="text-[#00ff88]" /> Notification Protocol
                        </h3>
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="text-xs font-bold text-white">Market Signals</div>
                                    <div className="text-[10px] text-muted uppercase">Real-time trading alerts</div>
                                </div>
                                <Switch 
                                    checked={settings.marketSignals} 
                                    onChange={(val) => updateSettings({ marketSignals: val })}
                                    className="bg-white/10" 
                                />
                            </div>
                            <div className="flex justify-between items-center border-t border-white/5 pt-4">
                                <div>
                                    <div className="text-xs font-bold text-white">Grid Anomalies</div>
                                    <div className="text-[10px] text-muted uppercase">Blackout and surge warnings</div>
                                </div>
                                <Switch 
                                    checked={settings.gridAnomalies} 
                                    onChange={(val) => updateSettings({ gridAnomalies: val })}
                                    className="bg-white/10" 
                                />
                            </div>
                            <div className="flex justify-between items-center border-t border-white/5 pt-4">
                                <div>
                                    <div className="text-xs font-bold text-white">Newsletter Protocol</div>
                                    <div className="text-[10px] text-muted uppercase">Monthly energy performance reports</div>
                                </div>
                                <Switch 
                                    checked={settings.newsletter} 
                                    onChange={(val) => updateSettings({ newsletter: val })}
                                    className="bg-white/10" 
                                />
                            </div>
                        </div>
                    </Card>

                    <Card className="glass-card mt-8" bodyStyle={{ padding: '24px' }}>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-6">
                            <Shield size={16} className="text-orange-400" /> Security & Privacy
                        </h3>
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="text-xs font-bold text-white">Two-Factor Auth</div>
                                    <div className="text-[10px] text-muted uppercase">Secure your energy wallet</div>
                                </div>
                                <Button 
                                    size="small" 
                                    className={`text-[10px] font-bold uppercase ${settings.twoFactor ? 'bg-[#00ff88] text-black border-none' : 'bg-white/5 border-white/10 text-white'}`}
                                    onClick={() => updateSettings({ twoFactor: !settings.twoFactor })}
                                >
                                    {settings.twoFactor ? 'Enabled' : 'Enable'}
                                </Button>
                            </div>
                            <div className="flex justify-between items-center border-t border-white/5 pt-4">
                                <div>
                                    <div className="text-xs font-bold text-white">Node Masking</div>
                                    <div className="text-[10px] text-muted uppercase">Hide location from secondary market</div>
                                </div>
                                <Switch 
                                    checked={settings.nodeMasking} 
                                    onChange={(val) => updateSettings({ nodeMasking: val })}
                                    className="bg-white/10" 
                                />
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={24} lg={12}>
                    <Card className="glass-card" bodyStyle={{ padding: '24px' }}>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-6">
                            <Palette size={16} className="text-[#00e5ff]" /> Interface Config
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <div className="text-xs font-bold text-white mb-3">Theme Engine</div>
                                <Select 
                                    value={settings.theme}
                                    onChange={(val) => updateSettings({ theme: val })}
                                    className="w-full glass-select"
                                    options={[
                                        { value: 'deep-void', label: 'Deep Void (Default)' },
                                        { value: 'cyber-neon', label: 'Cyber Neon' },
                                        { value: 'solar-gold', label: 'Solar Gold' }
                                    ]}
                                />
                            </div>
                            <div className="border-t border-white/5 pt-4">
                                <div className="text-xs font-bold text-white mb-2">UI Scaling</div>
                                <Slider 
                                    value={settings.uiScaling} 
                                    onChange={(val) => updateSettings({ uiScaling: val })}
                                    min={80} 
                                    max={120} 
                                    step={5} 
                                />
                            </div>
                        </div>
                    </Card>

                    <Card className="glass-card mt-8" bodyStyle={{ padding: '24px' }}>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-6">
                            <Globe size={16} className="text-[#00ff88]" /> Regional Settings
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <div className="text-xs font-bold text-white mb-3">Grid Locale</div>
                                <Select 
                                    value={settings.locale}
                                    onChange={(val) => updateSettings({ locale: val })}
                                    className="w-full glass-select"
                                    options={[
                                        { value: 'in-south-1', label: 'India (South-1)' },
                                        { value: 'in-north-2', label: 'India (North-2)' },
                                        { value: 'eu-west-1', label: 'Europe (West-1)' }
                                    ]}
                                />
                            </div>
                            <div className="border-t border-white/5 pt-4">
                                <div className="text-xs font-bold text-white mb-2">Currency Symbol</div>
                                <Input 
                                    value={settings.currency} 
                                    onChange={(e) => updateSettings({ currency: e.target.value })}
                                    className="glass-input !w-20" 
                                />
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            <div className="flex justify-end gap-4 pb-10">
                <Button className="bg-white/5 border-white/10 text-white font-black uppercase tracking-widest px-8">Reset Defaults</Button>
                <Button 
                    type="primary" 
                    className="bg-[#00e5ff] hover:bg-[#00ff88] text-black font-black uppercase tracking-widest px-8 border-none"
                    onClick={handleSave}
                >
                    Save Changes
                </Button>
            </div>
        </div>
    );
};

export default SettingsView;
