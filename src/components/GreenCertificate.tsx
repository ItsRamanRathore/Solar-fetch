import React from 'react';
import { Card, Tag } from 'antd';
import { Award, ShieldCheck, Cpu, Hash } from 'lucide-react';

interface GreenCertificateProps {
    tx: any;
}

const GreenCertificate: React.FC<GreenCertificateProps> = ({ tx }) => {
    if (!tx.greenHash) return null;

    return (
        <Card className="glass-card overflow-hidden border-cyan-400/30 relative" bodyStyle={{ padding: '0' }}>
            <div className="absolute top-0 right-0 p-2">
                <ShieldCheck className="text-[#00ff88]" size={16} />
            </div>
            
            <div className="bg-gradient-to-r from-cyan-900/40 to-transparent p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-cyan-400/20">
                        <Award className="text-cyan-400" size={24} />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-widest leading-none mb-1">Green Certification</h4>
                        <p className="text-[10px] text-cyan-400/70 uppercase font-bold m-0">Verified Renewable Settlement</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="text-[9px] text-muted uppercase font-black mb-1 flex items-center gap-1">
                            <Hash size={10} /> Immutable Green Hash
                        </div>
                        <div className="text-xs font-mono text-white/80 break-all bg-black/30 p-2 rounded">
                            {tx.greenHash}
                        </div>
                    </div>

                    <div className="flex justify-between items-end">
                        <div>
                            <div className="text-[9px] text-muted uppercase font-black mb-1">Carbon Offset</div>
                            <div className="text-lg font-black text-white font-['Outfit']">{(tx.amount * 0.42).toFixed(2)} kg CO₂</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[9px] text-muted uppercase font-black mb-1 flex items-center justify-end gap-1">
                                <Cpu size={10} /> Hardware Identity
                            </div>
                            <Tag color="cyan" className="m-0 border-none bg-cyan-400/10 text-cyan-400 text-[10px] font-black uppercase">
                                mTLS:Verified
                            </Tag>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="px-6 py-3 bg-white/5 border-t border-white/5 flex justify-between items-center">
                <span className="text-[9px] text-muted uppercase font-bold">Provenance: {tx.provenance}</span>
                <button 
                    onClick={() => {
                        const content = `SOLARFETCH GREEN CERTIFICATE\n\nTXID: ${tx.txid}\nHASH: ${tx.greenHash}\nVOLUME: ${tx.amount} kWh\nOFFSET: ${(tx.amount * 0.42).toFixed(2)} kg CO2\nSTATUS: VERIFIED BY NEIGHBORHOOD LEDGER`;
                        const blob = new Blob([content], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Certificate_${tx.txid}.txt`;
                        a.click();
                    }}
                    className="text-[9px] text-cyan-400 uppercase font-black tracking-widest hover:text-[#00ff88] transition-colors flex items-center gap-1"
                >
                    Download Verification
                </button>
            </div>
        </Card>
    );
};

export default GreenCertificate;
