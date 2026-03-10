import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

export const darkThemeConfig: ThemeConfig = {
    algorithm: theme.darkAlgorithm,
    token: {
        colorPrimary: '#00ff88',
        colorBgBase: '#04070a',
        colorBgContainer: 'rgba(15, 23, 42, 0.6)',
        colorTextBase: '#f8fafc',
        borderRadius: 12,
        fontFamily: "'Inter', sans-serif",
        colorLink: '#00e5ff',
        colorSuccess: '#00ff88',
        colorWarning: '#fbbf24',
        colorError: '#ef4444',
        colorInfo: '#00e5ff',
    },
    components: {
        Layout: {
            bodyBg: 'transparent',
            headerBg: 'rgba(15, 23, 42, 0.8)',
            siderBg: 'rgba(15, 23, 42, 0.8)',
        },
        Menu: {
            itemBg: 'transparent',
            itemColor: '#94a3b8',
            itemSelectedColor: '#00ff88',
            itemSelectedBg: 'rgba(0, 255, 136, 0.1)',
            itemHoverColor: '#00ff88',
        },
        Card: {
            colorBgContainer: 'rgba(15, 23, 42, 0.6)',
            colorBorderSecondary: 'rgba(255, 255, 255, 0.1)',
        },
        Table: {
            colorBgContainer: 'transparent',
            headerBg: 'rgba(30, 41, 59, 0.5)',
            headerColor: '#00e5ff',
        },
    },
};
