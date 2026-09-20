import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { usePageMeta, EMAIL } from '../utils/seo';
import { errorStyle } from '../components/formStyles';

const label = { color: '#c89b3c', letterSpacing: '4px', fontSize: '12px', textTransform: 'uppercase', margin: '0 0 10px' };
const h1 = { fontFamily: 'var(--font-heading)', color: '#f0e6cc', fontSize: 'clamp(32px, 6vw, 48px)', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 16px' };
const kr = (n) => `${Number(n).toLocaleString('en-GB').replace(/,/g, '.')} kr.`;

/**
 * /play/thanks/:token  — after Teya redirects back on success (waits for the webhook, polls as fallback)
 * /play/pay/:token     — payment cancelled/failed, or start the payment again
 */
const PayStatus = () => {
    const { token } = useParams();
    const { pathname, search } = useLocation();
    const isThanks = pathname.includes('/thanks/');
    const cancelled = /cancelled=1|failed=1/.test(search);
    usePageMeta({ title: isThanks ? 'Thank you' : 'Booking fee', path: '/play' });

    const [state, setState] = useState(null);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const polls = useRef(0);

    useEffect(() => {
        const meta = document.createElement('meta');
        meta.name = 'robots';
        meta.content = 'noindex, nofollow';
        document.head.appendChild(meta);
        return () => meta.remove();
    }, []);

    useEffect(() => {
        let timer;
        let alive = true;
        const load = async () => {
            try {
                const r = await fetch(`/api/apply/pay?token=${encodeURIComponent(token)}`);
                const j = await r.json();
                if (!r.ok) throw new Error(j.error || 'Link not valid');
                if (!alive) return;
                setState(j);
                // On the thank-you page keep asking for up to ~2 minutes until the payment is confirmed
                if (isThanks && j.fee_status === 'pending' && polls.current++ < 40) timer = setTimeout(load, 3000);
            } catch (e) { if (alive) setError(e.message); }
        };
        load();
        return () => { alive = false; clearTimeout(timer); };
    }, [token, isThanks]);

    const pay = async () => {
        setBusy(true); setError(null);
        try {
            const r = await fetch('/api/apply/pay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error || 'Could not start the payment');
            if (j.alreadyPaid) { setState((s) => ({ ...s, fee_status: 'paid', status: 'submitted' })); return; }
            window.location.href = j.checkoutUrl;
        } catch (e) { setError(e.message); setBusy(false); }
    };

    const Box = ({ children }) => (
        <div style={{ background: '#0a0a0a', padding: '60px 20px 120px' }}>
            <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center', border: '1px solid var(--color-gold)', padding: 'clamp(28px, 6vw, 56px)', background: 'rgba(20,20,20,0.8)' }}>{children}</div>
        </div>
    );

    if (error && !state) return <Box><h1 style={h1}>Link not valid</h1><p style={{ color: '#ccc' }}>{error} Email <a href={`mailto:${EMAIL}`} className="text-gold">{EMAIL}</a> with your reference number if you need help.</p></Box>;
    if (!state) return <Box><p className="text-gold" style={{ letterSpacing: '3px' }}>CHECKING…</p></Box>;

    const paid = state.fee_status === 'paid' || (state.status !== 'pending_payment' && state.fee_status !== 'pending');

    if (paid) {
        return (
            <Box>
                <p style={label}>Application received</p>
                <h1 style={h1}>Thanks, we’ll be in touch</h1>
                <p style={{ color: '#ccc', fontSize: '17px', lineHeight: 1.7 }}>
                    Your reference is <strong style={{ color: '#c89b3c', letterSpacing: '2px' }}>{state.ref}</strong>.
                    {state.fee_status === 'paid' ? ` The booking fee of ${kr(state.fee_amount_isk)} is received and is refunded right after your show, or immediately if we cannot fit you in.` : ''}
                    {' '}A confirmation is on its way to your inbox. We listen to everything and usually reply within a week or two.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '28px' }}>
                    <Link to="/events" className="btn btn-primary">See What’s On</Link>
                    <Link to="/" className="btn btn-outline">Home</Link>
                </div>
            </Box>
        );
    }

    if (isThanks && polls.current < 40) {
        return (
            <Box>
                <p style={label}>One moment</p>
                <h1 style={h1}>Confirming your payment…</h1>
                <p style={{ color: '#ccc', fontSize: '17px', lineHeight: 1.7 }}>We are waiting for the card provider to confirm. This usually takes a few seconds. Reference {state.ref}.</p>
            </Box>
        );
    }

    return (
        <Box>
            <p style={label}>{cancelled ? 'Payment not completed' : 'Booking fee'}</p>
            <h1 style={h1}>{cancelled ? 'Your application is saved' : 'One last step'}</h1>
            <p style={{ color: '#ccc', fontSize: '17px', lineHeight: 1.7 }}>
                {cancelled ? 'The payment did not go through, but nothing is lost. ' : ''}
                To send application <strong style={{ color: '#c89b3c', letterSpacing: '2px' }}>{state.ref}</strong> to us, pay the booking fee of {kr(state.fee_amount_isk)}.
                It is refunded in full right after your show, or immediately if we cannot fit you in.
            </p>
            {error && <p style={errorStyle}>{error}</p>}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '28px' }}>
                <button type="button" className="btn btn-primary" onClick={pay} disabled={busy}>{busy ? 'Opening payment…' : `Pay ${kr(state.fee_amount_isk)}`}</button>
                <Link to="/" className="btn btn-outline">Later</Link>
            </div>
            <p style={{ color: '#666', fontSize: '13px', marginTop: '20px' }}>Keep this page’s link; you can come back to it to pay. Unpaid applications are not reviewed.</p>
        </Box>
    );
};

export default PayStatus;
