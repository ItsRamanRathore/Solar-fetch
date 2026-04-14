import React from 'react';
//import { motion } from 'framer-motion';
import HeroSection from './HeroSection';
import FeatureGrid from './FeatureGrid';
import StatsOverview from './StatsOverview';
import Footer from './Footer';

interface LandingPageProps {
    onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
    return (
        <div className="min-h-screen bg-[#04070a] text-white selection:bg-cyan-500/30">
            {/* Header / Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#04070a]/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                            <span className="font-bold text-xl">S</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight">SolarFetch</span>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
                        <a href="#features" className="hover:text-white transition-colors">Infrastructure</a>
                        <a href="#about" className="hover:text-white transition-colors">Governance</a>
                        <a href="#stats" className="hover:text-white transition-colors">Global Grid</a>
                    </div>

                    <button 
                        onClick={onStart}
                        className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-bold hover:bg-cyan-400 transition-all active:scale-95"
                    >
                        Access Portal
                    </button>
                </div>
            </nav>

            <main>
                <HeroSection onStart={onStart} />
                <FeatureGrid id="features" />
                <StatsOverview id="stats" />
            </main>

            <Footer />
        </div>
    );
};

export default LandingPage;
