// Validation for band applications. Runs in the browser (per step, friendly messages)
// and again in /api/apply and /api/apply/edit (the ones that count). No dependencies, no DOM.
import { isInWindow } from './bookingRules.js'; // extension needed: also imported by Node (api/)

export const BIO_MIN = 150;
export const BIO_MAX = 2000;
export const MAX_DATES = 3;
export const TICKET_MIN = 500;
export const TICKET_MAX = 20000;

export const AUDIENCE_OPTIONS = [
    { value: 'under_30', label: 'Under 30 people' },
    { value: '30_60', label: '30–60 people' },
    { value: '60_100', label: '60–100 people' },
    { value: 'over_100', label: 'Over 100 people' },
];

/** 24-hour start times offered in the form and in admin (17:00 to 23:30). */
export const START_TIMES = Array.from({ length: 14 }, (_, i) => {
    const h = 17 + Math.floor(i / 2);
    return `${String(h).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
});

export const LISTEN_LINKS = ['spotify', 'youtube', 'soundcloud', 'bandcamp'];
export const SOCIAL_LINKS = ['instagram', 'facebook', 'website'];

export const LINK_HOSTS = {
    spotify: { label: 'Spotify', hosts: ['open.spotify.com', 'spotify.link'] },
    youtube: { label: 'YouTube', hosts: ['youtube.com', 'youtu.be', 'music.youtube.com'] },
    soundcloud: { label: 'SoundCloud', hosts: ['soundcloud.com', 'on.soundcloud.com'] },
    bandcamp: { label: 'Bandcamp', hosts: ['bandcamp.com'] },
    instagram: { label: 'Instagram', hosts: ['instagram.com'] },
    facebook: { label: 'Facebook', hosts: ['facebook.com', 'fb.com', 'fb.me'] },
    website: { label: 'Website', hosts: null }, // any https host
};

const hostMatches = (host, allowed) => allowed.some((a) => host === a || host.endsWith(`.${a}`));

/** @returns {string|null} error message, or null when the link is acceptable (empty is acceptable) */
export const validateLink = (type, value) => {
    const v = String(value || '').trim();
    if (!v) return null;
    let url;
    try { url = new URL(v); } catch { return 'Enter a full link starting with https://'; }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'Enter a full link starting with https://';
    const spec = LINK_HOSTS[type];
    if (!spec) return 'Unknown link type';
    if (spec.hosts && !hostMatches(url.hostname.toLowerCase().replace(/^www\./, ''), spec.hosts)) {
        return `This does not look like a ${spec.label} link`;
    }
    return null;
};

const str = (v) => String(v ?? '').trim();
const nullable = (v) => (str(v) ? str(v) : null);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const INCOMING_RE = /^incoming\/[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$/;
const existingRe = (id) => new RegExp(`^applications/${id}/(press-photo|poster)\\.(jpg|jpeg|png|webp)$`);

export const makeRef = (uuid) => `DLN-${uuid.replace(/-/g, '').slice(0, 6).toUpperCase()}`;

/**
 * Validate and normalise a raw application (all strings, as posted by the form).
 * @param {object} input
 * @param {{from:string,to:string,taken:string[],yearsOpen:number[]}} availability
 * @param {{existingId?: string, ownDates?: string[]}} [options] - when editing: images already stored
 *        under applications/<existingId>/ are accepted, and the band's own dates do not count as taken
 * @returns {{errors: Record<string,string>, clean: object}}
 */
export const validateApplication = (input, availability, options = {}) => {
    const errors = {};
    const i = input || {};
    const own = new Set(options.ownDates || []);

    // dates
    const dates = Array.isArray(i.dates) ? i.dates.map(str).filter(Boolean) : [];
    if (dates.length === 0) errors.dates = 'Pick at least a preferred date';
    else if (dates.length > MAX_DATES) errors.dates = 'Pick at most three dates';
    else if (new Set(dates).size !== dates.length) errors.dates = 'Pick different dates';
    else {
        const taken = new Set(availability?.taken || []);
        const yearsOpen = new Set(availability?.yearsOpen || []);
        for (const d of dates) {
            if (!isInWindow(d, availability)) { errors.dates = `${d} is outside the booking window`; break; }
            if (!yearsOpen.has(Number(d.slice(0, 4)))) { errors.dates = `The ${d.slice(0, 4)} schedule is not open yet`; break; }
            if (taken.has(d) && !own.has(d)) { errors.dates = `${d} is already booked, please pick another date`; break; }
        }
    }

    // band
    if (!str(i.band_name)) errors.band_name = 'Band or artist name is required';
    else if (str(i.band_name).length > 80) errors.band_name = 'Keep the name under 80 characters';
    if (!str(i.genre)) errors.genre = 'Genre is required';
    const bio = str(i.bio);
    if (bio.length < BIO_MIN) errors.bio = `Tell us a bit more, at least ${BIO_MIN} characters (${bio.length} so far)`;
    else if (bio.length > BIO_MAX) errors.bio = `Keep the bio under ${BIO_MAX} characters`;
    if (!str(i.line_up)) errors.line_up = 'Who is in the band and what do they play?';
    if (!AUDIENCE_OPTIONS.some((o) => o.value === i.audience_estimate)) errors.audience_estimate = 'Pick an expected audience size';

    // links
    const links = {};
    for (const type of [...LISTEN_LINKS, ...SOCIAL_LINKS]) {
        const key = `${type}_url`;
        const err = validateLink(type, i[key]);
        if (err) errors[key] = err;
        links[key] = nullable(i[key]);
    }
    if (!LISTEN_LINKS.some((t) => links[`${t}_url`])) errors.listen = 'Add at least one link where we can listen to you';

    // the show
    const entry_type = i.entry_type === 'ticketed' ? 'ticketed' : i.entry_type === 'free' ? 'free' : null;
    if (!entry_type) errors.entry_type = 'Is it free entry or ticketed?';
    let ticket_price_isk = null;
    if (entry_type === 'ticketed') {
        const n = parseInt(String(i.ticket_price_isk).replace(/\D/g, ''), 10);
        if (isNaN(n)) errors.ticket_price_isk = 'Enter the ticket price in ISK';
        else if (n < TICKET_MIN || n > TICKET_MAX) errors.ticket_price_isk = `Ticket price should be between ${TICKET_MIN} and ${TICKET_MAX} kr.`;
        else ticket_price_isk = n;
    }
    const ticketErr = validateLink('website', i.ticket_url);
    if (ticketErr) errors.ticket_url = ticketErr;
    const suggested_start_time = str(i.suggested_start_time) || '21:00';
    if (!TIME_RE.test(suggested_start_time)) errors.suggested_start_time = 'Pick a start time';
    const needs_sound_engineer = i.needs_sound_engineer === 'yes' ? 'yes' : i.needs_sound_engineer === 'no' ? 'no' : null;
    if (!needs_sound_engineer) errors.needs_sound_engineer = 'Do you need a sound engineer from us?';
    if (!str(i.tech_needs)) errors.tech_needs = 'Tell us what you need on stage, or write "nothing special"';

    // contact
    if (!str(i.contact_name)) errors.contact_name = 'Contact name is required';
    if (!EMAIL_RE.test(str(i.contact_email))) errors.contact_email = 'Enter a valid email address';
    if (str(i.contact_phone).replace(/\D/g, '').length < 7) errors.contact_phone = 'Enter a phone number we can reach you on';

    // media: fresh uploads live under incoming/, kept images under applications/<id>/
    const pathOk = (p) => INCOMING_RE.test(p) || (options.existingId && existingRe(options.existingId).test(p));
    if (!pathOk(str(i.press_photo_path))) errors.press_photo_path = 'Upload a press photo of the band';
    if (str(i.poster_path) && !pathOk(str(i.poster_path))) errors.poster_path = 'Poster upload failed, try again';

    if (i.agreed !== true) errors.agreed = 'Please agree to the terms';

    const clean = {
        preferred_date: dates[0] || null,
        alt_date_1: dates[1] || null,
        alt_date_2: dates[2] || null,
        band_name: str(i.band_name),
        genre: str(i.genre),
        based_in: nullable(i.based_in),
        bio,
        previous_gigs: nullable(i.previous_gigs),
        line_up: str(i.line_up),
        tech_needs: str(i.tech_needs),
        needs_sound_engineer,
        audience_estimate: i.audience_estimate,
        ...links,
        entry_type,
        ticket_price_isk,
        ticket_url: nullable(i.ticket_url),
        suggested_start_time,
        contact_name: str(i.contact_name),
        contact_email: str(i.contact_email).toLowerCase(),
        contact_phone: str(i.contact_phone),
        press_photo_path: str(i.press_photo_path),
        poster_path: nullable(i.poster_path),
    };

    return { errors, clean };
};

/** Field names that belong to each form step, for per-step validation in the browser. */
export const STEP_FIELDS = {
    dates: ['dates'],
    band: ['band_name', 'genre', 'bio', 'line_up', 'audience_estimate', 'listen', 'spotify_url', 'youtube_url', 'soundcloud_url', 'bandcamp_url', 'instagram_url', 'facebook_url', 'website_url'],
    show: ['entry_type', 'ticket_price_isk', 'ticket_url', 'suggested_start_time', 'needs_sound_engineer', 'tech_needs'],
    media: ['press_photo_path', 'poster_path'],
    contact: ['contact_name', 'contact_email', 'contact_phone', 'agreed'],
};

/** Columns a band may see and edit about its own application (never admin fields). */
export const EDITABLE_FIELDS = [
    'band_name', 'genre', 'based_in', 'bio', 'previous_gigs', 'line_up', 'tech_needs', 'needs_sound_engineer', 'audience_estimate',
    'spotify_url', 'youtube_url', 'soundcloud_url', 'bandcamp_url', 'instagram_url', 'facebook_url', 'website_url',
    'entry_type', 'ticket_price_isk', 'ticket_url', 'suggested_start_time',
    'contact_name', 'contact_email', 'contact_phone', 'press_photo_path', 'poster_path',
];
