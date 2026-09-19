import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchEvents } from '../utils/googleSheet';
import { usePageMeta, useJsonLd, eventsJsonLd } from '../utils/seo';

const WhatsOn = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    usePageMeta({
        title: 'What’s On – Live Music & Events',
        path: '/events',
        description: 'Upcoming live music, blues nights, comedy and DJ nights at Dillon Whiskey Bar, Laugavegur 30, Reykjavík. Blues every Thursday, live bands most weekends.',
    });

    useEffect(() => {
        const getEvents = async () => {
            const data = await fetchEvents();
            // Keep today's events (they may start later tonight) and everything after
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            setEvents(data.filter(e => e.dateObj >= startOfToday));
            setLoading(false);
        };
        getEvents();
    }, []);

    const jsonLd = useMemo(() => eventsJsonLd(events), [events]);
    useJsonLd('events', jsonLd);

    return (
        <div style={{ paddingTop: '50px', minHeight: '100vh', paddingBottom: '100px', backgroundColor: '#000', color: '#fff' }}>
            <div style={{ maxWidth: '1000px', width: '95%', margin: '0 auto', textAlign: 'center' }}>
                <h1 className="text-gold" style={{ fontSize: '3.5rem', marginBottom: '40px', fontFamily: 'var(--font-heading)', letterSpacing: '2px' }}>Upcoming Events</h1>

                <style>{`
                    .event-card { display: block; width: 100%; border: 1px solid rgba(200, 155, 60, 0.3); background: #111; padding: 24px 30px; text-align: left; color: inherit; transition: border-color 0.3s, background-color 0.3s; }
                    .event-card:hover, .event-card:focus-visible { border-color: #C89B3C; background: #151515; }
                    .event-row { display: flex; flex-direction: column; gap: 20px; width: 100%; align-items: center; }
                    .event-thumb { width: 100%; max-width: 320px; aspect-ratio: 16 / 9; object-fit: cover; display: block; border: 1px solid rgba(200,155,60,0.2); }
                    @media (min-width: 768px) {
                        .event-row { flex-direction: row; }
                        .event-date { width: 22%; }
                        .event-info { flex: 1; padding: 0 20px; text-align: left !important; }
                        .event-thumb { width: 200px; }
                    }
                `}</style>

                {loading ? (
                    <p className="text-gold" style={{ fontSize: '1.2rem' }} aria-live="polite">Loading events…</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
                        {events.length === 0 && <p>No upcoming events scheduled. Check back soon.</p>}

                        {events.map(event => (
                            <Link key={event.id} to={`/events/${event.slug}`} className="event-card" aria-label={`${event.title}, ${event.dayOfWeek} ${event.dateDisplay} at ${event.time}`}>
                                <article className="event-row">
                                    <div className="event-date" style={{ textAlign: 'center', minWidth: '150px' }}>
                                        <p style={{ fontSize: '1.8rem', fontFamily: 'var(--font-heading)', margin: 0, textTransform: 'uppercase', lineHeight: 1.2 }}>
                                            <time dateTime={event.isoDate}>{event.dateDisplay}</time>
                                        </p>
                                        <p style={{ margin: '4px 0 0', color: '#aaa', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '2px' }}>{event.dayOfWeek}</p>
                                        <p className="text-gold" style={{ margin: '5px 0 0 0', fontSize: '1.2rem' }}>{event.time}</p>
                                    </div>

                                    <div className="event-info" style={{ textAlign: 'center' }}>
                                        <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', margin: '0 0 6px 0', textTransform: 'uppercase' }}>{event.title}</h2>
                                        <p style={{ color: '#aaa', margin: 0, letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                                            {[event.genre, event.entry && `Entry: ${event.entry}`].filter(Boolean).join(' · ')}
                                        </p>
                                        {event.tickets && <p className="text-gold" style={{ margin: '10px 0 0', fontSize: '0.85rem', letterSpacing: '2px', textTransform: 'uppercase' }}>Tickets available →</p>}
                                    </div>

                                    {event.poster && (
                                        <img className="event-thumb" src={event.poster} alt="" loading="lazy" decoding="async" />
                                    )}
                                </article>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhatsOn;
