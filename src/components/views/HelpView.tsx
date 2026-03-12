import React from 'react';
import { Card, Row, Col, Collapse, Button, Input } from 'antd';
import { BookOpen, MessageSquare, ExternalLink, Zap, ShieldCheck, Activity } from 'lucide-react';

const { Panel } = Collapse;
const { Search } = Input;

const HelpView: React.FC = () => {
    return (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black font-['Outfit'] uppercase tracking-tighter text-white m-0 text-[#00ff88]">Knowledge Hub</h2>
                    <p className="text-muted tracking-wide text-xs uppercase mt-1">Learn how to master the SolarFetch grid</p>
                </div>
                <Search 
                    placeholder="Search manuals..." 
                    className="max-w-md glass-search" 
                    size="large"
                />
            </div>

            <Row gutter={[24, 24]}>
                <Col xs={24} lg={16}>
                    <Card className="glass-card" bodyStyle={{ padding: '0' }}>
                        <Collapse ghost expandIconPosition="end" className="help-collapse">
                            <Panel header={<div className="flex items-center gap-3 text-white font-bold py-2"><Zap size={16} className="text-cyan-400" /> What is P2P Energy Trading?</div>} key="1">
                                <p className="text-xs text-muted leading-relaxed px-6 pb-4">
                                    Peer-to-Peer (P2P) trading allows you to bypass central utilities and trade energy directly with your neighbors. 
                                    Prosumers (nodes with solar/battery) can sell excess yield, while Consumers can buy cheaper local green energy.
                                </p>
                            </Panel>
                            <Panel header={<div className="flex items-center gap-3 text-white font-bold py-2"><ShieldCheck size={16} className="text-[#00ff88]" /> Is the energy billing secure?</div>} key="2">
                                <p className="text-xs text-muted leading-relaxed px-6 pb-4">
                                    Yes. Every transaction is logged on our immutable ledger. Settlement total is automatically calculated 
                                    based on IoT meter readings and agreed market prices, ensuring no double-spending of kilowatt-hours.
                                </p>
                            </Panel>
                            <Panel header={<div className="flex items-center gap-3 text-white font-bold py-2"><Activity size={16} className="text-orange-400" /> What happens during Grid-Fail?</div>} key="3">
                                <p className="text-xs text-muted leading-relaxed px-6 pb-4">
                                    In "Grid-Fail" mode, the neighborhood enters "Islanding" protocol. Energy is prioritized for essential 
                                    services. Prices may surge due to scarcity, and AI brokers will focus on preserving local battery storage.
                                </p>
                            </Panel>
                        </Collapse>
                    </Card>

                    <div className="mt-8">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Quick Start Guides</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { title: 'Prosumer 101', desc: 'Setup your solar node and start selling.' },
                                { title: 'Market Bidding', desc: 'How to place competitive bids.' },
                                { title: 'ESG Mining', desc: 'Understanding your Green Certificates.' },
                                { title: 'IoT Integration', desc: 'Connecting smart meters to the hub.' }
                            ].map((guide, i) => (
                                <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors group">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-white">{guide.title}</span>
                                        <ExternalLink size={12} className="text-muted group-hover:text-cyan-400" />
                                    </div>
                                    <p className="text-[10px] text-muted m-0">{guide.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </Col>

                <Col xs={24} lg={8}>
                    <div className="space-y-6">
                        <Card className="glass-card" bodyStyle={{ padding: '24px' }}>
                            <BookOpen size={24} className="text-cyan-400 mb-4" />
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">API Documentation</h4>
                            <p className="text-xs text-muted leading-relaxed mb-4">Integrate your own smart devices with our city-scale energy backend.</p>
                            <Button block className="bg-white/5 border-white/10 text-white font-bold uppercase text-[10px]">Open Docs</Button>
                        </Card>

                        <Card className="glass-card" bodyStyle={{ padding: '24px' }}>
                            <MessageSquare size={24} className="text-[#00ff88] mb-4" />
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Live Support</h4>
                            <p className="text-xs text-muted leading-relaxed mb-4">Need help with a trade? Our grid governors are available 24/7.</p>
                            <Button block type="primary" className="bg-[#00ff88] hover:bg-cyan-400 text-black font-bold uppercase text-[10px] border-none">Chat with Admin</Button>
                        </Card>
                    </div>
                </Col>
            </Row>
        </div>
    );
};

export default HelpView;
