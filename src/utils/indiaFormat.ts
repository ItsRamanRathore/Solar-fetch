const INDIA_LOCALE = 'en-IN';
const INDIA_TIMEZONE = 'Asia/Kolkata';

const toDate = (input?: string | number | Date): Date => {
    if (!input) return new Date();
    return input instanceof Date ? input : new Date(input);
};

export const formatCurrencyINR = (value: number, minimumFractionDigits = 2, maximumFractionDigits = 2): string => {
    return new Intl.NumberFormat(INDIA_LOCALE, {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits,
        maximumFractionDigits,
    }).format(Number.isFinite(value) ? value : 0);
};

export const formatNumberIN = (value: number, minimumFractionDigits = 0, maximumFractionDigits = 2): string => {
    return new Intl.NumberFormat(INDIA_LOCALE, {
        minimumFractionDigits,
        maximumFractionDigits,
    }).format(Number.isFinite(value) ? value : 0);
};

export const formatTimeIST = (input?: string | number | Date): string => {
    return toDate(input).toLocaleTimeString(INDIA_LOCALE, {
        timeZone: INDIA_TIMEZONE,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const formatDateIST = (input?: string | number | Date): string => {
    return toDate(input).toLocaleDateString(INDIA_LOCALE, {
        timeZone: INDIA_TIMEZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

export const formatDateTimeIST = (input?: string | number | Date): string => {
    return toDate(input).toLocaleString(INDIA_LOCALE, {
        timeZone: INDIA_TIMEZONE,
        hour12: false,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
};

export const INDIA_STANDARD_LABEL = 'IST (UTC+05:30)';
