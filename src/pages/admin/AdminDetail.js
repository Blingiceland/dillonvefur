import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePageMeta } from '../../utils/seo';
import { embedFor } from '../../utils/embeds';
import { START_TIMES } from '../../utils/applicationRules';
import { field, labelStyle, errorStyle, hintStyle } from '../../components/formStyles';
import { loadApplication, loadLog, adminAction, STATUS_LABEL, STATUS_COLOR, FEE_LABEL, AUDIENCE_LABEL, prettyDate, mediaUrl } from './adminShared';

const Row = ({ k, v, href }) => (v ? (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', padding: '8px 0', borderBottom: '1px solid #1a1a1a', fontSize: '15px' }}>
        <span style={{ color: '#c89b3c', fontFamily: 'var(--font-heading)', letterSpacing: '2px', fontSize: '13px', paddingTop: '2px' }}>{k}</span>
        <span style={{ color: '#e8dcc8', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{href ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#e8dcc8', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{v}</a> : v}</span>
    </div>
) : null);

const Player = ({ label, url }) => {
    const e = embedFor(url);
    if (!e) return null;
    if (e.kind === 'link') return <Row k={label} v={url} href={url} />;
    return (
        <div style={{ marginBottom: '16px' }}>
            <p style={{ ...labelStyle, marginBottom: '8px' }}>{label} · <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#888', letterSpacing: 0, textTransform: 'none' }}>open</a></p>
            {e.kind === 'youtube' ? (
                <div style={{ position: 'relative', paddingTop: `${100 / e.ratio}%` }}>
                    <iframe title={label} src={e.src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
                </div>
            ) : (
                <iframe title={label} src={e.src} width="100%" height={e.height} style={{ border: 0, borderRadius: e.kind === 'spotify' ? '12px' : 0 }} allow="autoplay; encrypted-media" loading="lazy" />
            )}
        </div>
    );
};

const AdminDetail = ({ session }) => {
    const { id } = useParams();
    const [app, setApp] = useState(null);
    const [log, setLog] = useState([]);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [note, setNote] = useState('');

    usePageMeta({ title: app ? `${app.band_name} (${app.ref})` : 'Application', path: `/admin/${id}` });

    const reload = () => Promise.all([loadApplication(id), loadLog(id)]).then(([a, l]) => {
        setApp(a); setLog(l);
        setDate((d) => d || a.preferred_date); setTime((t) => t || a.suggested_start_time); setNote(a.admin_note || '');
    }).catch((e) => setError(e.message));

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { reload(); }, [id]);

    const run = async (action, extra = {}) => {
        setBusy(true); setError(null);
        try { await adminAction(session, { id, action, message, ...extra }); setMessage(''); await reload(); }
        catch (e) { setError(e.message); }
        finally { setBusy(false); }
    };

    if (error && !app) return <p style={{ ...errorStyle, padding: '40px 20px' }}>{error}</p>;
    if (!app) return <p className="text-gold" style={{ padding: '40px 20px', letterSpacing: '3px' }}>LOADING…</p>;

    const dates = [app.preferred_date, app.alt_date_1, app.alt_date_2].filter(Boolean);
    const btn = (label, action, kind = 'btn-outline', extra) => (
        <button key={action} type="button" className={`btn ${kind}`} disabled={busy} onClick={() => run(action, extra)} style={{ padding: '10px 18px', fontSize: '13px' }}>{label}</button>
    );

    return (
        <div style={{ padding: '30px 20px 100px', maxWidth: '1100px', margin: '0 auto' }}>
            <p style={{ marginBottom: '16px' }}><Link to="/admin" style={{ color: '#888', letterSpacing: '2px', fontSize: '12px', textTransform: 'uppercase' }}>← All applications</Link></p>

            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
                <div>
                    <p style={{ color: STATUS_COLOR[app.status], letterSpacing: '4px', fontSize: '12px', textTransform: 'uppercase', margin: '0 0 6px' }}>{STATUS_LABEL[app.status]} · {FEE_LABEL[app.fee_status]}</p>
                    <h1 style={{ fontFamily: 'var(--font-heading)', color: '#f0e6cc', fontSize: 'clamp(30px, 5vw, 44px)', letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>{app.band_name}</h1>
                    <p style={{ color: '#aaa', margin: '6px 0 0' }}>{app.genre}{app.based_in ? ` · ${app.based_in}` : ''} · {app.ref} · applied {new Date(app.created_at).toLocaleDateString('en-GB')}</p>
                </div>
                {app.event_slug && app.status === 'approved' && <a className="btn btn-outline" href={`/events/${app.event_slug}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px' }}>Event page ↗</a>}
            </header>

            {app.last_error && <p style={{ ...errorStyle, border: '1px solid #b04a4a', padding: '10px', marginBottom: '16px' }}>Last error: {app.last_error}</p>}

            <div className="admin-cols">
                <div>
                    <section style={{ marginBottom: '28px' }}>
                        <p style={labelStyle}>Dates asked for</p>
                        {dates.map((d, i) => <Row key={d} k={i === 0 ? 'Preferred' : `Alternate ${i}`} v={prettyDate(d)} />)}
                        <Row k="Start" v={app.suggested_start_time} />
                        {app.confirmed_date && <Row k="Confirmed" v={`${prettyDate(app.confirmed_date)} at ${app.start_time}`} />}
                    </section>

                    <section style={{ marginBottom: '28px' }}>
                        <p style={labelStyle}>The show</p>
                        <Row k="Entry" v={app.entry_type === 'free' ? 'Free entry' : `Ticketed · ${app.ticket_price_isk} kr.`} />
                        <Row k="Tickets" v={app.ticket_url} href={app.ticket_url} />
                        <Row k="Audience" v={AUDIENCE_LABEL[app.audience_estimate]} />
                        <Row k="Line-up" v={app.line_up} />
                        <Row k="Sound eng." v={app.needs_sound_engineer === 'yes' ? 'Yes, needs one from us' : app.needs_sound_engineer === 'no' ? 'No, brings their own' : ''} />
                        <Row k="Tech" v={app.tech_needs} />
                    </section>

                    <section style={{ marginBottom: '28px' }}>
                        <p style={labelStyle}>About</p>
                        <p style={{ color: '#e8dcc8', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{app.bio}</p>
                        {app.previous_gigs && <Row k="Previous gigs" v={app.previous_gigs} />}
                    </section>

                    <section style={{ marginBottom: '28px' }}>
                        <p style={labelStyle}>Contact</p>
                        <Row k="Name" v={app.contact_name} />
                        <Row k="Email" v={app.contact_email} href={`mailto:${app.contact_email}`} />
                        <Row k="Phone" v={app.contact_phone} href={`tel:${app.contact_phone.replace(/\s/g, '')}`} />
                        <Row k="Instagram" v={app.instagram_url} href={app.instagram_url} />
                        <Row k="Facebook" v={app.facebook_url} href={app.facebook_url} />
                        <Row k="Website" v={app.website_url} href={app.website_url} />
                    </section>
                </div>

                <div>
                    <section style={{ marginBottom: '28px' }}>
                        <p style={labelStyle}>Listen</p>
                        <Player label="Spotify" url={app.spotify_url} />
                        <Player label="YouTube" url={app.youtube_url} />
                        <Player label="SoundCloud" url={app.soundcloud_url} />
                        <Player label="Bandcamp" url={app.bandcamp_url} />
                    </section>

                    <section style={{ marginBottom: '28px' }}>
                        <p style={labelStyle}>Photos</p>
                        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: app.poster_path ? '1fr 1fr' : '1fr' }}>
                            <a href={mediaUrl(app.press_photo_path)} target="_blank" rel="noopener noreferrer"><img src={mediaUrl(app.press_photo_path)} alt="Press" style={{ width: '100%', display: 'block', border: '1px solid #333' }} /></a>
                            {app.poster_path && <a href={mediaUrl(app.poster_path)} target="_blank" rel="noopener noreferrer"><img src={mediaUrl(app.poster_path)} alt="Poster" style={{ width: '100%', display: 'block', border: '1px solid #333' }} /></a>}
                        </div>
                    </section>
                </div>
            </div>

            <section style={{ border: '1px solid var(--color-gold)', background: 'rgba(20,20,20,0.8)', padding: '24px', marginTop: '12px' }}>
                <p style={labelStyle}>Decision</p>
                {error && <p style={errorStyle}>{error}</p>}

                {(app.status === 'submitted' || app.status === 'changes_requested') && (
                    <div style={{ display: 'grid', gap: '16px' }}>
                        {app.status === 'changes_requested' && (
                            <p style={{ ...hintStyle, color: '#e0a44b', margin: 0 }}>Waiting on the band. You asked: “{app.decision_message}”. They have a personal link to update and resend.</p>
                        )}
                        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                            <div>
                                <label htmlFor="confirm-date" style={labelStyle}>Date</label>
                                <select id="confirm-date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...field, backgroundColor: '#111' }}>
                                    {dates.map((d) => <option key={d} value={d}>{prettyDate(d)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="confirm-time" style={labelStyle}>Start time</label>
                                <select id="confirm-time" value={time} onChange={(e) => setTime(e.target.value)} style={{ ...field, backgroundColor: '#111' }}>
                                    {[...new Set([time, ...START_TIMES])].filter(Boolean).map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="decision-message" style={labelStyle}>Message to the band</label>
                            <textarea id="decision-message" rows="3" value={message} onChange={(e) => setMessage(e.target.value)} style={{ ...field, resize: 'vertical' }} placeholder="Optional for approve/reject. Required for “Request changes”: say exactly what to fix." />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {btn(busy ? 'Working…' : 'Approve & Schedule', 'approve', 'btn-primary', { confirmedDate: date, startTime: time })}
                            {btn('Request changes', 'request_changes')}
                            {btn('Reject', 'reject')}
                            {btn('Withdrawn by band', 'withdraw')}
                        </div>
                        <p style={hintStyle}>Approve emails the band and puts the show on the schedule. Request changes emails your message with a personal link where the band fixes and resends. Reject emails the band with your message.</p>
                    </div>
                )}

                {app.status === 'approved' && (
                    <div style={{ display: 'grid', gap: '16px' }}>
                        <div>
                            <label htmlFor="decision-message" style={labelStyle}>Message to the band (for cancel)</label>
                            <textarea id="decision-message" rows="2" value={message} onChange={(e) => setMessage(e.target.value)} style={{ ...field, resize: 'vertical' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {btn('Mark as played', 'played', 'btn-primary')}
                            {btn('Cancel show', 'cancel')}
                            {btn('Withdrawn by band', 'withdraw')}
                        </div>
                    </div>
                )}

                {['paid', 'refund_pending', 'refund_failed'].includes(app.fee_status) && (
                    <div style={{ marginTop: '16px' }}>{btn('Mark fee refunded', 'mark_refunded')}</div>
                )}

                <div style={{ marginTop: '24px' }}>
                    <label htmlFor="admin-note" style={labelStyle}>Internal note</label>
                    <textarea id="admin-note" rows="2" value={note} onChange={(e) => setNote(e.target.value)} style={{ ...field, resize: 'vertical' }} />
                    <button type="button" className="btn btn-outline" disabled={busy || note === (app.admin_note || '')} onClick={() => run('add_note', { note })} style={{ marginTop: '10px', padding: '8px 14px', fontSize: '12px' }}>Save note</button>
                </div>
            </section>

            <section style={{ marginTop: '28px' }}>
                <p style={labelStyle}>History</p>
                {log.map((l) => (
                    <div key={l.id} style={{ color: '#888', fontSize: '13px', padding: '4px 0' }}>
                        {new Date(l.at).toLocaleString('en-GB')} · {l.actor} · {l.type}{l.payload?.message ? ` · "${l.payload.message}"` : ''}
                    </div>
                ))}
            </section>

            <style>{`
                .admin-cols { display: grid; gap: 32px; }
                @media (min-width: 900px) { .admin-cols { grid-template-columns: 1fr 1fr; } }
            `}</style>
        </div>
    );
};

export default AdminDetail;
