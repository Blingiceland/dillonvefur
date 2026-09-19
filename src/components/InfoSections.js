import React from 'react';
import { Link } from 'react-router-dom';
import aboutImg from '../assets/andrea1.webp';
import musicImg from '../assets/live_music_new.webp';
import whiskyImg from '../assets/whisky_shelf.webp';

const Section = ({ title, text, image, imageAlt, imageLeft }) => {
    return (
        <div
            id={title === 'Whisky' ? 'whiskey' : undefined}
            className={`info-section ${imageLeft ? 'reverse' : ''}`}
        >
            <div className="info-text">
                <h2 style={{
                    fontSize: '48px',
                    color: 'var(--color-gold)',
                    marginBottom: '30px',
                    textTransform: 'uppercase'
                }}>{title}</h2>
                {text.map((p, i) => (
                    <p key={i} style={{
                        fontSize: '18px',
                        lineHeight: '1.6',
                        color: '#ccc',
                        marginBottom: '20px',
                        fontFamily: 'var(--font-body)'
                    }}>
                        {p}
                    </p>
                ))}
                {title === "Whisky" && (
                    <Link to="/whisky" className="btn btn-primary" style={{ marginTop: '20px' }}>
                        See the Whisky List
                    </Link>
                )}
            </div>
            <div className="info-image">
                <img src={image} alt={imageAlt} width="1600" height="1068" loading="lazy" decoding="async" />
            </div>
        </div>
    );
};

const InfoSections = () => {
    return (
        <div style={{ width: '100%', overflow: 'hidden' }}>
            <Section
                title="About Dillon"
                image={aboutImg}
                imageAlt="DJ Andrea behind the decks at Dillon"
                imageLeft={false}
                text={[
                    "Dillon is a place that keeps things simple. A bar where the music does the talking, the drinks are honest, and the atmosphere is shaped by the people who walk through the door. It doesn't try to be anything else — and never has.",
                    "The bar itself is built around whiskey. Dillon carries over 170 different whiskies from around the world, poured straight or mixed with care. Alongside the bottles, you'll find a focused selection of whiskey cocktails — simple, balanced, and made to let the spirit speak for itself.",
                    "Andrae Jóns is part of that foundation. She's not just a DJ — she's an Icelandic radio legend, with decades of experience behind the microphone. Her deep knowledge and instinct for the room shape the nights at Dillon with confidence and restraint. The music never takes over — it belongs there."
                ]}
            />
            <Section
                title="Live Music"
                image={musicImg}
                imageAlt="Live band playing on the top floor at Dillon"
                imageLeft={true}
                text={[
                    "Live music is a core part of Dillon. Most weekends feature live performances, with an emphasis on rock — loud guitars, real bands, and proper late-night energy — though other styles make an appearance from time to time.",
                    "Thursdays are blues night. Beggi Smári and his band play live every Thursday evening, a long-standing Dillon tradition.",
                    "DJ Andrea is Dillon's resident DJ, with guest DJs stepping in on selected nights.",
                    "For upcoming shows and weekly listings, check What's On for the full schedule."
                ]}
            />
            <Section
                title="Whisky"
                image={whiskyImg}
                imageAlt="The whisky shelf at Dillon with over 170 bottles"
                imageLeft={false}
                text={[
                    "With more than 170 whiskies always on the shelf, Dillon is built for both curious newcomers and seasoned drinkers. Our bartenders are trained to help you find a whiskey that suits your taste — whether you know exactly what you're looking for or you're just starting out.",
                    "We also host regular whiskey school sessions, held in English whenever needed. Ask at the bar or follow us on Instagram for upcoming dates."
                ]}
            />
        </div>
    );
};

export default InfoSections;
