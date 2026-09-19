import React, { useMemo } from 'react';
import { monthsInWindow, isInWindow, addDays } from '../../utils/bookingRules';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MAX_DATES = 3;

/** Days of one "YYYY-MM" month as ISO strings, plus the number of leading blanks (Monday-first). */
const monthDays = (ym) => {
    const [y, m] = ym.split('-').map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const lead = (first.getUTCDay() + 6) % 7;
    const days = [];
    let iso = `${ym}-01`;
    while (iso.startsWith(ym)) {
        days.push(iso);
        iso = addDays(iso, 1);
    }
    return { lead, days };
};

export const fetchAvailability = async () => {
    const res = await fetch('/api/availability');
    if (!res.ok) throw new Error(`availability ${res.status}`);
    return res.json();
};

/**
 * Month grids for the booking window. `value` is an ordered list of ISO dates
 * (first = preferred, then alternates). Clicking toggles a free date, up to MAX_DATES.
 */
const AvailabilityCalendar = ({ value = [], onChange, availability, loading, error }) => {
    const months = useMemo(() => (availability ? monthsInWindow(availability) : []), [availability]);
    const taken = useMemo(() => new Set(availability?.taken || []), [availability]);
    const requested = useMemo(() => new Set(availability?.requested || []), [availability]);
    const yearsOpen = useMemo(() => new Set(availability?.yearsOpen || []), [availability]);

    // Functional update so rapid clicks never work from a stale list (onChange is a React state setter).
    const toggle = (iso) => {
        onChange((prev) => {
            if (prev.includes(iso)) return prev.filter((d) => d !== iso);
            return prev.length < MAX_DATES ? [...prev, iso] : prev;
        });
    };

    const dayState = (iso) => {
        if (!isInWindow(iso, availability)) return 'closed';
        if (!yearsOpen.has(Number(iso.slice(0, 4)))) return 'notopen';
        if (taken.has(iso)) return 'taken';
        if (value.includes(iso)) return value[0] === iso ? 'preferred' : 'alternate';
        if (requested.has(iso)) return 'requested';
        return 'free';
    };

    if (loading) return <p className="text-gold" style={{ letterSpacing: '3px', textAlign: 'center' }} aria-live="polite">LOADING DATES…</p>;
    if (error) return <p style={{ color: '#e07b7b', textAlign: 'center' }}>Could not load the schedule. Please refresh the page or try again later.</p>;
    if (!availability) return null;

    const full = value.length >= MAX_DATES;

    return (
        <div className="cal">
            <div className="cal-legend" aria-hidden="true">
                <span><i className="cal-dot free" /> Free</span>
                <span><i className="cal-dot taken" /> Booked</span>
                <span><i className="cal-dot requested" /> Requested by another act</span>
                <span><i className="cal-dot preferred" /> Your pick</span>
            </div>

            <div className="cal-months">
                {months.map((ym) => {
                    const { lead, days } = monthDays(ym);
                    const [y, m] = ym.split('-').map(Number);
                    return (
                        <section key={ym} className="cal-month" aria-label={`${MONTH_NAMES[m - 1]} ${y}`}>
                            <h3 className="cal-month-title">{MONTH_NAMES[m - 1]} <span>{y}</span></h3>
                            <div className="cal-grid">
                                {WEEKDAYS.map((w) => <div key={w} className="cal-wd" aria-hidden="true">{w}</div>)}
                                {Array.from({ length: lead }).map((_, i) => <div key={`b${i}`} aria-hidden="true" />)}
                                {days.map((iso) => {
                                    const state = dayState(iso);
                                    const selectable = state === 'free' || state === 'requested' || state === 'preferred' || state === 'alternate';
                                    const disabled = !selectable || (full && !value.includes(iso));
                                    const label = {
                                        closed: 'Outside the booking window',
                                        notopen: 'Not open for booking yet',
                                        taken: 'Already booked',
                                        requested: 'Free, but another act has asked for this date',
                                        preferred: 'Your preferred date',
                                        alternate: 'Your alternate date',
                                        free: 'Free',
                                    }[state];
                                    return (
                                        <button
                                            key={iso}
                                            type="button"
                                            className={`cal-day ${state}`}
                                            disabled={disabled}
                                            aria-pressed={value.includes(iso)}
                                            aria-label={`${iso}: ${label}`}
                                            title={label}
                                            onClick={() => toggle(iso)}
                                        >
                                            {Number(iso.slice(8, 10))}
                                        </button>
                                    );
                                })}
                            </div>
                            {!yearsOpen.has(y) && <p className="cal-note">The {y} schedule is not open yet.</p>}
                        </section>
                    );
                })}
            </div>

            <style>{`
                .cal { --cal-line: #1e1e1e; }
                .cal-legend { display: flex; gap: 18px; flex-wrap: wrap; justify-content: center; color: #999; font-size: 13px; margin-bottom: 20px; }
                .cal-legend span { display: inline-flex; align-items: center; gap: 6px; }
                .cal-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; border: 1px solid #444; }
                .cal-dot.free { background: #161616; }
                .cal-dot.taken { background: #2a2a2a; border-color: #2a2a2a; }
                .cal-dot.requested { background: #161616; border-color: #c89b3c; }
                .cal-dot.preferred { background: #c89b3c; border-color: #c89b3c; }
                .cal-months { display: grid; gap: 28px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
                .cal-month-title { font-family: var(--font-heading); color: #f0e6cc; letter-spacing: 3px; text-transform: uppercase; font-size: 18px; margin: 0 0 10px; }
                .cal-month-title span { color: #666; margin-left: 6px; }
                .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
                .cal-wd { color: #666; font-size: 11px; letter-spacing: 1px; text-align: center; padding-bottom: 4px; }
                .cal-day { aspect-ratio: 1; border: 1px solid var(--cal-line); background: #161616; color: #e8dcc8; font-size: 14px; cursor: pointer; padding: 0; transition: border-color 0.15s, background-color 0.15s; }
                .cal-day:hover:not(:disabled) { border-color: #c89b3c; }
                .cal-day.closed, .cal-day.notopen { background: transparent; color: #3a3a3a; border-color: transparent; cursor: default; }
                .cal-day.taken { background: #0e0e0e; color: #444; text-decoration: line-through; cursor: not-allowed; }
                .cal-day.requested { border-color: #7a5f24; }
                .cal-day.preferred { background: #c89b3c; color: #0a0a0a; border-color: #c89b3c; font-weight: 600; }
                .cal-day.alternate { background: #3d2f12; color: #f0e6cc; border-color: #c89b3c; }
                .cal-day:disabled.free, .cal-day:disabled.requested { opacity: 0.35; cursor: not-allowed; }
                .cal-note { color: #666; font-size: 12px; margin: 8px 0 0; }
            `}</style>
        </div>
    );
};

export default AvailabilityCalendar;
