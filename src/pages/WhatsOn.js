import React, { useEffect, useMemo, useState } from 'react';
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
                    .event-row { display: flex; flex-direction: column; gap: 20px; width: 100%; }
                    @media (min-width: 768px) {
                        .event-row { flex-direction: row; align-items: center; }
                        .event-date { width: 25%; }
                        .event-info { flex: 1; padding: 0 20px; text-align: left !important; }
                    }
                `}</style>

                {loading ? (
                    <p className="text-gold" style={{ fontSize: '1.2rem' }} aria-live="polite">Loading events…</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', alignItems: 'center' }}>
                        {events.length === 0 && <p>No upcoming events scheduled. Check back soon.</p>}

                        {events.map(event => (
                            <article key={event.id} style={{
                                width: '100%',
                                border: '1px solid rgba(200, 155, 60, 0.3)',
                                background: '#111',
                                padding: '30px',
                                textAlign: 'left',
                                transition: 'border-color 0.3s'
                            }}
                                onMouseOver={(e) => e.currentTarget.style.borderColor = '#C89B3C'}
                                onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(200, 155, 60, 0.3)'}
                            >
                                <div className="event-row">
                                    <div className="event-date" style={{ textAlign: 'center', minWidth: '150px' }}>
                                        <p style={{ fontSize: '1.8rem', fontFamily: 'var(--font-heading)', margin: 0, textTransform: 'uppercase', lineHeight: 1.2 }}>
                                            <time dateTime={event.dateObj.toISOString().slice(0, 10)}>{event.dateDisplay}</time>
                                        </p>
                                        <p style={{ margin: '4px 0 0', color: '#aaa', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '2px' }}>{event.dayOfWeek}</p>
                                        <p className="text-gold" style={{ margin: '5px 0 0 0', fontSize: '1.2rem' }}>{event.time}</p>
                                    </div>

                                    <div className="event-info" style={{ textAlign: 'center' }}>
                                        <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', margin: '0 0 6px 0', textTransform: 'uppercase' }}>{event.title}</h2>
                                        {event.genre && (
                                            <p style={{ color: '#aaa', margin: 0, letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.85rem' }}>{event.genre}</p>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhatsOn;
