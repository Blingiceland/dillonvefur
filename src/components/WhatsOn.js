import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fetchEvents } from '../utils/googleSheet';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// Horizontal month-by-month schedule strip on the home page.
const WhatsOn = () => {
    const [allEvents, setAllEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef(null);

    useEffect(() => {
        const loadEvents = async () => {
            const data = await fetchEvents();
            setAllEvents(data);
            setLoading(false);
        };
        loadEvents();
    }, []);

    // Callback ref for auto-scroll — fires when the anchor card mounts
    const anchorCallback = (node) => {
        if (node && scrollRef.current) {
            requestAnimationFrame(() => {
                const container = scrollRef.current;
                if (!container) return;
                const containerRect = container.getBoundingClientRect();
                const cardRect = node.getBoundingClientRect();
                const currentScroll = container.scrollLeft;
                const targetScroll = currentScroll + (cardRect.left - containerRect.left) - containerRect.width / 2 + cardRect.width / 2;
                container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'auto' });
            });
        }
    };

    const groupedByMonth = allEvents.reduce((groups, evt) => {
        const key = `${evt.dateObj.getFullYear()}-${evt.dateObj.getMonth()}`;
        if (!groups[key]) {
            groups[key] = {
                label: `${MONTH_NAMES[evt.dateObj.getMonth()]} ${evt.dateObj.getFullYear()}`,
                events: []
            };
        }
        groups[key].events.push(evt);
        return groups;
    }, {});

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstUpcomingIndex = allEvents.findIndex(e => e.dateObj >= today);

    return (
        <div className="whatson-wrap" id="whatson">
            <div className="whatson-header-bar">
                <h2>Schedule</h2>
                <p>Swipe sideways to see every event</p>
            </div>

            <div className="whatson-hscroll gold-scrollbar" ref={scrollRef}>
                {loading ? (
                    <div className="whatson-loading">Loading schedule…</div>
                ) : allEvents.length === 0 ? (
                    <div className="whatson-empty">No events scheduled yet.</div>
                ) : (
                    Object.values(groupedByMonth).map((group, gi) => (
                        <div className="whatson-month-col" key={gi}>
                            <div className="whatson-month-label">{group.label}</div>
                            <div className="whatson-cards-row">
                                {group.events.map((evt) => {
                                    const evtDate = new Date(evt.dateObj);
                                    evtDate.setHours(0, 0, 0, 0);
                                    const isPast = evtDate < today;
                                    const isToday = evtDate.getTime() === today.getTime();
                                    const globalIdx = allEvents.indexOf(evt);
                                    const isAnchor = globalIdx === firstUpcomingIndex;

                                    const dayName = new Intl.DateTimeFormat('en-GB', { weekday: 'short' })
                                        .format(evt.dateObj).toUpperCase();

                                    const classList = [
                                        'whatson-card',
                                        isPast ? 'past' : '',
                                        isToday ? 'today' : ''
                                    ].filter(Boolean).join(' ');

                                    return (
                                        <Link
                                            key={evt.id}
                                            to={`/events/${evt.slug}`}
                                            className={classList}
                                            ref={isAnchor ? anchorCallback : null}
                                            aria-label={`${evt.title}, ${dayName} ${evt.dayNum} at ${evt.time}`}
                                        >
                                            <div className="whatson-card-date">
                                                <span className="whatson-card-daynum">{evt.dayNum}</span>
                                                <span className="whatson-card-dayname">{dayName}</span>
                                            </div>
                                            <div className="whatson-card-title">{evt.title}</div>
                                            <div className="whatson-card-time">{evt.time}</div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default WhatsOn;
