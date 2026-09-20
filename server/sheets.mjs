// Writes approved shows into the schedule Google Sheet with a service account.
// Auth: RS256 JWT signed with the service-account key, exchanged for an access token
// (no googleapis dependency). Sheet logic lives in src/utils/sheetRows.js (unit tested).
import { createSign } from 'node:crypto';
import { ensureOptionalColumns, parseRows, findTarget, buildRowValues, colLetter } from '../src/utils/sheetRows.js';

const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

const sheetId = () => process.env.SHEET_ID || '1LzwjwuFwCaNowXFavQuGjPYPqQV7iweFftqABDu9DNs';

const credentials = () => {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not configured');
    const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    return JSON.parse(json);
};

let cachedToken = null;
const b64url = (s) => Buffer.from(s).toString('base64url');

export const getAccessToken = async () => {
    if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.token;
    const { client_email, private_key } = credentials();
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: client_email, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))}`;
    const signature = createSign('RSA-SHA256').update(unsigned).sign(private_key, 'base64url');
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
    });
    if (!res.ok) throw new Error(`Google auth failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    cachedToken = { token: data.access_token, exp: Date.now() + data.expires_in * 1000 };
    return cachedToken.token;
};

const api = async (path, init = {}) => {
    const token = await getAccessToken();
    const res = await fetch(`${SHEETS}/${sheetId()}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
    if (!res.ok) throw new Error(`Sheets API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return res.json();
};

const findTab = async (year) => {
    const meta = await api('?fields=sheets.properties(sheetId,title)');
    const tab = (meta.sheets || []).map((s) => s.properties).find((p) => String(p.title).trim() === String(year));
    if (!tab) throw new Error(`SHEET_TAB_MISSING: create a tab named "${year}" in the schedule sheet and approve again`);
    return tab;
};

const readTab = async (title) => {
    const data = await api(`/values/${encodeURIComponent(title)}!A1:Z?valueRenderOption=FORMATTED_VALUE`);
    return data.values || [];
};

/**
 * Write one approved show. Returns { tab, rowNumber }.
 * Throws DATE_TAKEN / SHEET_TAB_MISSING errors with readable messages.
 */
export const writeEventRow = async ({ isoDate, time, band, contact, genre, posterUrl, ticketUrl, entry }) => {
    const year = Number(isoDate.slice(0, 4));
    const tab = await findTab(year);
    const rows = await readTab(tab.title);

    const { header, cols, changed } = ensureOptionalColumns(rows[0] || []);
    if (changed) {
        await api(`/values/${encodeURIComponent(tab.title)}!A1:${colLetter(header.length - 1)}1?valueInputOption=RAW`, {
            method: 'PUT',
            body: JSON.stringify({ values: [header.map((h) => h ?? '')] }),
        });
    }

    const parsed = parseRows(rows, year);
    const target = findTarget(parsed, isoDate, band);
    if (target.mode === 'taken') throw new Error(`DATE_TAKEN: ${isoDate} already has "${target.band}" in the schedule`);

    if (target.mode === 'insert') {
        await api(':batchUpdate', {
            method: 'POST',
            body: JSON.stringify({ requests: [{ insertDimension: { range: { sheetId: tab.sheetId, dimension: 'ROWS', startIndex: target.rowNumber - 1, endIndex: target.rowNumber }, inheritFromBefore: true } }] }),
        });
    }

    const r = target.rowNumber;
    const values = buildRowValues({ isoDate, time, band, contact, genre, posterUrl, ticketUrl, entry }, cols);
    const data = [
        { range: `${tab.title}!A${r}:F${r}`, values: [values.main] },
        ...values.optional.map(([c, v]) => ({ range: `${tab.title}!${colLetter(c)}${r}`, values: [[v]] })),
    ];
    await api('/values:batchUpdate', { method: 'POST', body: JSON.stringify({ valueInputOption: 'RAW', data }) });
    return { tab: tab.title, rowNumber: r };
};

/** Mark the show's row "<band> CANCELLED" (found by date + band, never by stored row number). */
export const cancelEventRow = async ({ isoDate, band }) => {
    const year = Number(isoDate.slice(0, 4));
    const tab = await findTab(year);
    const rows = await readTab(tab.title);
    const row = parseRows(rows, year).find((x) => x.iso === isoDate && x.band.toLowerCase() === String(band).trim().toLowerCase());
    if (!row) return { found: false };
    await api(`/values/${encodeURIComponent(tab.title)}!C${row.rowNumber}?valueInputOption=RAW`, {
        method: 'PUT',
        body: JSON.stringify({ values: [[`${row.band} CANCELLED`]] }),
    });
    return { found: true, tab: tab.title, rowNumber: row.rowNumber };
};
