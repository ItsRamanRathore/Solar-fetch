import { useContext } from 'react';
import { SettingsContext } from './SettingsContextCore';
import type { SettingsContextType } from './SettingsContextCore';

export const useSettings = (): SettingsContextType => {
    const context = useContext(SettingsContext);
    if (!context) throw new Error('useSettings must be used within a SettingsProvider');
    return context;
};
