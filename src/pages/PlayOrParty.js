import React from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta, EMAIL } from '../utils/seo';

// /play: first ask what the visitor wants, then send them to the right place.
// Bands go on to the application (/play/apply, behind the soft-launch code while it is set);
// private parties and company events go to the Book Dillon form.

const label = { color: '#c89b3c', letterSpacing: '4px', fontSize: '12px', textTransform: 'uppercase', margin: '0 0 10px' };

const card = {
    border: '1px solid var(--color-gold)',
    background: 'rgba(20, 20, 20, 0.8)',
    padding: 'clamp(24px, 4vw, 40px)',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    textAlign: 'left',
};

const Option = ({ kicker, title, children, to, cta }) => (
    <div style={card}>
        <p style={{ ...label, margin: 0 }}>{kicker}</p>
        <h2 style={{ fontFamily: 'var(--font-heading)', color: '#f0e6cc', fontSize: 'clamp(26px, 4vw, 34px)', letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>{title}</h2>
        <p style={{ color: '#ccc', fontSize: '16px', lineHeight: 1.7, margin: 0, flex: 1 }}>{children}</p>
        <div><Link to={to} className="btn btn-primary">{cta}</Link></div>
    </div>
);

const PlayOrParty = () => {
    usePageMeta({
        title: 'Play at Dillon',
        path: '/play',
        description: 'Play a live show at Dillon Whiskey Bar in Reykjavík, or book the bar for a private party or company event.',
    });

    return (
        <div style={{ background: '#0a0a0a', padding: '40px 20px 100px' }}>
            <div style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'center' }}>
                <header style={{ marginBottom: '36px' }}>
                    <p style={label}>Play or party?</p>
                    <h1 style={{ fontFamily: 'var(--font-heading)', color: '#f0e6cc', fontSize: 'clamp(36px, 6vw, 56px)', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 16px' }}>Play at Dillon</h1>
                    <p style={{ color: '#ccc', fontSize: '18px', lineHeight: 1.7, maxWidth: '640px', margin: '0 auto' }}>
                        Two ways to make a night of it. Which one are you?
                    </p>
                </header>

                <div className="play-choice">
                    <Option kicker="Bands & artists" title="Play a show" to="/play/apply" cta="Apply to play">
                        Live music on the top floor most weekends. Pick a free date, tell us who you are and send us something to listen to.
                    </Option>
                    <Option kicker="Private parties & companies" title="Book a party" to="/bookdillon" cta="Book Dillon">
                        Birthdays, work dos, product launches. Tell us the date, the group size and what you have in mind, and we get back to you within a day or two.
                    </Option>
                </div>

                <p style={{ color: '#888', fontSize: '14px', marginTop: '28px' }}>
                    Something else? Email <a href={`mailto:${EMAIL}`} className="text-gold">{EMAIL}</a>
                </p>

                <style>{`
                    .play-choice { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                    @media (max-width: 720px) { .play-choice { grid-template-columns: 1fr; } }
                `}</style>
            </div>
        </div>
    );
};

export default PlayOrParty;
