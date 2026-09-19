// Rules shared by the public application form (browser) and the API (serverless).
// All dates are ISO "YYYY-MM-DD" strings. Iceland is UTC all year, so UTC date math is local date math.

export const OPEN_AFTER_DAYS = 14;   // earliest bookable date is two weeks ahead
export const WINDOW_DAYS = 180;      // latest bookable date is about six months ahead

const pad = (n) => String(n).padStart(2, '0');

export const isoDate = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

const fromIso = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
};

export const addDays = (iso, days) => {
    const d = fromIso(iso);
    d.setUTCDate(d.getUTCDate() + days);
    return isoDate(d);
};

export const isValidIso = (iso) =>
    typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso) && isoDate(fromIso(iso)) === iso;

/** @returns {{from: string, to: string}} inclusive ISO date range bands may apply for */
export const bookingWindow = (now = new Date()) => {
    const today = isoDate(now);
    return { from: addDays(today, OPEN_AFTER_DAYS), to: addDays(today, WINDOW_DAYS) };
};

export const isInWindow = (iso, window) => isValidIso(iso) && iso >= window.from && iso <= window.to;

/** "YYYY-MM" for every month from window.from to window.to */
export const monthsInWindow = (window) => {
    const months = [];
    let cur = window.from.slice(0, 7);
    const last = window.to.slice(0, 7);
    while (cur <= last) {
        months.push(cur);
        const [y, m] = cur.split('-').map(Number);
        cur = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
    }
    return months;
};

/** Years touched by the window, ascending */
export const yearsInWindow = (window) => {
    const a = Number(window.from.slice(0, 4));
    const b = Number(window.to.slice(0, 4));
    const years = [];
    for (let y = a; y <= b; y++) years.push(y);
    return years;
};
