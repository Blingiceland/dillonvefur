const MENU_SHEET_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vSmWgPgr7WQ-f5RGrZwraNzW_COxCXLSQKPjkF6SSf8st4b-UNX323K394ZjRA12oBiVWY5vthddgj9/pub?output=csv';

// Parse a single CSV line, respecting quoted fields
const parseLine = (text) => {
    const result = [];
    let cur = '';
    let inQuote = false;
    for (let char of text) {
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            result.push(cur.trim());
            cur = '';
        } else {
            cur += char;
        }
    }
    result.push(cur.trim());
    return result;
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

const parseMenuCSV = (text) => {
    const lines = text.trim().split('\n');
    const whiskies = [];
    const drinks = [];
    let inDrinksSection = false;

    // Skip header row (index 0)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = parseLine(line);
        const name = cols[0] || '';
        const country = cols[1] || '';
        const category = cols[2] || '';
        const price = parseInt(cols[3], 10) || 0;

        // Detect the "Non Whisky Products" separator
        if (name.toLowerCase().includes('non whisky') || name.toLowerCase().includes('flokkur')) {
            inDrinksSection = true;
            continue;
        }

        // Skip empty names or header-like rows
        if (!name || name.toLowerCase() === 'name') continue;

        if (!inDrinksSection) {
            // Whisky section — country is populated
            if (country && category && price) {
                whiskies.push({
                    name: name.trim(),
                    country: country.trim(),
                    category: category.trim(),
                    price,
                });
            }
        } else {
            // Drinks section — country column is empty
            if (category && price) {
                drinks.push({
                    name: name.trim(),
                    category: category.trim(),
                    price,
                });
            }
        }
    }

    return { whiskies, drinks };
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
