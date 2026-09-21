import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchEventBySlug } from '../utils/googleSheet';
import {
    usePageMeta, useJsonLd, eventJsonLd, eventDescription, eventUrl, googleCalendarUrl,
    ADDRESS_TEXT, MAPS_URL, DEFAULT_IMAGE, DEFAULT_DESCRIPTION,
} from '../utils/seo';
import NotFound from './NotFound';
import { embedFor } from '../utils/embeds';
import { LINK_HOSTS } from '../utils/applicationRules';

const label = { color: '#c89b3c', letterSpacing: '4px', fontSize: '12px', textTransform: 'uppercase', margin: '0 0 8px' };

const Player = ({ url }) => {
    const e = embedFor(url);
    if (!e || e.kind === 'link') return null;
    const style = e.ratio ? { width: '100%', aspectRatio: String(e.ratio), border: 0 } : { width: '100%', height: `${e.height}px`, border: 0 };
    return <iframe title={`${e.kind} player`} src={e.src} style={style} loading="lazy" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" allowFullScreen />;
};

/** "About the band" for shows booked through Play at Dillon (info comes from /api/event-info). */
const BandInfo = ({ info, poster }) => {
    if (!info) return null;
    const players = ['spotify', 'youtube', 'soundcloud'].map((k) => info.links[k]).filter((u) => u && embedFor(u)?.kind !== 'link');
    const photo = info.press_photo && info.press_photo !== poster ? info.press_photo : null;
    const facts = [['Based in', info.based_in], ['Line-up', info.line_up], ['Played before at', info.previous_gigs]].filter(([, v]) => v);
    return (
        <section className="band-info" aria-labelledby="about-band">
            <p style={label}>About the band</p>
            <h2 id="about-band" style={{ fontFamily: 'var(--font-heading)', color: '#f0e6cc', fontSize: 'clamp(26px, 4vw, 36px)', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 20px' }}>{info.band_name}</h2>
            <div className="band-grid">
                <div>
                    {photo && <img src={photo} alt={info.band_name} loading="lazy" decoding="async" style={{ width: '100%', height: 'auto', display: 'block', border: '1px solid rgba(200,155,60,0.3)', marginBottom: '20px' }} />}
                    {info.bio && <p style={{ color: '#ddd', fontSize: '17px', lineHeight: 1.75, margin: '0 0 20px', whiteSpace: 'pre-wrap' }}>{info.bio}</p>}
                    {facts.length > 0 && (
                        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 20px', margin: '0 0 20px', color: '#e8dcc8', fontSize: '15px' }}>
                            {facts.map(([k, v]) => (
                                <React.Fragment key={k}>
                                    <dt style={{ color: '#c89b3c', fontFamily: 'var(--font-heading)', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '13px', paddingTop: '2px' }}>{k}</dt>
                                    <dd style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{v}</dd>
                                </React.Fragment>
                            ))}
                        </dl>
                    )}
                    {Object.keys(info.links).length > 0 && (
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {Object.entries(info.links).map(([k, u]) => (
                                <a key={k} href={u} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ background: 'transparent', padding: '8px 16px', fontSize: '13px' }}>{LINK_HOSTS[k]?.label || k}</a>
                            ))}
                        </div>
                    )}
                </div>
                {players.length > 0 && (
                    <div style={{ display: 'grid', gap: '16px', alignContent: 'start' }}>
                        <p style={{ ...label, margin: 0 }}>Listen</p>
                        {players.map((u) => <Player key={u} url={u} />)}
                    </div>
                )}
            </div>
        </section>
    );
};

const EventPage = () => {
    const { slug } = useParams();
    const [event, setEvent] = useState(undefined); // undefined = loading, null = not found
    const [copied, setCopied] = useState(false);
    const [info, setInfo] = useState(null);

    useEffect(() => {
        let alive = true;
        setEvent(undefined);
        fetchEventBySlug(slug).then((e) => { if (alive) setEvent(e); });
        setInfo(null);
        fetch(`/api/event-info?slug=${encodeURIComponent(slug)}`)
            .then((r) => (r.ok ? r.json() : { info: null }))
            .then((j) => { if (alive) setInfo(j.info || null); })
            .catch(() => {});
        return () => { alive = false; };
    }, [slug]);

    usePageMeta({
        title: event ? `${event.title} – ${event.dayOfWeek} ${event.dateDisplay}` : 'Event',
        path: `/events/${slug}`,
        description: event ? eventDescription(event) : DEFAULT_DESCRIPTION,
        image: event?.poster || DEFAULT_IMAGE,
    });
    const jsonLd = useMemo(() => (event ? eventJsonLd(event) : null), [event]);
    useJsonLd('event', jsonLd);

    if (event === null) return <NotFound />;

    if (event === undefined) {
        return (
            <div style={{ minHeight: '60vh', textAlign: 'center', padding: '80px 20px' }}>
                <p className="text-gold" aria-live="polite" style={{ letterSpacing: '3px' }}>LOADING…</p>
            </div>
        );
    }

    const url = eventUrl(event);
    const isPast = event.dateObj < new Date(new Date().setHours(0, 0, 0, 0));
    const share = async () => {
        try {
            if (navigator.share) {
                await navigator.share({ title: `${event.title} @ Dillon`, text: eventDescription(event), url });
                return;
            }
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) { /* user cancelled */ }
    };

    return (
        <div style={{ background: '#0a0a0a', padding: '40px 20px 100px' }}>
            <article style={{ maxWidth: '900px', margin: '0 auto' }}>
                <p style={{ marginBottom: '24px' }}>
                    <Link to="/events" style={{ color: '#888', letterSpacing: '2px', fontSize: '12px', textTransform: 'uppercase' }}>← All Events</Link>
                </p>

                <div className="event-hero">
                    <div className="event-poster">
                        <img
                            src={event.poster || DEFAULT_IMAGE}
                            alt={event.poster ? `Poster for ${event.title}` : 'Dillon Whiskey Bar'}
                            width="1200"
                            height={event.poster ? undefined : 630}
                            fetchpriority="high"
                            style={{ width: '100%', height: 'auto', display: 'block', border: '1px solid rgba(200,155,60,0.3)' }}
                        />
                    </div>

                    <div className="event-details">
                        <p style={label}>{isPast ? 'Past Event' : 'Live at Dillon'}</p>
                        <h1 style={{ fontFamily: 'var(--font-heading)', color: '#f0e6cc', fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 16px', lineHeight: 1.05 }}>
                            {event.title}
                        </h1>
                        {event.genre && <p style={{ color: '#aaa', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '13px', margin: '0 0 24px' }}>{event.genre}</p>}

                        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 20px', margin: '0 0 32px', color: '#e8dcc8', fontSize: '17px' }}>
                            <dt style={{ color: '#c89b3c', fontFamily: 'var(--font-heading)', letterSpacing: '2px' }}>WHEN</dt>
                            <dd style={{ margin: 0 }}>
                                <time dateTime={`${event.isoDate}T${event.time}`}>{event.dayOfWeek} {event.dateDisplay}, {event.time}</time>
                            </dd>
                            <dt style={{ color: '#c89b3c', fontFamily: 'var(--font-heading)', letterSpacing: '2px' }}>WHERE</dt>
                            <dd style={{ margin: 0 }}>
                                <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#e8dcc8', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                                    Dillon, {ADDRESS_TEXT}
                                </a>
                            </dd>
                            <dt style={{ color: '#c89b3c', fontFamily: 'var(--font-heading)', letterSpacing: '2px' }}>ENTRY</dt>
                            <dd style={{ margin: 0 }}>{event.entry || 'See the bar for details'}</dd>
                        </dl>

                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            {event.tickets && !isPast && (
                                <a href={event.tickets} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Buy Tickets</a>
                            )}
                            {!isPast && (
                                <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className="btn btn-outline">Add to Calendar</a>
                            )}
                            <button type="button" onClick={share} className="btn btn-outline" style={{ background: 'transparent' }}>
                                {copied ? 'Link Copied' : 'Share'}
                            </button>
                        </div>
                    </div>
                </div>

                <BandInfo info={info} poster={event.poster} />
            </article>

            <style>{`
                .event-hero { display: grid; gap: 32px; }
                .band-info { margin-top: 56px; padding-top: 40px; border-top: 1px solid rgba(200,155,60,0.25); }
                .band-grid { display: grid; gap: 32px; }
                @media (min-width: 800px) {
                    .event-hero { grid-template-columns: 5fr 6fr; align-items: start; }
                    .band-grid { grid-template-columns: 6fr 5fr; align-items: start; }
                }
            `}</style>
        </div>
    );
};

export default EventPage;
