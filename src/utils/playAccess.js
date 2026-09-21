// Soft-launch access code for /play/apply, kept in sessionStorage for this browser tab.
const KEY = 'play-access-code';

export const getPlayCode = () => { try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; } };
export const setPlayCode = (code) => { try { sessionStorage.setItem(KEY, code); } catch { /* ignore */ } };
export const playHeaders = () => (getPlayCode() ? { 'x-play-code': getPlayCode() } : {});

/** Asks the server whether the gate is on; null when the request fails. */
export const fetchGateState = async () => {
    try {
        const r = await fetch('/api/play-access');
        const j = await r.json();
        return !!j.gated;
    } catch { return null; }
};

export const checkPlayCode = async (code) => {
    const r = await fetch('/api/play-access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
    return r.status === 204;
};
