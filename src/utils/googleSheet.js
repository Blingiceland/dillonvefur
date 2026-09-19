// Events come from a Google Sheet with one tab per year (tab name = year, e.g. "2026").
// Columns: A = date ("Thursday 19 March"), B = start time, C = band / event name,
//          D = contact (never shown), E = booked by, F = genre, G = private flag, H = whisky school
const SHEET_ID = '1LzwjwuFwCaNowXFavQuGjPYPqQV7iweFftqABDu9DNs';
const sheetUrl = (year) =>
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${year}`;

const COL = { date: 0, time: 1, title: 2, genre: 5, isPrivate: 6 };

const MONTH_MAP = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * @typedef {Object} DEvent
 * @property {string} id
 * @property {string} title
 * @property {Date} dateObj
 * @property {string} dateDisplay - e.g. "19. March"
 * @property {string} time - "21:00"
 * @property {string} dayOfWeek
 * @property {string} genre
 */

// RFC 4180-style CSV parser (quoted fields, escaped quotes, newlines inside quotes)
const parseCSV = (text) => {
    const rows = [];
    let row = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuote) {
            if (c === '"') {
                if (text[i + 1] === '"') { cur += '"'; i++; } else { inQuote = false; }
            } else {
                cur += c;
            }
        } else if (c === '"') {
            inQuote = true;
        } else if (c === ',') {
            row.push(cur); cur = '';
        } else if (c === '\n') {
            row.push(cur); rows.push(row); row = []; cur = '';
        } else if (c !== '\r') {
            cur += c;
        }
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
};

const cell = (row, idx) => (row[idx] || '').trim();

const isCancelled = (title) => /cancell?ed/i.test(title);
const isPrivate = (row) =>
    !!cell(row, COL.isPrivate) || /\bprivate\b/i.test(cell(row, COL.title));

/**
 * Parse the CSV of one year tab. Rows whose weekday name does not match the date in
 * `year` are dropped; if most rows mismatch the whole tab is treated as the wrong year
 * (Google returns the first tab when the requested tab does not exist) and [] is returned.
 */
export const parseEventsCSV = (text, year) => {
    const rows = parseCSV(text);
    const events = [];
    let mismatches = 0;

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const title = cell(row, COL.title).replace(/\s+/g, ' ');
        if (!title || isCancelled(title) || isPrivate(row)) continue;

        const parts = cell(row, COL.date).split(/\s+/);
        if (parts.length < 3) continue;
        const [dayName, dayStr, monthName] = parts;
        const dayNum = parseInt(dayStr, 10);
        const month = MONTH_MAP[monthName.toLowerCase()];
        if (isNaN(dayNum) || month === undefined) continue;

        const dateObj = new Date(year, month, dayNum);
        if (WEEKDAYS[dateObj.getDay()] !== dayName.toLowerCase()) { mismatches++; continue; }

        events.push({
            id: `evt-${year}-${i}`,
            title,
            dateObj,
            dateDisplay: `${dayNum}. ${monthName}`,
            time: cell(row, COL.time) || '21:00',
            dayOfWeek: dayName,
            genre: cell(row, COL.genre),
            monthYear: `${monthName} ${year}`,
            month,
        });
    }

    if (mismatches > events.length) return [];
    return events.sort((a, b) => a.dateObj - b.dateObj);
};

const fetchYear = async (year) => {
    try {
        const response = await fetch(sheetUrl(year));
        const text = await response.text();
        return parseEventsCSV(text, year);
    } catch (error) {
        console.error(`Failed to fetch events for ${year}:`, error);
        return [];
    }
};

// Fetches the current year tab, plus next year from November on so January shows up in time.
export const fetchEvents = async (now = new Date()) => {
    const year = now.getFullYear();
    const years = now.getMonth() >= 10 ? [year, year + 1] : [year];
    const perYear = await Promise.all(years.map(fetchYear));
    return perYear.flat().sort((a, b) => a.dateObj - b.dateObj);
};
