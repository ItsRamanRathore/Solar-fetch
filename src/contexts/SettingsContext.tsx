import React, { useState, useEffect } from 'react';
import type { Settings } from './SettingsContextCore';
import { SettingsContext } from './SettingsContextCore';

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

const normalizeIndianSettings = (candidate: Partial<Settings> | null | undefined): Settings => {
    const merged: Settings = {
        ...defaultSettings,
        ...(candidate || {}),
    };

    merged.currency = '₹';
    merged.locale = merged.locale?.startsWith('in-') ? merged.locale : 'in-south-1';

    return merged;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<Settings>(() => {
        const saved = localStorage.getItem('solar_fetch_settings');
        return saved ? normalizeIndianSettings(JSON.parse(saved)) : defaultSettings;
    });

    useEffect(() => {
        localStorage.setItem('solar_fetch_settings', JSON.stringify(settings));
        
        // Apply UI Scaling
        const htmlElement = document.documentElement;
        if (htmlElement) {
            htmlElement.style.fontSize = `${(settings.uiScaling / 100) * 16}px`;
        }
    }, [settings]);

    const updateSettings = (updates: Partial<Settings>) => {
        setSettings(prev => normalizeIndianSettings({ ...prev, ...updates }));
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};
