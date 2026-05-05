import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/6.png';

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
            <div style={{
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
                <span className="text-gold">•</span>
                <Link to="/events" className="nav-link">What’s On</Link>
                <span className="text-gold">•</span>
                <a href="https://bce3rd-eu.myshopify.com/" target="_blank" rel="noopener noreferrer" className="nav-link">Merchandise</a>
                <span className="text-gold">•</span>
                <Link to="/bookdillon" className="nav-link">Book Dillon</Link>
                <span className="text-gold">•</span>
                <Link to="/whisky" className="nav-link">Whisky List</Link>
                <span className="text-gold">•</span>
                <Link to="/drinks" className="nav-link">Drinks Menu</Link>
            </div>

            {/* Logo Container - Larger - HIDDEN ON EVENTS PAGE */}
            {!isEventsPage && (
                <div>
                    <Link to="/">
                        <img src={logo} alt="DILLON" style={{
                            height: '500px', // Increased from 300px to 500px
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
            transition: all 0.3s;
        }
        .nav-link:hover {
            color: #fff;
            border-bottom: 2px solid var(--color-gold);
            text-shadow: 0 0 10px rgba(200, 155, 60, 0.5);
        }
      `}</style>
        </nav>
    );
};

export default Navbar;
