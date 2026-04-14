import { createContext } from 'react';

export interface Settings {
    marketSignals: boolean;
    gridAnomalies: boolean;
    newsletter: boolean;
    twoFactor: boolean;
    nodeMasking: boolean;
    theme: string;
    uiScaling: number;
    locale: string;
    currency: string;
}

export interface SettingsContextType {
    settings: Settings;
    updateSettings: (updates: Partial<Settings>) => void;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);
