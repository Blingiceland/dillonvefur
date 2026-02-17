import React, { useState, useEffect, useRef } from 'react';

const eventsData = [
    // February
    { date: '2026-02-18', title: 'The Omens opin æfing (Oliver)' },
    { date: '2026-02-19', title: 'Blues: Lame Dudes' },
    { date: '2026-02-20', title: 'Ívar Andri (Haukur)' },
    { date: '2026-02-21', title: 'Drápa' },
    { date: '2026-02-26', title: 'Saktmóðigur with Bastard - Útgáfutónleikar' },
    { date: '2026-02-27', title: 'Guitar Gods' },
    { date: '2026-02-28', title: 'Ásbjörn Waage & the Omens (Oliver) ásamt Svörtum Tekjum & Cloud Cinema' },

    // March
    { date: '2026-03-05', title: 'Blues: Beggi Smari' },
    { date: '2026-03-06', title: 'Svalbarði' },
    { date: '2026-03-07', title: "80's Night" },
    { date: '2026-03-12', title: 'Blues: Beggi Smari' },
    { date: '2026-03-13', title: 'GG blús' },
    { date: '2026-03-14', title: 'Rót' },
    { date: '2026-03-19', title: 'Blues: Beggi Smari' },
    { date: '2026-03-20', title: 'Dánarfregnir (Haukur)' },
    { date: '2026-03-21', title: 'Ungfrúin góða og búsið' },
    { date: '2026-03-26', title: 'Blues: Beggi Smari' },
    { date: '2026-03-27', title: 'Litli matjurtagarðurinn' },
    { date: '2026-03-28', title: 'Harma' },
];

const WhatsOn = () => {
    const [currentDate, setCurrentDate] = useState(new Date('2026-02-01'));
    const [displayEvents, setDisplayEvents] = useState([]);
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let monthEvents = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(year, month, day);

            // Manually construct YYYY-MM-DD to avoid timezone issues
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday

            const specificEvent = eventsData.find(e => e.date === dateStr);
            const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

            if (specificEvent || isWeekend) {
                const dayName = new Intl.DateTimeFormat('is-IS', { weekday: 'short' }).format(dateObj);
                const dayNum = dateObj.getDate();

                let concerts = [];
                let djEvent = null;

                if (specificEvent) {
                    concerts.push({
                        time: '21:00',
                        title: specificEvent.title,
                        isHighlight: true
                    });
                }

                if (isWeekend) {
                    djEvent = {
                        time: 'Miðnætti',
                        title: 'DJ Andrea Jóns',
                        isHighlight: false,
                        subtext: 'Party until 03:00'
                    };
                }

                monthEvents.push({
                    dayName: dayName.toUpperCase(),
                    dayNum: dayNum,
                    concerts: concerts,
                    djEvent: djEvent
                });
            }
        }

        setDisplayEvents(monthEvents);

        // Reset scroll when month changes
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = 0;
        }

    }, [currentDate]);

    const changeMonth = (offset) => {
        const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + offset));
        setCurrentDate(new Date(newDate));
    };

    const monthName = new Intl.DateTimeFormat('is-IS', { month: 'long', year: 'numeric' }).format(currentDate).toUpperCase();

    return (
        <div style={{
            padding: '60px 0',
            background: '#111',
            color: '#fff',
            borderTop: '1px solid #222',
            borderBottom: '1px solid #222'
        }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>

                {/* Header & Navigation */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '30px',
                    gap: '8px'
                }}>
                    <button
                        onClick={() => changeMonth(-1)}
                        style={{
                            background: 'transparent',
                            border: '1px solid #444',
                            color: 'var(--color-gold)',
                            fontSize: '13px',
                            cursor: 'pointer',
                            padding: '8px 14px',
                            borderRadius: '20px',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.borderColor = 'var(--color-gold)';
                            e.target.style.background = 'rgba(212, 163, 63, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.borderColor = '#444';
                            e.target.style.background = 'transparent';
                        }}
                    >
                        &#9664; Prev
                    </button>

                    <h2 style={{
                        fontSize: 'clamp(18px, 5vw, 36px)',
                        color: 'var(--color-gold)',
                        margin: '0',
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        textShadow: '0 0 10px rgba(212, 163, 63, 0.2)',
                        flex: 1,
                        minWidth: 0
                    }}>
                        {monthName}
                    </h2>

                    <button
                        onClick={() => changeMonth(1)}
                        style={{
                            background: 'transparent',
                            border: '1px solid #444',
                            color: 'var(--color-gold)',
                            fontSize: '13px',
                            cursor: 'pointer',
                            padding: '8px 14px',
                            borderRadius: '20px',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.borderColor = 'var(--color-gold)';
                            e.target.style.background = 'rgba(212, 163, 63, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.borderColor = '#444';
                            e.target.style.background = 'transparent';
                        }}
                    >
                        Next &#9654;
                    </button>
                </div>

                {/* Horizontal Events Scroll */}
                <div
                    ref={scrollContainerRef}
                    style={{
                        display: 'flex',
                        gap: '20px',
                        overflowX: 'auto',
                        paddingBottom: '30px', // More space for scrollbar
                        scrollBehavior: 'smooth',
                        WebkitOverflowScrolling: 'touch',
                        padding: '10px 0 30px 0'
                    }}
                    className="gold-scrollbar"
                >
                    {displayEvents.length > 0 ? (
                        displayEvents.map((day, index) => (
                            <div key={index} style={{
                                minWidth: '280px',
                                maxWidth: '280px',
                                minHeight: '320px', // Min-height to ensure alignment
                                background: '#1a1a1a',
                                border: '1px solid #333',
                                padding: '25px',
                                display: 'flex',
                                flexDirection: 'column',
                                flexShrink: 0,
                                position: 'relative'
                            }}>
                                {/* Date Badge */}
                                <div style={{
                                    marginBottom: '20px',
                                    borderBottom: '2px solid var(--color-gold)',
                                    paddingBottom: '10px',
                                    width: '100%'
                                }}>
                                    <span style={{
                                        fontSize: '36px',
                                        fontWeight: 'bold',
                                        color: '#fff',
                                        lineHeight: '1',
                                        marginRight: '10px'
                                    }}>
                                        {day.dayNum}
                                    </span>
                                    <span style={{
                                        fontSize: '16px',
                                        color: 'var(--color-gold)',
                                        textTransform: 'uppercase',
                                        fontWeight: 'bold'
                                    }}>
                                        {day.dayName}
                                    </span>
                                </div>

                                {/* Concerts Section - Grows to push DJ to bottom */}
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '20px',
                                    width: '100%',
                                    flexGrow: 1,
                                    marginBottom: '20px'
                                }}>
                                    {day.concerts.map((item, i) => (
                                        <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{
                                                fontSize: '12px',
                                                color: '#888',
                                                marginBottom: '4px',
                                                fontFamily: 'monospace'
                                            }}>
                                                {item.time}
                                            </span>
                                            <span style={{
                                                fontSize: '18px',
                                                color: '#fff',
                                                fontWeight: '600',
                                                lineHeight: '1.3'
                                            }}>
                                                {item.title}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* DJ Section - Always at bottom */}
                                {day.djEvent && (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        marginTop: 'auto',
                                        paddingTop: '15px',
                                        borderTop: '1px dashed #333'
                                    }}>
                                        <span style={{
                                            fontSize: '12px',
                                            color: '#888',
                                            marginBottom: '4px',
                                            fontFamily: 'monospace'
                                        }}>
                                            {day.djEvent.time}
                                        </span>
                                        <span style={{
                                            fontSize: '16px',
                                            color: '#ccc',
                                            fontWeight: 'normal',
                                            lineHeight: '1.3'
                                        }}>
                                            {day.djEvent.title}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#666', width: '100%' }}>
                            Engir viðburðir skráðir í þessum mánuði.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WhatsOn;
