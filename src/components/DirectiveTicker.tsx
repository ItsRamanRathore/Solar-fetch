import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio } from 'lucide-react';

const DirectiveTicker: React.FC = () => {
    const { data: gov } = useQuery({
        queryKey: ['governance'],
        queryFn: () => fetch('/api/grid/governance-public').then(res => res.json()),
        refetchInterval: 10000
    });

    const activeDirective = gov?.globalDirective?.active ? gov.globalDirective.message : null;

    return (
        <AnimatePresence>
            {activeDirective && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-cyan-500/10 border-b border-cyan-500/20 overflow-hidden"
                >
                    <div className="flex items-center gap-4 px-6 py-2">
                        <div className="flex items-center gap-2 text-cyan-400">
                            <Radio size={14} className="animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Grid Directive</span>
                        </div>
                        <div className="flex-1 relative overflow-hidden h-4">
                            <motion.div
                                animate={{ x: ['100%', '-100%'] }}
                                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                                className="absolute top-0 whitespace-nowrap text-[11px] font-bold text-white uppercase tracking-wider"
                            >
                                {activeDirective} • {activeDirective} • {activeDirective}
                            </motion.div>
                        </div>
                        <div className="text-[9px] text-muted font-bold uppercase tracking-widest whitespace-nowrap">
                            Source: Grid Governor
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DirectiveTicker;
