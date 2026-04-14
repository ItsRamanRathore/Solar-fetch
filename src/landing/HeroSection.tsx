import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Zap, Globe } from 'lucide-react';

interface HeroSectionProps {
    onStart: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onStart }) => {
    return (
        <section className="relative pt-40 pb-20 px-6 overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-600/10 blur-[120px] rounded-full -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/10 blur-[100px] rounded-full" />

            <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-6">
                        <Zap size={14} /> 
                        SolarFetch v4.0 is Live
                    </div>
                    
                    <h1 className="text-6xl md:text-7xl font-bold leading-[1.1] mb-8 bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">
                        Decentralized Energy <br />
                        <span className="text-cyan-400">Unified Grid.</span>
                    </h1>
                    
                    <p className="text-xl text-white/50 leading-relaxed mb-10 max-w-xl">
                        A state-of-the-art P2P energy orchestration platform. High-frequency IoT telemetry meets autonomous AI governance for a sustainable, resilient future.
                    </p>

                    <div className="flex flex-wrap gap-4">
                        <button 
                            onClick={onStart}
                            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all active:scale-95"
                        >
                            Connect To Grid
                        </button>
                        <button className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-lg hover:bg-white/10 transition-all">
                            Whitepaper
                        </button>
                    </div>

                    <div className="mt-12 flex items-center gap-6 text-white/40">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={20} className="text-cyan-500" />
                            <span className="text-sm">Audit-Proven Ledger</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Globe size={20} className="text-cyan-500" />
                            <span className="text-sm">Global Scale Ready</span>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="relative"
                >
                    <div className="relative z-10 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
                        <img 
                            src="/src/landing/assets/hero.png" 
                            alt="Grid Visual" 
                            className="w-full h-auto object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#04070a] via-transparent to-transparent opacity-60" />
                    </div>
                    
                    {/* Floating Plate */}
                    <motion.div 
                        animate={{ y: [0, -20, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -bottom-10 -left-10 z-20 p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl hidden md:block"
                    >
                        <div className="text-xs text-white/40 mb-1 uppercase tracking-widest font-bold">Grid Efficiency</div>
                        <div className="text-3xl font-mono text-cyan-400 font-bold">99.98%</div>
                        <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full w-[99%] bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
};

export default HeroSection;
