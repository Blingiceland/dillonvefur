// GET /api/availability
// Which dates a band can apply for: the booking window, dates already taken in the
// schedule sheet (any event, private included, cancelled excluded) and which year tabs exist.
import { analyzeSheet, sheetUrl } from '../src/utils/googleSheet.js';
import { bookingWindow, yearsInWindow, isInWindow } from '../src/utils/bookingRules.js';

const fetchYear = async (year) => {
    try {
        const res = await fetch(sheetUrl(year), { cache: 'no-store' });
        if (!res.ok) return { exists: false, taken: [] };
        return analyzeSheet(await res.text(), year);
    } catch (error) {
        console.error(`availability: failed to read sheet ${year}`, error);
        return { exists: false, taken: [] };
    }
};

export const getAvailability = async (now = new Date()) => {
    const window = bookingWindow(now);
    const years = yearsInWindow(window);
    const perYear = await Promise.all(years.map(fetchYear));
    const yearsOpen = years.filter((_, i) => perYear[i].exists);
    const taken = perYear
        .flatMap((r) => r.taken)
        .filter((iso) => isInWindow(iso, window))
        .sort();
    return {
        from: window.from,
        to: window.to,
        taken,
        requested: [], // filled in once applications are stored (phase 2)
        yearsOpen,
        generatedAt: now.toISOString(),
    };
};

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const data = await getAvailability();
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.status(200).json(data);
}
