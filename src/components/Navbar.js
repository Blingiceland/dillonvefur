import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/logo.webp';

const Navbar = () => {
    const location = useLocation();
    const isEventsPage = location.pathname === '/events';

    return (
        <nav style={{
            position: 'relative',
            width: '100%',
            padding: '20px 0 40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 1000,
            background: '#0a0a0a',
            borderBottom: '1px solid #222'
        }}>

            {/* Navigation Links */}
            <div className="nav-links" style={{
                display: 'flex',
                gap: '40px',
                flexWrap: 'wrap',
                justifyContent: 'center',
                marginBottom: isEventsPage ? '0' : '30px', // Reduce margin if no logo
                width: '100%',
                padding: '10px 0',
                borderBottom: '1px solid #1a1a1a'
            }}>
                <Link to="/" className="nav-link">Home</Link>
                <span className="text-gold nav-dot" aria-hidden="true">•</span>
                <Link to="/events" className="nav-link">What’s On</Link>
                <span className="text-gold nav-dot" aria-hidden="true">•</span>
                <Link to="/whisky" className="nav-link">Whisky List</Link>
                <span className="text-gold nav-dot" aria-hidden="true">•</span>
                <Link to="/drinks" className="nav-link">Drinks Menu</Link>
                <span className="text-gold nav-dot" aria-hidden="true">•</span>
                <Link to="/bookdillon" className="nav-link">Venue Hire</Link>
                <span className="text-gold nav-dot" aria-hidden="true">•</span>
                <Link to="/play" className="nav-link nav-cta">Want to gig at Dillon?</Link>
            </div>

            {/* Logo Container - Larger - HIDDEN ON EVENTS PAGE */}
            {!isEventsPage && (
                <div>
                    <Link to="/">
                        <img src={logo} alt="Dillon Whiskey Bar" width="707" height="1000" fetchpriority="high" className="nav-logo" style={{
                            width: 'auto',
                            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))',
                            transition: 'transform 0.3s'
                        }}
                            onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
                            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                        />
                    </Link>
                </div>
            )}

            <style>{`
        .nav-link {
            font-family: var(--font-heading);
            color: var(--color-gold);
            text-transform: uppercase;
            font-size: 18px; 
            letter-spacing: 1px;
            text-decoration: none;
            padding-bottom: 5px;
            border-bottom: 2px solid transparent;
            transition: color 0.3s, border-color 0.3s, text-shadow 0.3s;
        }
        .nav-link:hover {
            color: #fff;
            border-bottom: 2px solid var(--color-gold);
            text-shadow: 0 0 10px rgba(200, 155, 60, 0.5);
        }
        .nav-links { align-items: center; }
        .nav-cta {
            color: #0a0a0a;
            background: var(--color-gold);
            padding: 6px 14px;
            margin: -8px 0;
            border: 2px solid var(--color-gold);
            border-bottom: 2px solid var(--color-gold);
        }
        .nav-cta:hover {
            color: #0a0a0a;
            background: #e0b35a;
            border-color: #e0b35a;
            text-shadow: none;
        }
        .nav-logo { height: min(500px, 55vh); }
        @media (max-width: 640px) {
            .nav-links { gap: 14px 22px !important; padding: 10px 16px !important; margin-bottom: 16px !important; }
            .nav-link { font-size: 15px; }
            .nav-dot { display: none; }
            .nav-logo { height: min(260px, 32vh); }
        }
      `}</style>
        </nav>
    );
};

export default Navbar;
