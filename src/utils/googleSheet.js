// Events come from a Google Sheet with one tab per year (tab name = year, e.g. "2026").
// Fixed columns: A = date ("Thursday 19 March"), B = start time, C = band / event name,
//                D = contact (never shown), E = booked by, F = genre, G = private flag, H = whisky school
// Optional columns, found by header name anywhere in the header row:
//                "Poster" (image URL), "Tickets" (ticket URL), "Entry" (e.g. "Free" or "2.500 kr.")
const SHEET_ID = '1LzwjwuFwCaNowXFavQuGjPYPqQV7iweFftqABDu9DNs';
export const sheetUrl = (year) =>
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${year}`;

const COL = { date: 0, time: 1, title: 2, genre: 5, isPrivate: 6 };
const OPTIONAL_HEADERS = {
    poster: /^(poster|plakat|mynd|image)/i,
    tickets: /^(tickets?|miðar|miðasala|ticket url)/i,
    entry: /^(entry|aðgang|verð|price|cover)/i,
};

const MONTH_MAP = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * @typedef {Object} DEvent
 * @property {string} id
 * @property {string} slug - e.g. "2026-03-19-blues-beggi-smari", used in /events/:slug
 * @property {string} title
 * @property {Date} dateObj
 * @property {string} dateDisplay - e.g. "19. March"
 * @property {number} dayNum
 * @property {string} time - "21:00"
 * @property {string} dayOfWeek
 * @property {string} genre
 * @property {string} poster - image URL or ''
 * @property {string} tickets - ticket URL or ''
 * @property {string} entry - entry text or ''
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

const cell = (row, idx) => (idx === undefined ? '' : (row[idx] || '').trim());
const pad = (n) => String(n).padStart(2, '0');

const ICELANDIC = { á: 'a', ð: 'd', é: 'e', í: 'i', ó: 'o', ú: 'u', ý: 'y', þ: 'th', æ: 'ae', ö: 'o' };
export const slugify = (text) =>
    text
        .toLowerCase()
        .replace(/[áðéíóúýþæö]/g, (ch) => ICELANDIC[ch])
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);

// Google Drive share links are not direct image URLs; convert them so they render in <img> and og:image.
export const directImageUrl = (url) => {
    const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/);
    return m ? `https://drive.google.com/uc?export=view&id=${m[1]}` : url;
};

const isCancelled = (title) => /cancell?ed/i.test(title);
const isPrivate = (row) =>
    !!cell(row, COL.isPrivate) || /\bprivate\b/i.test(cell(row, COL.title));

/**
 * "Thursday 19 March" + year -> "2026-03-19", or null when the text is not a date
 * or its weekday does not match that year (which is how a wrong year tab is detected).
 */
export const parseSheetDate = (text, year) => {
    const parts = String(text || '').trim().split(/\s+/);
    if (parts.length < 3) return null;
    const [dayName, dayStr, monthName] = parts;
    const dayNum = parseInt(dayStr, 10);
    const month = MONTH_MAP[monthName.toLowerCase()];
    if (isNaN(dayNum) || month === undefined) return null;
    const d = new Date(Date.UTC(year, month, dayNum));
    if (d.getUTCMonth() !== month || WEEKDAYS[d.getUTCDay()] !== dayName.toLowerCase()) return null;
    return `${year}-${pad(month + 1)}-${pad(dayNum)}`;
};

/**
 * Availability view of one year tab: which dates already have something on (any band,
 * private events included, cancelled rows excluded) and whether the tab really is that year.
 * Google returns the first tab when the requested one does not exist; then the weekday
 * names do not match `year` and `exists` is false.
 */
export const analyzeSheet = (text, year) => {
    const rows = parseCSV(text);
    const taken = new Set();
    let matched = 0;
    let mismatched = 0;
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const dateText = cell(row, COL.date);
        if (!dateText) continue;
        const iso = parseSheetDate(dateText, year);
        if (!iso) { mismatched++; continue; }
        matched++;
        const title = cell(row, COL.title);
        if (title && !isCancelled(title)) taken.add(iso);
    }
    const exists = matched > 0 && matched >= mismatched;
    return { exists, taken: exists ? [...taken].sort() : [] };
};

const findOptionalColumns = (header) => {
    const found = {};
    Object.entries(OPTIONAL_HEADERS).forEach(([key, re]) => {
        const idx = header.findIndex((h, i) => i > COL.isPrivate && re.test((h || '').trim()));
        if (idx !== -1) found[key] = idx;
    });
    return found;
};

/**
 * Parse the CSV of one year tab. Rows whose weekday name does not match the date in
 * `year` are dropped; if most rows mismatch the whole tab is treated as the wrong year
 * (Google returns the first tab when the requested tab does not exist) and [] is returned.
 */
export const parseEventsCSV = (text, year) => {
    const rows = parseCSV(text);
    if (!rows.length) return [];
    const opt = findOptionalColumns(rows[0]);
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

        const isoDate = `${year}-${pad(month + 1)}-${pad(dayNum)}`;
        const poster = cell(row, opt.poster);
        events.push({
            id: `evt-${year}-${i}`,
            slug: `${isoDate}-${slugify(title)}`,
            isoDate,
            title,
            dateObj,
            dateDisplay: `${dayNum}. ${monthName}`,
            dayNum,
            time: cell(row, COL.time) || '21:00',
            dayOfWeek: dayName,
            genre: cell(row, COL.genre),
            poster: poster ? directImageUrl(poster) : '',
            tickets: cell(row, opt.tickets),
            entry: cell(row, opt.entry),
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

/** Load a single event by slug (the slug starts with its ISO date, so the year tab is known). */
export const fetchEventBySlug = async (slug) => {
    const year = parseInt(slug.slice(0, 4), 10);
    if (isNaN(year)) return null;
    const events = await fetchYear(year);
    return events.find((e) => e.slug === slug) || null;
};
