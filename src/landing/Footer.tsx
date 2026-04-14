import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="py-20 px-6 border-t border-white/5 bg-black/20">
            <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
                <div className="col-span-2">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                            <span className="font-bold text-sm">S</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight">SolarFetch</span>
                    </div>
                    <p className="text-white/40 max-w-sm leading-relaxed">
                        The world\'s most advanced energy orchestration layer. Open-source, decentralized, and built for the renewable revolution.
                    </p>
                </div>

                <div>
                    <h4 className="font-bold mb-6">Product</h4>
                    <ul className="space-y-4 text-white/40 text-sm">
                        <li><a href="#" className="hover:text-cyan-400 transition-colors">P2P Marketplace</a></li>
                        <li><a href="#" className="hover:text-cyan-400 transition-colors">Governance</a></li>
                        <li><a href="#" className="hover:text-cyan-400 transition-colors">IoT Integration</a></li>
                        <li><a href="#" className="hover:text-cyan-400 transition-colors">Smart Charging</a></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold mb-6">Community</h4>
                    <ul className="space-y-4 text-white/40 text-sm">
                        <li><a href="#" className="hover:text-cyan-400 transition-colors">Documentation</a></li>
                        <li><a href="#" className="hover:text-cyan-400 transition-colors">GitHub</a></li>
                        <li><a href="#" className="hover:text-cyan-400 transition-colors">Discord</a></li>
                        <li><a href="#" className="hover:text-cyan-400 transition-colors">Governance Proposals</a></li>
                    </ul>
                </div>
            </div>

            <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:row items-center justify-between gap-6 text-xs text-white/30 uppercase tracking-[0.2em]">
                <div>© 2026 SolarFetch Foundation. All rights reserved.</div>
                <div className="flex gap-8">
                    <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                    <a href="#" className="hover:text-white transition-colors">Terms of Grid Usage</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
