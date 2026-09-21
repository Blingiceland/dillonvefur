import React, { useMemo, useRef, useState } from 'react';
import { validateApplication, STEP_FIELDS, AUDIENCE_OPTIONS, BIO_MIN, LINK_HOSTS, START_TIMES } from '../../utils/applicationRules';
import { field, fieldError, labelStyle, hintStyle, errorStyle, sectionLabel } from '../formStyles';
import ImageUpload from './ImageUpload';
import { EMAIL } from '../../utils/seo';
import { playHeaders } from '../../utils/playAccess';

// Set REACT_APP_FEE_DISABLED=1 (with FEE_DISABLED=1 on the server) to run without the booking fee.
const FEE_DISABLED = process.env.REACT_APP_FEE_DISABLED === '1';

const STEPS = [
    { key: 'band', title: 'The Band' },
    { key: 'show', title: 'The Show' },
    { key: 'media', title: 'Photos' },
    { key: 'contact', title: 'Contact & Send' },
];

export const EMPTY = {
    band_name: '', genre: '', based_in: '', bio: '', previous_gigs: '', line_up: '', tech_needs: '', needs_sound_engineer: '', audience_estimate: '',
    spotify_url: '', youtube_url: '', soundcloud_url: '', bandcamp_url: '', instagram_url: '', facebook_url: '', website_url: '',
    entry_type: '', ticket_price_isk: '', ticket_url: '', suggested_start_time: '21:00',
    press_photo_path: '', poster_path: '',
    contact_name: '', contact_email: '', contact_phone: '', agreed: false,
};

const Field = ({ id, label, hint, error, children }) => (
    <div>
        <label htmlFor={id} style={labelStyle}>{label}</label>
        {children}
        {error ? <p style={errorStyle}>{error}</p> : hint ? <p style={hintStyle}>{hint}</p> : null}
    </div>
);

const Choice = ({ name, value, current, onChange, children }) => (
    <label style={{ padding: '10px 18px', border: `1px solid ${current === value ? '#c89b3c' : '#333'}`, background: current === value ? '#3d2f12' : '#111', color: '#f0e6cc', cursor: 'pointer' }}>
        <input type="radio" name={name} value={value} checked={current === value} onChange={onChange} style={{ marginRight: '8px' }} />
        {children}
    </label>
);

/**
 * Steps 2–5 of the application. `dates` (from the calendar) is validated with the rest.
 * New application: posts to /api/apply. Edit (band fixing things after "request changes"):
 * pass `edit={{ token, id, initial, ownDates, existing }}` and it posts to /api/apply/edit.
 * On success calls onSubmitted({ ref }).
 */
const ApplyForm = ({ dates, availability, onSubmitted, edit = null }) => {
    const [form, setForm] = useState(() => (edit ? { ...EMPTY, ...edit.initial, agreed: false } : EMPTY));
    const [step, setStep] = useState(0);
    const [touched, setTouched] = useState({});
    const [serverError, setServerError] = useState(null);
    const [sending, setSending] = useState(false);
    const startedAt = useRef(Date.now());
    const topRef = useRef(null);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e && e.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));
    const options = useMemo(() => (edit ? { existingId: edit.id, ownDates: edit.ownDates } : {}), [edit]);
    const { errors } = useMemo(() => validateApplication({ ...form, dates }, availability, options), [form, dates, availability, options]);
    const stepKey = STEPS[step].key;
    const stepErrors = STEP_FIELDS[stepKey].filter((k) => errors[k]);
    const show = (k) => (touched[k] || touched.__all) && errors[k];
    const inp = (k) => (show(k) ? fieldError : field);

    const next = () => {
        if (stepErrors.length) {
            setTouched((t) => ({ ...t, ...Object.fromEntries(STEP_FIELDS[stepKey].map((k) => [k, true])) }));
            return;
        }
        setStep((s) => Math.min(s + 1, STEPS.length - 1));
        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const submit = async (e) => {
        e.preventDefault();
        setServerError(null);
        setTouched({ __all: true });
        if (Object.keys(errors).length) {
            if (errors.dates) setServerError(errors.dates);
            return;
        }
        setSending(true);
        try {
            const res = await fetch(edit ? '/api/apply/edit' : '/api/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...playHeaders() },
                body: JSON.stringify({ ...form, dates, startedAt: startedAt.current, website_hp: form.website_hp || '', ...(edit ? { token: edit.token } : {}) }),
            });
            const data = await res.json();
            if (!res.ok) {
                setServerError(data.error || 'Something went wrong');
                if (data.errors && data.errors.dates) setServerError(data.errors.dates);
                return;
            }
            if (data.checkoutUrl) { window.location.href = data.checkoutUrl; return; }
            if (data.payUrl) { window.location.href = data.payUrl; return; }
            onSubmitted(data);
        } catch (err) {
            setServerError('Could not reach the server. Check your connection and try again.');
        } finally {
            setSending(false);
        }
    };

    const linkField = (type, placeholder) => (
        <Field key={type} id={`link-${type}`} label={LINK_HOSTS[type].label} error={show(`${type}_url`)}>
            <input id={`link-${type}`} type="url" inputMode="url" placeholder={placeholder} value={form[`${type}_url`]} onChange={set(`${type}_url`)} style={inp(`${type}_url`)} autoComplete="off" spellCheck="false" />
        </Field>
    );

    return (
        <form onSubmit={submit} noValidate ref={topRef} style={{ border: '1px solid var(--color-gold)', background: 'rgba(20, 20, 20, 0.8)', padding: 'clamp(20px, 5vw, 44px)', display: 'grid', gap: '28px' }}>
            <ol className="apply-steps" aria-label="Form steps">
                {STEPS.map((s, i) => (
                    <li key={s.key} className={i === step ? 'current' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}>
                        <span>{i + 2}</span> {s.title}
                    </li>
                ))}
            </ol>

            {dates.length === 0 && (
                <p style={{ ...errorStyle, margin: 0 }}>Pick your preferred date in the calendar above first.</p>
            )}

            {stepKey === 'band' && (
                <div style={{ display: 'grid', gap: '20px' }}>
                    <p style={sectionLabel}>Step 2 · The band</p>
                    <div className="apply-grid">
                        <Field id="band_name" label="Band or artist name" error={show('band_name')}>
                            <input id="band_name" value={form.band_name} onChange={set('band_name')} style={inp('band_name')} autoComplete="organization" />
                        </Field>
                        <Field id="genre" label="Genre" error={show('genre')} hint="Rock, blues, punk, indie, metal…">
                            <input id="genre" value={form.genre} onChange={set('genre')} style={inp('genre')} autoComplete="off" />
                        </Field>
                        <Field id="based_in" label="Based in" hint="Optional">
                            <input id="based_in" value={form.based_in} onChange={set('based_in')} style={field} autoComplete="off" />
                        </Field>
                        <Field id="audience_estimate" label="Expected audience" error={show('audience_estimate')} hint="Honest guess, it helps us plan the night">
                            <select id="audience_estimate" value={form.audience_estimate} onChange={set('audience_estimate')} style={{ ...inp('audience_estimate'), backgroundColor: '#111' }}>
                                <option value="">Choose…</option>
                                {AUDIENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </Field>
                    </div>
                    <Field id="bio" label="About the band" error={show('bio')} hint={`At least ${BIO_MIN} characters (${form.bio.trim().length} so far). We use this text for the event page if you get the gig.`}>
                        <textarea id="bio" rows="6" value={form.bio} onChange={set('bio')} style={{ ...inp('bio'), resize: 'vertical' }} placeholder="Who you are, what you sound like, what the night will be like…" />
                    </Field>
                    <div className="apply-grid">
                        <Field id="line_up" label="Line-up" error={show('line_up')} hint="Who plays what">
                            <textarea id="line_up" rows="3" value={form.line_up} onChange={set('line_up')} style={{ ...inp('line_up'), resize: 'vertical' }} />
                        </Field>
                        <Field id="previous_gigs" label="Previous gigs" hint="Optional. Venues, festivals, support slots">
                            <textarea id="previous_gigs" rows="3" value={form.previous_gigs} onChange={set('previous_gigs')} style={{ ...field, resize: 'vertical' }} />
                        </Field>
                    </div>

                    <div>
                        <p style={{ ...sectionLabel, marginTop: '8px' }}>Where can we listen?</p>
                        {show('listen') && <p style={errorStyle}>{errors.listen}</p>}
                        <div className="apply-grid">
                            {linkField('spotify', 'https://open.spotify.com/artist/…')}
                            {linkField('youtube', 'https://youtube.com/watch?v=…')}
                            {linkField('soundcloud', 'https://soundcloud.com/…')}
                            {linkField('bandcamp', 'https://yourband.bandcamp.com')}
                        </div>
                    </div>
                    <div>
                        <p style={{ ...sectionLabel, marginTop: '8px' }}>Social media <span style={{ color: '#666', letterSpacing: 0, textTransform: 'none' }}>(optional, used to promote the show)</span></p>
                        <div className="apply-grid">
                            {linkField('instagram', 'https://instagram.com/…')}
                            {linkField('facebook', 'https://facebook.com/…')}
                            {linkField('website', 'https://…')}
                        </div>
                    </div>
                </div>
            )}

            {stepKey === 'show' && (
                <div style={{ display: 'grid', gap: '20px' }}>
                    <p style={sectionLabel}>Step 3 · The show</p>
                    <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                        <legend style={labelStyle}>Entry</legend>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <Choice name="entry_type" value="free" current={form.entry_type} onChange={set('entry_type')}>Free entry</Choice>
                            <Choice name="entry_type" value="ticketed" current={form.entry_type} onChange={set('entry_type')}>Ticketed</Choice>
                        </div>
                        {show('entry_type') && <p style={errorStyle}>{errors.entry_type}</p>}
                    </fieldset>
                    {form.entry_type === 'ticketed' && (
                        <div className="apply-grid">
                            <Field id="ticket_price_isk" label="Ticket price (ISK)" error={show('ticket_price_isk')} hint="Between 500 and 20.000 kr.">
                                <input id="ticket_price_isk" type="number" inputMode="numeric" min="500" max="20000" step="100" value={form.ticket_price_isk} onChange={set('ticket_price_isk')} style={inp('ticket_price_isk')} />
                            </Field>
                            <Field id="ticket_url" label="Ticket link" error={show('ticket_url')} hint="Optional, if tickets are already on sale (tix.is etc.)">
                                <input id="ticket_url" type="url" inputMode="url" value={form.ticket_url} onChange={set('ticket_url')} style={inp('ticket_url')} autoComplete="off" />
                            </Field>
                        </div>
                    )}
                    <div className="apply-grid">
                        <Field id="suggested_start_time" label="Suggested start time" error={show('suggested_start_time')} hint="Most shows start at 21:00">
                            <select id="suggested_start_time" value={form.suggested_start_time} onChange={set('suggested_start_time')} style={{ ...inp('suggested_start_time'), backgroundColor: '#111' }}>
                                {START_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </Field>
                        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                            <legend style={labelStyle}>Do you need a sound engineer from us?</legend>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <Choice name="needs_sound_engineer" value="yes" current={form.needs_sound_engineer} onChange={set('needs_sound_engineer')}>Yes, please</Choice>
                                <Choice name="needs_sound_engineer" value="no" current={form.needs_sound_engineer} onChange={set('needs_sound_engineer')}>No, we bring our own</Choice>
                            </div>
                            {show('needs_sound_engineer') ? <p style={errorStyle}>{errors.needs_sound_engineer}</p> : <p style={hintStyle}>We can provide one; the cost is agreed before the show.</p>}
                        </fieldset>
                    </div>
                    <Field id="tech_needs" label="Technical needs" error={show('tech_needs')} hint="Backline, DI boxes, number of vocal mics, anything unusual. Write “nothing special” if that is the case.">
                        <textarea id="tech_needs" rows="3" value={form.tech_needs} onChange={set('tech_needs')} style={{ ...inp('tech_needs'), resize: 'vertical' }} />
                    </Field>
                </div>
            )}

            {stepKey === 'media' && (
                <div style={{ display: 'grid', gap: '20px' }}>
                    <p style={sectionLabel}>Step 4 · Photos</p>
                    {edit && <p style={hintStyle}>Your current photos are kept unless you upload new ones.</p>}
                    <ImageUpload kind="press_photo" label="Press photo" required hint="A good photo of the band. JPG, PNG or WebP, under 8 MB. Landscape works best." value={form.press_photo_path} onChange={set('press_photo_path')} error={show('press_photo_path')} existingUrl={edit?.existing?.press_photo_url} />
                    <ImageUpload kind="poster" label="Poster" hint="If you already have a poster for the night. Otherwise we use the press photo." value={form.poster_path} onChange={set('poster_path')} error={show('poster_path')} existingUrl={edit?.existing?.poster_url} />
                </div>
            )}

            {stepKey === 'contact' && (
                <div style={{ display: 'grid', gap: '20px' }}>
                    <p style={sectionLabel}>Step 5 · Contact</p>
                    <div className="apply-grid">
                        <Field id="contact_name" label="Your name" error={show('contact_name')}>
                            <input id="contact_name" value={form.contact_name} onChange={set('contact_name')} style={inp('contact_name')} autoComplete="name" />
                        </Field>
                        <Field id="contact_email" label="Email" error={show('contact_email')}>
                            <input id="contact_email" type="email" value={form.contact_email} onChange={set('contact_email')} style={inp('contact_email')} autoComplete="email" spellCheck="false" />
                        </Field>
                        <Field id="contact_phone" label="Phone" error={show('contact_phone')}>
                            <input id="contact_phone" type="tel" inputMode="tel" value={form.contact_phone} onChange={set('contact_phone')} style={inp('contact_phone')} autoComplete="tel" />
                        </Field>
                    </div>

                    {/* Honeypot: hidden from people, filled by bots */}
                    <div style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }} aria-hidden="true">
                        <label htmlFor="website_hp">Leave this empty</label>
                        <input id="website_hp" name="website_hp" type="text" tabIndex="-1" autoComplete="off" value={form.website_hp || ''} onChange={set('website_hp')} />
                    </div>

                    <div style={{ border: '1px solid #2a2a2a', padding: '16px', color: '#bbb', fontSize: '14px', lineHeight: 1.6 }}>
                        <p style={{ margin: '0 0 10px', color: '#c89b3c', letterSpacing: '2px', fontSize: '12px', textTransform: 'uppercase' }}>How it works</p>
                        <ul style={{ margin: 0, paddingLeft: '18px' }}>
                            <li>We listen to every application and reply by email, usually within 2–3 days.</li>
                            {!FEE_DISABLED && <li>A booking fee of 10.000 kr. is paid by card when you send the application. It is refunded in full right after your show, or immediately if we cannot fit you in. Unpaid applications are not reviewed.</li>}
                            <li>If we say yes, the event goes on dillon.is and our social media using the text and photos you send here.</li>
                            <li>Dillon may decline an application without giving a reason.</li>
                        </ul>
                    </div>
                    <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', color: '#e8dcc8', cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.agreed} onChange={set('agreed')} style={{ marginTop: '4px' }} />
                        <span>I have read the above and the details I am sending are correct.</span>
                    </label>
                    {show('agreed') && <p style={{ ...errorStyle, marginTop: '-12px' }}>{errors.agreed}</p>}
                </div>
            )}

            {serverError && <p role="alert" style={{ ...errorStyle, fontSize: '15px', margin: 0 }}>{serverError}</p>}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <button type="button" className="btn btn-outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} style={{ visibility: step === 0 ? 'hidden' : 'visible' }}>Back</button>
                {step < STEPS.length - 1 ? (
                    <button type="button" className="btn btn-primary" onClick={next}>Continue</button>
                ) : (
                    <button type="submit" className="btn btn-primary" disabled={sending}>{sending ? 'Sending…' : edit ? 'Send Updated Application' : FEE_DISABLED ? 'Send Application' : 'Send & Pay Booking Fee'}</button>
                )}
            </div>
            <p style={{ ...hintStyle, textAlign: 'right', margin: 0 }}>Questions? Email <a href={`mailto:${EMAIL}`} className="text-gold">{EMAIL}</a></p>

            <style>{`
                .apply-steps { list-style: none; margin: 0; padding: 0; display: flex; gap: 8px 22px; flex-wrap: wrap; }
                .apply-steps li { color: #666; font-family: var(--font-heading); letter-spacing: 2px; text-transform: uppercase; font-size: 13px; display: inline-flex; align-items: center; gap: 8px; }
                .apply-steps li span { width: 24px; height: 24px; border-radius: 50%; border: 1px solid #444; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; }
                .apply-steps li.current { color: #f0e6cc; }
                .apply-steps li.current span { background: #c89b3c; color: #0a0a0a; border-color: #c89b3c; }
                .apply-steps li.done { color: #c89b3c; }
                .apply-steps li.done span { border-color: #c89b3c; }
                .apply-grid { display: grid; gap: 20px; }
                @media (min-width: 640px) { .apply-grid { grid-template-columns: 1fr 1fr; } }
            `}</style>
        </form>
    );
};

export default ApplyForm;
