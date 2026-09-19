import React from 'react';
import WhatsOn from '../components/WhatsOn';

import InfoSections from '../components/InfoSections';
import { usePageMeta } from '../utils/seo';

const Home = () => {
    usePageMeta({ path: '/' });

    return (
        <div style={{
            minHeight: '100vh',
            background: '#080808',
            paddingTop: '60px',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header Section */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h1 style={{
                    fontFamily: 'var(--font-heading, sans-serif)', // Fallback if var not loaded
                    fontSize: '48px',
                    color: 'var(--color-gold)',
                    textTransform: 'uppercase',
                    letterSpacing: '3px',
                    margin: '0'
                }}>
                    What's on at Dillon
                </h1>
            </div>

            {/* Schedule Section */}
            <div style={{ marginBottom: '60px' }}>
                <WhatsOn />
            </div>

            {/* Information Sections */}
            <InfoSections />
        </div>
    );
};

export default Home;
