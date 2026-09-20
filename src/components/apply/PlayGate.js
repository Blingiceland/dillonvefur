import React, { useEffect, useState } from 'react';
import { field, labelStyle, errorStyle, hintStyle } from '../formStyles';
import { fetchGateState, getPlayCode, setPlayCode, checkPlayCode } from '../../utils/playAccess';

/**
 * Soft-launch gate: while the server has PLAY_ACCESS_CODE set, ask for the code before showing
 * the application page. Renders children once the code is accepted (or the gate is off).
 */
const PlayGate = ({ children }) => {
    const [state, setState] = useState('checking'); // checking | open | locked
    const [code, setCode] = useState('');
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    // Keep search engines away from the locked page
    useEffect(() => {
        if (state !== 'locked') return undefined;
        const meta = document.createElement('meta');
        meta.name = 'robots';
        meta.content = 'noindex';
        document.head.appendChild(meta);
        return () => meta.remove();
    }, [state]);

    useEffect(() => {
        (async () => {
            const gated = await fetchGateState();
            if (gated === false || gated === null) { setState('open'); return; }
            const saved = getPlayCode();
            if (saved && (await checkPlayCode(saved))) { setState('open'); return; }
            setState('locked');
        })();
    }, []);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true); setError(null);
        const ok = await checkPlayCode(code.trim());
        setBusy(false);
        if (ok) { setPlayCode(code.trim()); setState('open'); } else setError('That code is not right.');
    };

    if (state === 'open') return children;
    if (state === 'checking') return <div style={{ minHeight: '50vh', padding: '80px 20px', textAlign: 'center' }}><p className="text-gold" style={{ letterSpacing: '3px' }}>LOADING…</p></div>;

    return (
        <div style={{ minHeight: '60vh', padding: '60px 20px' }}>
            <div style={{ maxWidth: '440px', margin: '0 auto', border: '1px solid var(--color-gold)', background: 'rgba(20,20,20,0.8)', padding: '36px' }}>
                <p style={{ color: '#c89b3c', letterSpacing: '4px', fontSize: '12px', textTransform: 'uppercase', margin: '0 0 8px' }}>Bands &amp; Artists</p>
                <h1 style={{ fontFamily: 'var(--font-heading)', color: '#f0e6cc', fontSize: '32px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 12px' }}>Not open yet</h1>
                <p style={{ color: '#ccc', lineHeight: 1.6, margin: '0 0 20px' }}>Gig applications are opening soon. If Dillon gave you an access code, enter it here.</p>
                <form onSubmit={submit} style={{ display: 'grid', gap: '14px' }}>
                    <div>
                        <label htmlFor="play-code" style={labelStyle}>Access code</label>
                        <input id="play-code" type="password" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} style={field} />
                    </div>
                    {error && <p style={errorStyle}>{error}</p>}
                    <button type="submit" className="btn btn-primary" disabled={busy || !code.trim()}>{busy ? 'Checking…' : 'Continue'}</button>
                    <p style={hintStyle}>Private parties and company events: see Book Dillon.</p>
                </form>
            </div>
        </div>
    );
};

export default PlayGate;
