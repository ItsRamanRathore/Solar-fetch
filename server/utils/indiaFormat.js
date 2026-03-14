const INDIA_LOCALE = 'en-IN';
const INDIA_TIMEZONE = 'Asia/Kolkata';

const toDate = (input) => {
    if (!input) return new Date();
    return input instanceof Date ? input : new Date(input);
};

export const formatTimeIST = (input) => {
    return toDate(input).toLocaleTimeString(INDIA_LOCALE, {
        timeZone: INDIA_TIMEZONE,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const formatDateTimeIST = (input) => {
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
