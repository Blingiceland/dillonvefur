import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { usePageMeta } from '../../utils/seo';
import { fetchAvailability } from '../../components/apply/AvailabilityCalendar';
import { loadApplications, STATUS_LABEL, STATUS_COLOR, FEE_LABEL, prettyDate } from './adminShared';

const TABS = [
    { key: 'new', label: 'New', statuses: ['submitted', 'pending_payment'] },
    { key: 'approved', label: 'Approved', statuses: ['approved'] },
    { key: 'past', label: 'Past', statuses: ['played', 'cancelled', 'withdrawn'] },
    { key: 'rejected', label: 'Rejected', statuses: ['rejected'] },
];

const AdminList = ({ session }) => {
    usePageMeta({ title: 'Applications', path: '/admin' });
    const [apps, setApps] = useState(null);
    const [error, setError] = useState(null);
    const [tab, setTab] = useState('new');
    const [taken, setTaken] = useState(new Set());

    useEffect(() => {
        loadApplications().then(setApps).catch((e) => setError(e.message));
        fetchAvailability().then((a) => setTaken(new Set(a.taken))).catch(() => {});
    }, []);

    const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.key, (apps || []).filter((a) => t.statuses.includes(a.status)).length])), [apps]);
    const visible = useMemo(() => {
        const t = TABS.find((x) => x.key === tab);
        const list = (apps || []).filter((a) => t.statuses.includes(a.status));
        return tab === 'new' ? list.slice().sort((a, b) => a.preferred_date.localeCompare(b.preferred_date)) : list;
    }, [apps, tab]);
    const requestedTwice = useMemo(() => {
        const m = {};
        (apps || []).filter((a) => a.status === 'submitted').forEach((a) => { m[a.preferred_date] = (m[a.preferred_date] || 0) + 1; });
        return m;
    }, [apps]);

    return (
        <div style={{ padding: '30px 20px 100px', maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
                <h1 style={{ fontFamily: 'var(--font-heading)', color: '#f0e6cc', fontSize: '36px', letterSpacing: '3px', textTransform: 'uppercase', margin: 0 }}>Gig Applications</h1>
                <div style={{ color: '#777', fontSize: '13px' }}>
                    {session.user.email} · <button type="button" onClick={() => supabase.auth.signOut()} style={{ background: 'none', border: 'none', color: '#c89b3c', cursor: 'pointer', padding: 0, font: 'inherit' }}>Sign out</button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {TABS.map((t) => (
                    <button key={t.key} type="button" onClick={() => setTab(t.key)} style={{ padding: '8px 18px', background: tab === t.key ? '#c89b3c' : 'transparent', border: `1px solid ${tab === t.key ? '#c89b3c' : '#333'}`, color: tab === t.key ? '#0a0a0a' : '#888', fontFamily: 'var(--font-heading)', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '12px', cursor: 'pointer' }}>
                        {t.label} {counts[t.key] ? <span style={{ opacity: 0.7 }}>({counts[t.key]})</span> : null}
                    </button>
                ))}
            </div>

            {error && <p style={{ color: '#e07b7b' }}>{error}</p>}
            {apps === null && !error && <p className="text-gold" style={{ letterSpacing: '3px' }}>LOADING…</p>}
            {apps && visible.length === 0 && <p style={{ color: '#666' }}>Nothing here.</p>}

            <div style={{ display: 'grid', gap: '10px' }}>
                {visible.map((a) => {
                    const clash = taken.has(a.preferred_date) || requestedTwice[a.preferred_date] > 1;
                    return (
                        <Link key={a.id} to={`/admin/${a.id}`} className="admin-row" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '16px', alignItems: 'center', border: '1px solid #222', background: '#111', padding: '14px 16px', color: 'inherit' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: STATUS_COLOR[a.status] }} title={STATUS_LABEL[a.status]} />
                            <span>
                                <span style={{ fontFamily: 'var(--font-heading)', color: '#f0e6cc', fontSize: '20px', letterSpacing: '1px' }}>{a.band_name}</span>
                                <span style={{ color: '#888', marginLeft: '12px', fontSize: '13px' }}>{a.genre}</span>
                                <br />
                                <span style={{ color: '#ccc', fontSize: '14px' }}>
                                    {a.status === 'approved' || a.status === 'played' ? prettyDate(a.confirmed_date) : prettyDate(a.preferred_date)}
                                    {a.status === 'submitted' && (a.alt_date_1 || a.alt_date_2) && <span style={{ color: '#777' }}> · alt {[a.alt_date_1, a.alt_date_2].filter(Boolean).map(prettyDate).join(', ')}</span>}
                                    {a.status === 'submitted' && clash && <span style={{ color: '#e0a44b', marginLeft: '10px' }}>⚠ date conflict</span>}
                                </span>
                            </span>
                            <span style={{ textAlign: 'right', fontSize: '12px', color: '#888', letterSpacing: '1px' }}>
                                {a.ref}<br />
                                {a.entry_type === 'free' ? 'Free entry' : `${a.ticket_price_isk} kr.`}<br />
                                <span style={{ color: a.fee_status === 'paid' ? '#7bc07b' : '#666' }}>{FEE_LABEL[a.fee_status]}</span>
                            </span>
                        </Link>
                    );
                })}
            </div>
            <style>{'.admin-row:hover { border-color: #c89b3c !important; }'}</style>
        </div>
    );
};

export default AdminList;
