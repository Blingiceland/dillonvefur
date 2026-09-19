import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchEventBySlug } from '../utils/googleSheet';
import {
    usePageMeta, useJsonLd, eventJsonLd, eventDescription, eventUrl, googleCalendarUrl,
    ADDRESS_TEXT, MAPS_URL, DEFAULT_IMAGE, DEFAULT_DESCRIPTION,
} from '../utils/seo';
import NotFound from './NotFound';

const label = { color: '#c89b3c', letterSpacing: '4px', fontSize: '12px', textTransform: 'uppercase', margin: '0 0 8px' };

const EventPage = () => {
    const { slug } = useParams();
    const [event, setEvent] = useState(undefined); // undefined = loading, null = not found
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let alive = true;
        setEvent(undefined);
        fetchEventBySlug(slug).then((e) => { if (alive) setEvent(e); });
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
            </article>

            <style>{`
                .event-hero { display: grid; gap: 32px; }
                @media (min-width: 800px) {
                    .event-hero { grid-template-columns: 5fr 6fr; align-items: start; }
                }
            `}</style>
        </div>
    );
};

export default EventPage;
