// Pure logic for writing an approved show into the schedule sheet. Used by server/sheets.mjs.
import { parseSheetDate, COL, OPTIONAL_HEADERS } from './googleSheet.js';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const HEADER_TEXT = { poster: 'Poster', tickets: 'Tickets', entry: 'Entry' };

export const colLetter = (idx) => {
    let s = '';
    let n = idx + 1;
    while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
    return s;
};

/** "2026-03-22" -> "Sunday 22 March" (the sheet's own convention, no leading zero) */
export const sheetDateText = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return `${WEEKDAYS[date.getUTCDay()]} ${d} ${MONTHS[m - 1]}`;
};

// The sheet keeps real date/time values in columns A and B (Google's CSV export drops text
// cells from a date column), so the writer sends serial numbers plus the matching formats.
export const DATE_FORMAT = { type: 'DATE', pattern: 'dddd d mmmm' };
export const TIME_FORMAT = { type: 'TIME', pattern: 'h:mm' };

/** Google Sheets date serial (days since 1899-12-30) for an ISO date. */
export const sheetDateSerial = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
};

/** Fraction of a day for "HH:mm" (Google Sheets time value), or null when not a time. */
export const sheetTimeFraction = (time) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(time || '').trim());
    if (!m) return null;
    return (Number(m[1]) * 60 + Number(m[2])) / 1440;
};

/** updateCells request for A{row}:B{row}: typed date and start time, formatted like the rest of the tab. */
export const dateTimeCellsRequest = ({ sheetId, rowNumber, isoDate, time }) => {
    const t = sheetTimeFraction(time);
    return {
        updateCells: {
            start: { sheetId, rowIndex: rowNumber - 1, columnIndex: 0 },
            rows: [{ values: [
                { userEnteredValue: { numberValue: sheetDateSerial(isoDate) }, userEnteredFormat: { numberFormat: DATE_FORMAT } },
                t === null ? { userEnteredValue: { stringValue: String(time || '') } } : { userEnteredValue: { numberValue: t }, userEnteredFormat: { numberFormat: TIME_FORMAT } },
            ] }],
            fields: 'userEnteredValue,userEnteredFormat.numberFormat',
        },
    };
};

export const entryText = (app) =>
    app.entry_type === 'free' ? 'Free' : `${Number(app.ticket_price_isk).toLocaleString('en-GB').replace(/,/g, '.')} kr.`;

/**
 * Make sure the header row has Poster / Tickets / Entry columns (after column H).
 * @returns {{header: string[], cols: {poster:number, tickets:number, entry:number}, changed: boolean}}
 */
export const ensureOptionalColumns = (headerRow) => {
    const header = [...headerRow];
    const cols = {};
    let changed = false;
    for (const key of Object.keys(OPTIONAL_HEADERS)) {
        const idx = header.findIndex((h, i) => i > COL.whiskySchool && OPTIONAL_HEADERS[key].test(String(h || '').trim()));
        if (idx !== -1) cols[key] = idx;
    }
    for (const key of Object.keys(OPTIONAL_HEADERS)) {
        if (cols[key] !== undefined) continue;
        let idx = header.findIndex((h, i) => i > COL.whiskySchool && !String(h || '').trim() && !Object.values(cols).includes(i));
        if (idx === -1) { idx = Math.max(header.length, COL.whiskySchool + 1); }
        header[idx] = HEADER_TEXT[key];
        cols[key] = idx;
        changed = true;
    }
    return { header, cols, changed };
};

/** Data rows (1-based sheet row numbers) with their date in `year`; undated / wrong-year rows are dropped. */
export const parseRows = (rows, year) => {
    const out = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i] || [];
        const iso = parseSheetDate(row[COL.date], year);
        if (!iso) continue;
        const band = String(row[COL.title] || '').trim();
        out.push({ rowNumber: i + 1, iso, band, bandBlank: band === '' });
    }
    return out;
};

/**
 * Where to write `isoDate`: update an empty row for that date, report it taken,
 * or insert a new row that keeps the sheet in date order.
 */
export const findTarget = (parsed, isoDate, band) => {
    const same = parsed.find((r) => r.iso === isoDate);
    if (same) {
        if (same.bandBlank || same.band.toLowerCase() === String(band).trim().toLowerCase()) return { mode: 'update', rowNumber: same.rowNumber };
        return { mode: 'taken', rowNumber: same.rowNumber, band: same.band };
    }
    const later = parsed.find((r) => r.iso > isoDate);
    if (later) return { mode: 'insert', rowNumber: later.rowNumber };
    const last = parsed[parsed.length - 1];
    return { mode: 'insert', rowNumber: last ? last.rowNumber + 1 : 2 };
};

/** Values for one show: text columns C–F plus [colIndex, value] pairs for the optional columns.
 *  (A and B are written as typed date/time cells, see dateTimeCellsRequest.) */
export const buildRowValues = ({ band, contact, genre, posterUrl, ticketUrl, entry }, cols) => ({
    main: [band, contact, 'web', genre],
    optional: [[cols.poster, posterUrl || ''], [cols.tickets, ticketUrl || ''], [cols.entry, entry || '']],
});
