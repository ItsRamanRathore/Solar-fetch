import React from 'react';
import { motion } from 'framer-motion';

const StatsOverview: React.FC<{ id: string }> = ({ id }) => {
    return (
        <section id={id} className="py-32 px-6">
            <div className="max-w-7xl mx-auto rounded-[3rem] bg-gradient-to-br from-cyan-600 to-blue-700 p-12 relative overflow-hidden">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
                
                <div className="relative z-10 grid md:grid-cols-2 lg:grid-cols-4 gap-12 text-center items-center">
                    <div>
                        <div className="text-5xl font-bold mb-2">124K+</div>
                        <div className="text-white/70 font-medium uppercase tracking-widest text-xs">Total Megawatts Traded</div>
                    </div>
                    <div>
                        <div className="text-5xl font-bold mb-2">18.2K</div>
                        <div className="text-white/70 font-medium uppercase tracking-widest text-xs">Connected Prosumers</div>
                    </div>
                    <div>
                        <div className="text-5xl font-bold mb-2">₹14.2Cr</div>
                        <div className="text-white/70 font-medium uppercase tracking-widest text-xs">Community Savings</div>
                    </div>
                    <div>
                        <div className="text-5xl font-bold mb-2">0.4ms</div>
                        <div className="text-white/70 font-medium uppercase tracking-widest text-xs">Arbitrage Latency</div>
                    </div>
                </div>

                <div className="mt-20 text-center relative z-10 border-t border-white/10 pt-12">
                    <h3 className="text-2xl font-bold mb-4">Certified for Global Standards</h3>
                    <div className="flex flex-wrap justify-center gap-8 opacity-60 grayscale brightness-200">
                        <span className="font-bold text-lg tracking-tighter">ISO-9001</span>
                        <span className="font-bold text-lg tracking-tighter">TERI-GRID</span>
                        <span className="font-bold text-lg tracking-tighter">IEEE-SMART</span>
                        <span className="font-bold text-lg tracking-tighter">NISE-SOLAR</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default StatsOverview;
