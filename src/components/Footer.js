import React from 'react';

const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=Dillon+Whiskey+Bar+Laugavegur+30+Reykjav%C3%ADk';
const SOCIAL = [
    { label: 'Instagram', href: 'https://www.instagram.com/dillonwhiskeybar/' },
    { label: 'Facebook', href: 'https://www.facebook.com/DillonWhiskeyBar/' },
    { label: 'TripAdvisor', href: 'https://www.tripadvisor.com/Attraction_Review-g189970-d4326058-Reviews-Dillon_Whiskey_Bar-Reykjavik_Capital_Region.html' },
];

const linkStyle = { color: 'var(--color-gold)', textDecoration: 'underline', textUnderlineOffset: '3px' };

const Footer = () => {
    return (
        <footer style={{
            background: '#080808',
            padding: '60px 40px',
            color: '#888',
            textAlign: 'center',
            borderTop: '1px solid #222'
        }}>
            <div style={{ marginBottom: '40px' }}>
                <h2 style={{ color: '#fff', fontSize: '32px', marginBottom: '20px' }}>DILLON</h2>
                <p style={{ fontSize: '18px', color: '#ccc', marginBottom: '10px' }}>
                    <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#ccc' }}>
                        Laugavegur 30, 101 Reykjavík
                    </a>
                </p>
                <p style={{ marginBottom: '10px' }}>Live music, DJs & whiskey in the heart of Reykjavík</p>
                <p style={{ marginBottom: '10px' }}>
                    <a href="/bookdillon" style={{ color: '#ccc' }}>Book Dillon</a>
                    {process.env.REACT_APP_PLAY_HIDDEN !== '1' && (
                        <>
                            <span style={{ margin: '0 12px' }}>·</span>
                            <a href="/play" style={{ color: '#ccc' }}>Play at Dillon</a>
                        </>
                    )}
                </p>
                <p>
                    <a href="tel:+3545379700" style={linkStyle}>+354 537 9700</a>
                    <span style={{ margin: '0 12px' }}>·</span>
                    <a href="mailto:dillon@dillon.is" style={linkStyle}>dillon@dillon.is</a>
                </p>
            </div>

            <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
                <div>
                    <h3 style={{ color: 'var(--color-gold)', marginBottom: '10px', fontSize: '18px' }}>Opening Hours</h3>
                    <p>Sun–Thu: 12:00 – 01:00</p>
                    <p>Fri–Sat: 12:00 – 03:00</p>
                </div>
                <div>
                    <h3 style={{ color: 'var(--color-gold)', marginBottom: '10px', fontSize: '18px' }}>Happy Hour</h3>
                    <p>Every Day: 12:00 – 19:00</p>
                </div>
                <div>
                    <h3 style={{ color: 'var(--color-gold)', marginBottom: '10px', fontSize: '18px' }}>Follow Us</h3>
                    {SOCIAL.map(s => (
                        <p key={s.label}>
                            <a href={s.href} target="_blank" rel="noopener noreferrer" style={{ color: '#ccc' }}>{s.label}</a>
                        </p>
                    ))}
                </div>
            </div>

            <div style={{ fontSize: '14px', borderTop: '1px solid #222', paddingTop: '20px', marginBottom: '20px' }}>
                &copy; {new Date().getFullYear()} Dillon Whiskey Bar. All rights reserved.
            </div>

            <div style={{ fontSize: '14px', opacity: 0.8 }}>
                <a
                    href="https://bling.is"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--color-gold)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                    Vefur keyrður á <span style={{ fontWeight: '600' }}>Bling</span>
                </a>
            </div>
        </footer>
    );
};

export default Footer;
