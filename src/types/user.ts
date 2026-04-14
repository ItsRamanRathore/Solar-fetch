export interface User {
    _id: string;
    username: string;
    email: string;
    role: 'prosumer' | 'consumer' | 'admin';
    credits: number;
    status: 'pending' | 'approved' | 'suspended';
    isCertified: boolean;
    storedEnergy?: number;
    batteryCapacity?: number;
    isBrokerActive?: boolean;
    autoAcceptHighestEnabled?: boolean;
    createdAt?: string;
    updatedAt?: string;
}
