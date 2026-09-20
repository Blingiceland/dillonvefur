// Status transitions for applications and the emails that go with them.
import { sendEmail } from './email.mjs';

const ADMIN_EMAIL = () => process.env.ADMIN_EMAIL || 'dillon@dillon.is';
const SITE_URL = () => process.env.SITE_URL || 'https://www.dillon.is';

export const ACTIONS = {
    approve:       { from: ['submitted'],            to: 'approved'  },
    reject:        { from: ['submitted'],            to: 'rejected'  },
    played:        { from: ['approved'],             to: 'played'    },
    cancel:        { from: ['approved'],             to: 'cancelled' },
    withdraw:      { from: ['submitted', 'approved'], to: 'withdrawn' },
    mark_refunded: { from: null,                     to: null        }, // fee only
    add_note:      { from: null,                     to: null        },
};

export const canTransition = (action, status) => {
    const a = ACTIONS[action];
    if (!a) return false;
    return a.from === null || a.from.includes(status);
};

const pretty = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
};

const sign = ['', 'Dillon Whiskey Bar', 'Laugavegur 30, 101 Reykjavík', ADMIN_EMAIL()].join('\n');
const msg = (message) => (message ? `\n${message.trim()}\n` : '');

export const notifyBandApproved = (app, message) =>
    sendEmail({
        to: app.contact_email,
        replyTo: ADMIN_EMAIL(),
        subject: `You're on: ${app.band_name} at Dillon, ${pretty(app.confirmed_date)}`,
        text: [
            `Hi ${app.contact_name},`,
            '',
            `Good news. ${app.band_name} is booked to play at Dillon on ${pretty(app.confirmed_date)} at ${app.start_time || app.suggested_start_time}.`,
            msg(message),
            `The event page goes live within a few minutes: ${SITE_URL()}/events/${app.event_slug || ''}`,
            'Share it, tag us, and reply to this email if anything changes.',
            app.fee_status === 'paid' ? '\nYour booking fee is refunded right after the show.' : '',
            sign,
        ].join('\n'),
    });

export const notifyBandRejected = (app, message) =>
    sendEmail({
        to: app.contact_email,
        replyTo: ADMIN_EMAIL(),
        subject: `About your application, ${app.band_name} (${app.ref})`,
        text: [
            `Hi ${app.contact_name},`,
            '',
            `Thanks for applying to play at Dillon. We can't fit ${app.band_name} in this time.`,
            msg(message),
            app.fee_status === 'paid' ? 'Your booking fee is being refunded in full.\n' : '',
            'You are welcome to apply again for other dates.',
            sign,
        ].join('\n'),
    });

export const notifyBandCancelled = (app, message) =>
    sendEmail({
        to: app.contact_email,
        replyTo: ADMIN_EMAIL(),
        subject: `Change of plans: ${app.band_name} at Dillon on ${pretty(app.confirmed_date)}`,
        text: [
            `Hi ${app.contact_name},`,
            '',
            `We are sorry, but we have to cancel the show on ${pretty(app.confirmed_date)}.`,
            msg(message),
            app.fee_status === 'paid' ? 'Your booking fee is being refunded in full.\n' : '',
            'Reply to this email if you would like to look at another date.',
            sign,
        ].join('\n'),
    });

export const notifyBandRefunded = (app) =>
    sendEmail({
        to: app.contact_email,
        replyTo: ADMIN_EMAIL(),
        subject: `Booking fee refunded (${app.ref})`,
        text: [
            `Hi ${app.contact_name},`,
            '',
            `Your booking fee of ${app.fee_amount_isk.toLocaleString('en-GB').replace(/,/g, '.')} kr. has been refunded. It can take a few days to show on your card.`,
            sign,
        ].join('\n'),
    });
