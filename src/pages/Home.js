import React from 'react';
import NextUp from '../components/NextUp';
import WhatsOn from '../components/WhatsOn';
import InfoSections from '../components/InfoSections';
import { usePageMeta } from '../utils/seo';

const Home = () => {
    usePageMeta({ path: '/' });

    return (
        <div style={{
            minHeight: '100vh',
            background: '#080808',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <NextUp />

            <div style={{ marginBottom: '60px' }}>
                <WhatsOn />
            </div>

            <InfoSections />
        </div>
    );
};

export default Home;
