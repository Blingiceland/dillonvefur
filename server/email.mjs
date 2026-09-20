// Transactional email through Resend's REST API. Without RESEND_API_KEY the message is
// logged instead of sent, so everything else can be exercised locally.
const SITE_URL = () => process.env.SITE_URL || 'https://www.dillon.is';
const ADMIN_EMAIL = () => process.env.ADMIN_EMAIL || 'dillon@dillon.is';
const FROM = () => process.env.EMAIL_FROM || 'Dillon Whiskey Bar <bookings@dillon.is>';

export const sendEmail = async ({ to, subject, text, replyTo }) => {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
        console.log(`[email not sent: no RESEND_API_KEY]\nTo: ${to}\nSubject: ${subject}\n\n${text}\n`);
        return { skipped: true };
    }
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM(), to: [to], subject, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    return res.json();
};

const pretty = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
};

const datesText = (app) =>
    [app.preferred_date, app.alt_date_1, app.alt_date_2].filter(Boolean).map((d, i) => `${i === 0 ? 'Preferred' : `Alternate ${i}`}: ${pretty(d)}`).join('\n');

const listenText = (app) =>
    [['Spotify', app.spotify_url], ['YouTube', app.youtube_url], ['SoundCloud', app.soundcloud_url], ['Bandcamp', app.bandcamp_url]]
        .filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n');

const summary = (app) => [
    datesText(app),
    '',
    `Genre: ${app.genre}`,
    `Start: ${app.suggested_start_time}`,
    `Entry: ${app.entry_type === 'free' ? 'Free' : `${app.ticket_price_isk} kr.`}`,
    `Expected audience: ${app.audience_estimate.replace('_', '–').replace('under', 'under ').replace('over', 'over ')}`,
    `Sound engineer needed: ${app.needs_sound_engineer === 'yes' ? 'Yes' : 'No'}`,
    `Technical needs: ${app.tech_needs || '-'}`,
    '',
    listenText(app),
    '',
    `Contact: ${app.contact_name} · ${app.contact_email} · ${app.contact_phone}`,
    '',
    `Review it here: ${SITE_URL()}/admin/${app.id}`,
    `Reference: ${app.ref}`,
];

export const notifyAdminNewApplication = (app) =>
    sendEmail({
        to: ADMIN_EMAIL(),
        replyTo: app.contact_email,
        subject: `New gig application: ${app.band_name} (${pretty(app.preferred_date)})`,
        text: [`${app.band_name} wants to play at Dillon.`, '', ...summary(app)].join('\n'),
    });

export const notifyAdminUpdatedApplication = (app) =>
    sendEmail({
        to: ADMIN_EMAIL(),
        replyTo: app.contact_email,
        subject: `Updated application: ${app.band_name} (${app.ref})`,
        text: [`${app.band_name} sent an updated application after your request for changes.`, '', ...summary(app)].join('\n'),
    });

export const notifyBandReceived = (app) =>
    sendEmail({
        to: app.contact_email,
        replyTo: ADMIN_EMAIL(),
        subject: `We got your application, ${app.band_name} (${app.ref})`,
        text: [
            `Hi ${app.contact_name},`,
            '',
            `Thanks for applying to play at Dillon. Your reference is ${app.ref}.`,
            '',
            datesText(app),
            '',
            'We listen to everything that comes in and usually reply within 2–3 days, 3 at the most.',
            'If your dates change in the meantime, just reply to this email.',
            '',
            'Dillon Whiskey Bar',
            'Laugavegur 30, 101 Reykjavík',
        ].join('\n'),
    });
