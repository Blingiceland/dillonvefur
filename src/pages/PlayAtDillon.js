import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta, EMAIL } from '../utils/seo';
import AvailabilityCalendar, { fetchAvailability, MAX_DATES } from '../components/apply/AvailabilityCalendar';
import ApplyForm from '../components/apply/ApplyForm';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const pretty = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return `${WEEKDAYS[date.getUTCDay()]} ${d} ${MONTHS[m - 1]} ${y}`;
};

const label = { color: '#c89b3c', letterSpacing: '4px', fontSize: '12px', textTransform: 'uppercase', margin: '0 0 10px' };

const PlayAtDillon = () => {
    usePageMeta({
        title: 'Play at Dillon',
        path: '/play',
        description: 'Apply to play a live show at Dillon Whiskey Bar, Reykjavík. See which dates are free, send us your music and tell us about the band.',
    });

    const [availability, setAvailability] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dates, setDates] = useState([]);
    const [done, setDone] = useState(null);

    useEffect(() => {
        fetchAvailability()
            .then(setAvailability)
            .catch(setError)
            .finally(() => setLoading(false));
    }, []);

    const makePreferred = (iso) => setDates((d) => [iso, ...d.filter((x) => x !== iso)]);

    if (done) {
        return (
            <div style={{ background: '#0a0a0a', padding: '60px 20px 120px' }}>
                <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center', border: '1px solid var(--color-gold)', padding: 'clamp(28px, 6vw, 56px)', background: 'rgba(20,20,20,0.8)' }}>
                    <p style={label}>Application received</p>
                    <h1 style={{ fontFamily: 'var(--font-heading)', color: '#f0e6cc', fontSize: 'clamp(32px, 6vw, 48px)', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 16px' }}>Thanks, we’ll be in touch</h1>
                    <p style={{ color: '#ccc', fontSize: '17px', lineHeight: 1.7 }}>
                        Your reference is <strong style={{ color: '#c89b3c', letterSpacing: '2px' }}>{done.ref}</strong>. A confirmation is on its way to your inbox.
                        We listen to everything and usually reply within a week or two.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '28px' }}>
                        <Link to="/events" className="btn btn-primary">See What’s On</Link>
                        <Link to="/" className="btn btn-outline">Home</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ background: '#0a0a0a', padding: '40px 20px 100px' }}>
            <div style={{ maxWidth: '960px', margin: '0 auto' }}>
                <header style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <p style={label}>Bands &amp; Artists</p>
                    <h1 style={{ fontFamily: 'var(--font-heading)', color: '#f0e6cc', fontSize: 'clamp(36px, 6vw, 56px)', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 16px' }}>
                        Play at Dillon
                    </h1>
                    <p style={{ color: '#ccc', fontSize: '18px', lineHeight: 1.7, maxWidth: '640px', margin: '0 auto' }}>
                        Loud guitars, real bands and a room that listens. Most weekends we host live music on the top floor,
                        and we are always looking for new acts. Pick a free date, then tell us who you are and send us
                        something to listen to. It takes about ten minutes.
                    </p>
                </header>

                <section style={{ marginBottom: '32px' }}>
                    <p style={label}>Step 1 · Pick your dates</p>
                    <p style={{ color: '#999', fontSize: '15px', margin: '0 0 20px' }}>
                        Choose a preferred date and up to {MAX_DATES - 1} alternates. Bookings open two weeks ahead and run about six months out.
                    </p>
                    <AvailabilityCalendar value={dates} onChange={setDates} availability={availability} loading={loading} error={error} />
                </section>

                {dates.length > 0 && (
                    <section style={{ border: '1px solid rgba(200,155,60,0.3)', background: '#111', padding: '24px', marginBottom: '32px' }}>
                        <p style={label}>Your dates</p>
                        <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '10px' }}>
                            {dates.map((iso, i) => (
                                <li key={iso} style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', color: '#e8dcc8' }}>
                                    <span style={{ color: i === 0 ? '#c89b3c' : '#777', fontFamily: 'var(--font-heading)', letterSpacing: '2px', minWidth: '110px' }}>
                                        {i === 0 ? 'PREFERRED' : `ALTERNATE ${i}`}
                                    </span>
                                    <span>{pretty(iso)}</span>
                                    {i > 0 && (
                                        <button type="button" onClick={() => makePreferred(iso)} style={{ background: 'none', border: '1px solid #333', color: '#aaa', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', letterSpacing: '1px' }}>
                                            Make preferred
                                        </button>
                                    )}
                                    <button type="button" onClick={() => setDates((d) => d.filter((x) => x !== iso))} aria-label={`Remove ${pretty(iso)}`} style={{ background: 'none', border: 'none', color: '#777', cursor: 'pointer', fontSize: '16px' }}>
                                        ×
                                    </button>
                                </li>
                            ))}
                        </ol>
                    </section>
                )}

                {availability && <ApplyForm dates={dates} availability={availability} onSubmitted={setDone} />}

                <p style={{ color: '#666', fontSize: '14px', textAlign: 'center', marginTop: '32px' }}>
                    Private party or company event instead? <Link to="/bookdillon" className="text-gold">Book Dillon</Link>. Anything else: <a href={`mailto:${EMAIL}`} className="text-gold">{EMAIL}</a>
                </p>
            </div>
        </div>
    );
};

export default PlayAtDillon;
