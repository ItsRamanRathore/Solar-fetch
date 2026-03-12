import React, { createContext, useContext, useState, useEffect } from 'react';

interface Settings {
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

interface SettingsContextType {
    settings: Settings;
    updateSettings: (updates: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
    marketSignals: true,
    gridAnomalies: true,
    newsletter: false,
    twoFactor: false,
    nodeMasking: true,
    theme: 'deep-void',
    uiScaling: 100,
    locale: 'in-south-1',
    currency: '₹',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) throw new Error('useSettings must be used within a SettingsProvider');
    return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<Settings>(() => {
        const saved = localStorage.getItem('solar_fetch_settings');
        return saved ? JSON.parse(saved) : defaultSettings;
    });

    useEffect(() => {
        localStorage.setItem('solar_fetch_settings', JSON.stringify(settings));
        
        // Apply UI Scaling
        document.documentElement.style.fontSize = `${(settings.uiScaling / 100) * 16}px`;
    }, [settings]);

    const updateSettings = (updates: Partial<Settings>) => {
        setSettings(prev => ({ ...prev, ...updates }));
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};
