import React from 'react';
import { Network, Search, Lock, TrendingUp, Cpu, Activity } from 'lucide-react';

const features = [
    {
        title: 'Decentralized Architecture',
        desc: 'Built on high-performance P2P protocols, ensuring 100% grid uptime with no single point of failure.',
        icon: <Network className="w-6 h-6 text-cyan-500" />
    },
    {
        title: 'Real-time Telemetry',
        desc: 'Ingest and process millions of IoT data points per second with our custom-built orchestration engine.',
        icon: <Activity className="w-6 h-6 text-cyan-500" />
    },
    {
        title: 'Verifiable Ledger',
        desc: 'Every kilowatt-hour traded is recorded on an immutable, auditable ledger for complete transparency.',
        icon: <Lock className="w-6 h-6 text-cyan-500" />
    },
    {
        title: 'Autonomous Arbitrage',
        desc: 'AI-driven bots optimize energy across the grid, maximizing revenue for prosumers.',
        icon: <TrendingUp className="w-6 h-6 text-cyan-500" />
    },
    {
        title: 'Smart Metering',
        desc: 'Integration with next-gen hardware using encrypted PUF identities for secure device authentication.',
        icon: <Cpu className="w-6 h-6 text-cyan-500" />
    },
    {
        title: 'Grid Governance',
        desc: 'Democratic governance protocols allowing stakeholders to voting on system updates and fee structures.',
        icon: <Search className="w-6 h-6 text-cyan-500" />
    }
];

const FeatureGrid: React.FC<{ id: string }> = ({ id }) => {
    return (
        <section id={id} className="py-32 px-6 border-t border-white/5">
            <div className="max-w-7xl mx-auto">
                <div className="text-center max-w-2xl mx-auto mb-20">
                    <h2 className="text-4xl font-bold mb-6">Advanced Grid Infrastructure</h2>
                    <p className="text-white/50 text-lg">SolarFetch provides the technological backbone for the world\'s most advanced energy communities.</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((f, i) => (
                        <div key={i} className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all group">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                {f.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                            <p className="text-white/40 leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeatureGrid;
