import { validateApplication, validateLink, LINK_HOSTS, AUDIENCE_OPTIONS, makeRef } from './applicationRules';

const window = { from: '2026-10-03', to: '2027-03-18' };
const availability = { ...window, taken: ['2026-10-10'], yearsOpen: [2026, 2027] };

const good = () => ({
    dates: ['2026-10-09', '2026-10-16'],
    band_name: 'Nöp',
    genre: 'Pönk',
    based_in: 'Reykjavík',
    bio: 'N'.repeat(150),
    previous_gigs: 'Gaukurinn 2025',
    line_up: 'Gítar, bassi, trommur, söngur',
    tech_needs: '',
    audience_estimate: '30_60',
    spotify_url: 'https://open.spotify.com/artist/abc',
    youtube_url: '',
    soundcloud_url: '',
    bandcamp_url: '',
    instagram_url: 'https://www.instagram.com/nop/',
    facebook_url: '',
    website_url: '',
    entry_type: 'ticketed',
    ticket_price_isk: '2500',
    ticket_url: '',
    suggested_start_time: '21:00',
    contact_name: 'Jón',
    contact_email: 'jon@example.com',
    contact_phone: '+354 777 7777',
    press_photo_path: 'incoming/4f2a9c1e-0000-4000-8000-000000000000.jpg',
    poster_path: '',
    agreed: true,
});

describe('validateLink', () => {
    test('accepts known hosts per link type and rejects others', () => {
        expect(validateLink('spotify', 'https://open.spotify.com/artist/x')).toBeNull();
        expect(validateLink('youtube', 'https://youtu.be/abc')).toBeNull();
        expect(validateLink('youtube', 'https://www.youtube.com/watch?v=abc')).toBeNull();
        expect(validateLink('soundcloud', 'https://soundcloud.com/band/track')).toBeNull();
        expect(validateLink('bandcamp', 'https://band.bandcamp.com/album/x')).toBeNull();
        expect(validateLink('instagram', 'https://instagram.com/band')).toBeNull();
        expect(validateLink('website', 'https://example.is')).toBeNull();
        expect(validateLink('spotify', 'https://example.com/x')).toMatch(/Spotify/);
        expect(validateLink('youtube', 'not a url')).toMatch(/link/i);
        expect(validateLink('website', 'javascript:alert(1)')).toMatch(/link/i);
    });
    test('empty is fine (optional links)', () => {
        expect(validateLink('spotify', '')).toBeNull();
    });
    test('LINK_HOSTS covers every link type', () => {
        expect(Object.keys(LINK_HOSTS).sort()).toEqual(['bandcamp', 'facebook', 'instagram', 'soundcloud', 'spotify', 'website', 'youtube']);
    });
});

describe('validateApplication', () => {
    test('a complete application is valid and normalised', () => {
        const { errors, clean } = validateApplication(good(), availability);
        expect(errors).toEqual({});
        expect(clean.preferred_date).toBe('2026-10-09');
        expect(clean.alt_date_1).toBe('2026-10-16');
        expect(clean.alt_date_2).toBeNull();
        expect(clean.ticket_price_isk).toBe(2500);
        expect(clean.youtube_url).toBeNull();
        expect(clean.poster_path).toBeNull();
        expect(clean.contact_email).toBe('jon@example.com');
    });

    test('requires a preferred date inside the window and not taken', () => {
        expect(validateApplication({ ...good(), dates: [] }, availability).errors.dates).toBeTruthy();
        expect(validateApplication({ ...good(), dates: ['2026-10-01'] }, availability).errors.dates).toMatch(/window/i);
        expect(validateApplication({ ...good(), dates: ['2026-10-10'] }, availability).errors.dates).toMatch(/booked/i);
        expect(validateApplication({ ...good(), dates: ['2026-10-09', '2026-10-09'] }, availability).errors.dates).toMatch(/different/i);
        expect(validateApplication({ ...good(), dates: ['2026-10-09', '2026-10-16', '2026-10-17', '2026-10-18'] }, availability).errors.dates).toMatch(/three/i);
    });

    test('requires the band basics, a long enough bio and one listen link', () => {
        const { errors } = validateApplication({ ...good(), band_name: '', bio: 'short', spotify_url: '', line_up: '' }, availability);
        expect(errors.band_name).toBeTruthy();
        expect(errors.bio).toMatch(/150/);
        expect(errors.listen).toMatch(/at least one/i);
        expect(errors.line_up).toBeTruthy();
    });

    test('ticketed shows need a sensible price; free shows ignore the price', () => {
        expect(validateApplication({ ...good(), ticket_price_isk: '' }, availability).errors.ticket_price_isk).toBeTruthy();
        expect(validateApplication({ ...good(), ticket_price_isk: '100' }, availability).errors.ticket_price_isk).toBeTruthy();
        const free = validateApplication({ ...good(), entry_type: 'free', ticket_price_isk: '' }, availability);
        expect(free.errors).toEqual({});
        expect(free.clean.ticket_price_isk).toBeNull();
    });

    test('validates contact details, media, audience and agreement', () => {
        const { errors } = validateApplication({ ...good(), contact_email: 'nope', contact_phone: '12', press_photo_path: '', audience_estimate: 'lots', agreed: false }, availability);
        expect(errors.contact_email).toBeTruthy();
        expect(errors.contact_phone).toBeTruthy();
        expect(errors.press_photo_path).toBeTruthy();
        expect(errors.audience_estimate).toBeTruthy();
        expect(errors.agreed).toBeTruthy();
        expect(AUDIENCE_OPTIONS.map((o) => o.value)).toContain('30_60');
    });

    test('rejects storage paths outside incoming/', () => {
        const { errors } = validateApplication({ ...good(), press_photo_path: 'applications/x/press-photo.jpg' }, availability);
        expect(errors.press_photo_path).toBeTruthy();
    });
});

describe('makeRef', () => {
    test('derives a short readable code from the uuid', () => {
        expect(makeRef('4f2a9c1e-0000-4000-8000-000000000000')).toBe('DLN-4F2A9C');
    });
});
