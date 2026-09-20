import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta, EMAIL, PHONE, PHONE_HREF } from '../utils/seo';

const EVENT_TYPES = ['Private party', 'Company event', 'Birthday', 'Other'];

const field = {
    width: '100%',
    padding: '12px 14px',
    background: '#111',
    border: '1px solid #333',
    color: '#f0e6cc',
    fontSize: '16px',
    fontFamily: 'var(--font-body)',
    boxSizing: 'border-box',
};
const labelStyle = { display: 'block', color: '#c89b3c', fontSize: '12px', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '6px' };

const BookDillon = () => {
    usePageMeta({
        title: 'Book Dillon',
        path: '/bookdillon',
        description: 'Book Dillon Whiskey Bar in Reykjavík for a private party or company event. Tell us the date, group size and what you have in mind.',
    });

    const [form, setForm] = useState({ name: '', email: '', phone: '', date: '', guests: '', type: EVENT_TYPES[0], message: '' });
    const [copied, setCopied] = useState(false);
    const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const subject = `Booking request: ${form.type}${form.date ? ` on ${form.date}` : ''}`;
    const body = [
        `Name: ${form.name}`,
        `Email: ${form.email}`,
        `Phone: ${form.phone}`,
        `Type of event: ${form.type}`,
        `Date: ${form.date}`,
        `Number of guests: ${form.guests}`,
        '',
        form.message,
    ].join('\n');
    const mailto = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(`To: ${EMAIL}\nSubject: ${subject}\n\n${body}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) { /* clipboard unavailable */ }
    };

    return (
        <div style={{ padding: '40px 20px 100px', backgroundColor: '#000', color: '#fff' }}>
            <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h1 className="text-gold" style={{ fontSize: 'clamp(36px, 6vw, 56px)', marginBottom: '16px', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '3px' }}>Book Dillon</h1>
                    <p style={{ fontSize: '18px', lineHeight: 1.7, color: '#ccc', margin: '0 auto', maxWidth: '560px' }}>
                        Private parties and company events. Fill in the details below and we get back to you within a day or two.
                        Or just call us on <a href={PHONE_HREF} className="text-gold">{PHONE}</a>.
                    </p>
                    {process.env.REACT_APP_PLAY_HIDDEN !== '1' && (
                        <p style={{ color: '#999', fontSize: '15px', marginTop: '16px' }}>
                            A band or artist looking for a gig? <Link to="/play" className="text-gold">Apply at Play at Dillon</Link>.
                        </p>
                    )}
                </div>

                <form
                    onSubmit={(e) => { e.preventDefault(); window.location.href = mailto; }}
                    style={{ display: 'grid', gap: '20px', border: '1px solid var(--color-gold)', padding: 'clamp(24px, 5vw, 48px)', background: 'rgba(20, 20, 20, 0.8)' }}
                >
                    <div className="book-grid">
                        <div>
                            <label htmlFor="bk-name" style={labelStyle}>Your name</label>
                            <input id="bk-name" name="name" type="text" required autoComplete="name" style={field} value={form.name} onChange={update('name')} />
                        </div>
                        <div>
                            <label htmlFor="bk-email" style={labelStyle}>Email</label>
                            <input id="bk-email" name="email" type="email" required autoComplete="email" spellCheck="false" style={field} value={form.email} onChange={update('email')} />
                        </div>
                        <div>
                            <label htmlFor="bk-phone" style={labelStyle}>Phone</label>
                            <input id="bk-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" style={field} value={form.phone} onChange={update('phone')} />
                        </div>
                        <div>
                            <label htmlFor="bk-type" style={labelStyle}>Type of event</label>
                            <select id="bk-type" name="type" style={{ ...field, backgroundColor: '#111', color: '#f0e6cc' }} value={form.type} onChange={update('type')}>
                                {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="bk-date" style={labelStyle}>Preferred date</label>
                            <input id="bk-date" name="date" type="date" required style={field} value={form.date} onChange={update('date')} />
                        </div>
                        <div>
                            <label htmlFor="bk-guests" style={labelStyle}>Number of guests</label>
                            <input id="bk-guests" name="guests" type="number" min="1" inputMode="numeric" placeholder="e.g. 40" style={field} value={form.guests} onChange={update('guests')} />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="bk-message" style={labelStyle}>Tell us about the event</label>
                        <textarea id="bk-message" name="message" rows="5" placeholder="Band name, timing, food or drinks package, anything we should know…" style={{ ...field, resize: 'vertical' }} value={form.message} onChange={update('message')} />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button type="submit" className="btn btn-primary">Send Request</button>
                        <button type="button" onClick={copy} className="btn btn-outline">{copied ? 'Copied' : 'Copy as Text'}</button>
                        <span style={{ color: '#777', fontSize: '14px' }}>Opens your email app addressed to {EMAIL}</span>
                    </div>
                </form>

                <style>{`
                    .book-grid { display: grid; gap: 20px; }
                    @media (min-width: 640px) { .book-grid { grid-template-columns: 1fr 1fr; } }
                `}</style>
            </div>
        </div>
    );
};

export default BookDillon;
