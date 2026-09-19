import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../utils/seo';

const NotFound = () => {
    usePageMeta({ title: 'Page Not Found', path: '/404' });

    // The static host answers 200 for unknown paths; tell search engines not to index them.
    useEffect(() => {
        const meta = document.createElement('meta');
        meta.name = 'robots';
        meta.content = 'noindex';
        document.head.appendChild(meta);
        return () => meta.remove();
    }, []);

    return (
        <div style={{ minHeight: '60vh', textAlign: 'center', padding: '80px 20px' }}>
            <h1 className="text-gold" style={{ fontSize: '48px', marginBottom: '16px' }}>Page Not Found</h1>
            <p style={{ color: '#ccc', fontSize: '18px', marginBottom: '32px' }}>
                That page doesn’t exist. The bar does.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/" className="btn btn-primary">Home</Link>
                <Link to="/events" className="btn btn-outline">What’s On</Link>
                <Link to="/whisky" className="btn btn-outline">Whisky List</Link>
            </div>
        </div>
    );
};

export default NotFound;
