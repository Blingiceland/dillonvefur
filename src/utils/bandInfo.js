// The part of an approved application that is public on the event page. Contact details,
// tech needs, audience estimate and anything else the band told only Dillon stay out.
// Shared by /api/event-info (Node) and the tests, so no browser APIs here.

export const PUBLIC_LINKS = ['spotify_url', 'youtube_url', 'soundcloud_url', 'bandcamp_url', 'instagram_url', 'facebook_url', 'website_url'];

const clean = (v) => {
    const s = String(v || '').trim();
    return s || null;
};

/**
 * @param {object} app - applications row
 * @param {string} mediaBase - public base URL of the band-media bucket, no trailing slash
 */
export const publicBandInfo = (app, mediaBase) => {
    if (!app) return null;
    const media = (path) => (path ? `${mediaBase}/${path}` : null);
    const links = {};
    for (const key of PUBLIC_LINKS) {
        const v = clean(app[key]);
        if (v && /^https:\/\//i.test(v)) links[key.replace(/_url$/, '')] = v;
    }
    return {
        band_name: clean(app.band_name),
        genre: clean(app.genre),
        based_in: clean(app.based_in),
        bio: clean(app.bio),
        line_up: clean(app.line_up),
        previous_gigs: clean(app.previous_gigs),
        press_photo: media(clean(app.press_photo_path)),
        poster: media(clean(app.poster_path)),
        links,
    };
};
