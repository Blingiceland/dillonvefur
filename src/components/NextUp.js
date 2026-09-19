import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchEvents } from '../utils/googleSheet';
import { MAPS_URL } from '../utils/seo';

const label = { color: '#c89b3c', letterSpacing: '5px', fontSize: '12px', textTransform: 'uppercase', margin: '0 0 10px' };

// First screen of the home page: what is on next, when we are open, and where to go.
const NextUp = () => {
    const [next, setNext] = useState(undefined); // undefined = loading, null = nothing scheduled

    useEffect(() => {
        fetchEvents().then((events) => {
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            setNext(events.find((e) => e.dateObj >= startOfToday) || null);
        });
    }, []);

    const isToday = next && next.dateObj.toDateString() === new Date().toDateString();

    return (
        <section className="nextup" aria-labelledby="nextup-heading">
            <h1 id="nextup-heading" className="nextup-tagline">
                Live Music &amp; 250+ Whiskies in the Heart of Reykjavík
            </h1>

            <div className="nextup-grid">
                <div className="nextup-card nextup-event">
                    <p style={label}>{isToday ? 'Tonight at Dillon' : 'Next at Dillon'}</p>
                    {next === undefined && <p className="nextup-title" aria-live="polite">Loading…</p>}
                    {next === null && <p className="nextup-title">Check back soon for the next show</p>}
                    {next && (
                        <>
                            <Link to={`/events/${next.slug}`} className="nextup-title" style={{ display: 'block' }}>{next.title}</Link>
                            <p className="nextup-meta">
                                {isToday ? 'Tonight' : `${next.dayOfWeek} ${next.dateDisplay}`} · {next.time}
                                {next.genre ? ` · ${next.genre}` : ''}
                            </p>
                        </>
                    )}
                </div>

                <div className="nextup-card">
                    <p style={label}>Open Daily</p>
                    <p className="nextup-hours">Sun–Thu 12:00–01:00</p>
                    <p className="nextup-hours">Fri–Sat 12:00–03:00</p>
                    <p className="nextup-meta" style={{ marginTop: '10px' }}><span className="text-gold">Happy Hour</span> every day 12–19</p>
                </div>
            </div>

            <div className="nextup-ctas">
                <Link to="/events" className="btn btn-primary">What’s On</Link>
                <Link to="/whisky" className="btn btn-outline">Whisky List</Link>
                <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="btn btn-outline">Find Us</a>
            </div>

            <style>{`
                .nextup { text-align: center; padding: 8px 20px 48px; }
                .nextup-tagline { font-family: var(--font-heading); color: var(--color-gold); font-size: clamp(26px, 4.5vw, 44px); letter-spacing: 3px; text-transform: uppercase; margin: 0 auto 32px; max-width: 900px; text-wrap: balance; line-height: 1.1; }
                .nextup-grid { display: grid; gap: 16px; max-width: 900px; margin: 0 auto 28px; }
                @media (min-width: 720px) { .nextup-grid { grid-template-columns: 3fr 2fr; } }
                .nextup-card { border: 1px solid rgba(200,155,60,0.3); background: #111; padding: 28px 24px; text-align: left; }
                .nextup-title { font-family: var(--font-heading); color: #f0e6cc; font-size: clamp(26px, 3.5vw, 36px); letter-spacing: 2px; text-transform: uppercase; margin: 0 0 8px; line-height: 1.1; }
                a.nextup-title:hover { color: var(--color-gold); }
                .nextup-meta { color: #aaa; margin: 0; font-size: 16px; }
                .nextup-hours { color: #e8dcc8; font-family: var(--font-heading); font-size: 22px; letter-spacing: 1px; margin: 0 0 4px; }
                .nextup-ctas { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
            `}</style>
        </section>
    );
};

export default NextUp;
