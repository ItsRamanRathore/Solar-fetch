import type { User } from './user';

export interface AdminStats {
    prosumers: number;
    consumers: number;
}

export interface MarketOrder {
    _id: string;
    key?: string;
    type: 'buy' | 'sell';
    status: 'PENDING' | 'PARTIAL' | 'MATCHED' | 'CANCELLED';
    createdAt?: string;
    remainingKwh: number;
    price: number;
    maker: {
        username: string;
        trustScore: number;
        isCertified: boolean;
    };
}

export interface Governance {
    priceCap: number;
    floorPrice: number;
    isTradingPaused: boolean;
    isAiEnabled: boolean;
}

export interface Conflict {
    _id: string;
    username: string;
    reason: string;
    message: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status: 'ACTIVE' | 'RESOLVED';
    createdAt: string;
}

export interface LedgerEntry {
    _id: string;
    key?: string;
    provenance: string;
    txid: string;
    hash: string;
    from: string;
    to: string;
    amount: number;
    greenHash?: string;
    status: 'SETTLED' | 'PENDING';
    timestamp: string;
}

export interface Asset {
    _id: string;
    key?: string;
    name: string;
    type: 'Solar' | 'Storage' | 'Wind' | 'Appliance';
    status: string;
    output: number;
    efficiency: number;
    hardwareId: string;
}

export interface VettingListProps {
    users: User[];
    loading: boolean;
    isGridFail: boolean;
    approveUser: (id: string) => void;
    suspendUser: (id: string) => void;
}
