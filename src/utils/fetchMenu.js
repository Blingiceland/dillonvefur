// Published Google Sheet (CSV) with the full product list.
// Columns: Vörunúmer, Vöruheiti, Vöruflokkur, Söluverð m/VSK (kr.), VSK %,
//          Sölueining / skammtur, Birgir, Innkaupsverð án VSK (kr.), Land, Undirflokkur, Athugasemdir
const MENU_SHEET_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ3_X-lBFXBn3-JtVP5YbhLnblvFhvKdmsqOuVfMsOC4UPV3qEEPNTujNsplMTThW1FiO_9RX0XRQMw/pub?gid=242436274&single=true&output=csv';

const COL = {
    name: 1,
    category: 2,
    price: 3,
    country: 8,
    subcategory: 9,
};

const WHISKY_CATEGORY = 'Whiský';
// Product categories that are not drinks and should not appear on the drinks menu.
const EXCLUDED_DRINK_CATEGORIES = ['Söluvarningur'];

// Fallback country for whisky rows where Land is empty in the sheet, keyed by Undirflokkur.
const SUBCATEGORY_COUNTRY = {
    Speyside: 'Scotland', Highland: 'Scotland', Islay: 'Scotland', Islands: 'Scotland',
    Lowland: 'Scotland', 'Blended Scotch': 'Scotland', Scotch: 'Scotland',
    Bourbon: 'USA', Rye: 'USA', 'Tenessee Whiskey': 'USA', 'American whiskey': 'USA',
    'Single Malt': 'Ireland', Blended: 'Ireland', 'Green Spot': 'Ireland',
    Japanese: 'International', Mexican: 'International', Canadian: 'International',
    French: 'International', Taiwan: 'International', Finland: 'International',
    Finnish: 'International', Welsh: 'International', 'Faroe Island': 'International',
    Spain: 'International',
};

// RFC 4180-style CSV parser: handles quoted fields with commas, escaped quotes ("") and newlines.
export const parseCSV = (text) => {
    const rows = [];
    let row = [];
    let cur = '';
    let inQuote = false;

    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuote) {
            if (c === '"') {
                if (text[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else {
                    inQuote = false;
                }
            } else {
                cur += c;
            }
        } else if (c === '"') {
            inQuote = true;
        } else if (c === ',') {
            row.push(cur);
            cur = '';
        } else if (c === '\n') {
            row.push(cur);
            rows.push(row);
            row = [];
            cur = '';
        } else if (c !== '\r') {
            cur += c;
        }
    }
    if (cur !== '' || row.length) {
        row.push(cur);
        rows.push(row);
    }
    return rows;
};

// "2,100.00" -> 2100
const parsePrice = (raw) => {
    const n = parseFloat(String(raw || '').replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? Math.round(n) : 0;
};

const cell = (row, idx) => (row[idx] || '').trim();

export const parseMenuCSV = (text) => {
    const rows = parseCSV(text);
    const whiskies = [];
    const drinks = [];
    const seenDrinks = new Set();

    // Skip header row (index 0)
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const name = cell(row, COL.name);
        const category = cell(row, COL.category);
        const price = parsePrice(cell(row, COL.price));

        if (!name || !price) continue;

        if (category === WHISKY_CATEGORY) {
            const subcategory = cell(row, COL.subcategory);
            whiskies.push({
                name,
                price,
                country: cell(row, COL.country) || SUBCATEGORY_COUNTRY[subcategory] || '',
                category: subcategory,
            });
        } else if (category && !EXCLUDED_DRINK_CATEGORIES.includes(category)) {
            const key = [name, category, price].join('|').toLowerCase();
            if (!seenDrinks.has(key)) {
                seenDrinks.add(key);
                drinks.push({ name, category, price });
            }
        }
    }

    return { whiskies, drinks };
};

export const fetchMenuData = async () => {
    try {
        const response = await fetch(MENU_SHEET_URL);
        const text = await response.text();
        return parseMenuCSV(text);
    } catch (error) {
        console.error('Failed to fetch menu data:', error);
        return { whiskies: [], drinks: [] };
    }
};

// Group an array of items by a key
export const groupBy = (items, key) => {
    return items.reduce((acc, item) => {
        const group = item[key] || 'Other';
        if (!acc[group]) acc[group] = [];
        acc[group].push(item);
        return acc;
    }, {});
};
