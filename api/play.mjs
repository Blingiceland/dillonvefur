// Serves /play with its own Open Graph tags so Facebook, Instagram, WhatsApp and Messenger show
// the gig-application card ("Viltu spila á Dillon?") instead of the generic front-page one.
// Same trick as /api/event: fetch the app shell and swap the <head> tags. The page itself is
// still the normal single-page app, and the visible page is in English - only the share card,
// which is aimed at Icelandic bands, is in Icelandic.

const SITE_URL = 'https://www.dillon.is';
const SITE_NAME = 'Dillon Whiskey Bar';
const URL_PATH = '/play';

// The share card (Icelandic - this is what Facebook shows)
const OG_TITLE = 'Viltu spila á Dillon?';
const OG_DESCRIPTION =
    'Sjáðu hvaða kvöld eru laus, sendu okkur tónlistina þína og sæktu um á netinu. Dillon Whiskey Bar, Laugavegur 30, Reykjavík.';
const OG_IMAGE = `${SITE_URL}/og-play.jpg`;
const OG_IMAGE_ALT = 'Hljómsveit á sviði - Viltu spila á Dillon?';

// The page's own title and description stay English, matching what a visitor actually reads
const PAGE_TITLE = `Play at Dillon | ${SITE_NAME}`;
const PAGE_DESCRIPTION =
    'Apply to play a live show at Dillon Whiskey Bar, Reykjavík. See which dates are free, send us your music and tell us about the band.';

const escapeHtml = (s) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const setTag = (html, re, replacement) => (re.test(html) ? html.replace(re, replacement) : html);

// Only fetch the app shell from this project's own hosts. Never trust the Host header for
// this: a spoofed host would let an attacker serve (and cache) foreign HTML under our URL.
const ALLOWED_HOST = /^(www\.)?dillon\.is$|^dillon(-[a-z0-9]+)*\.vercel\.app$|^dillon(-[a-z0-9]+)*-jon-steinssons-projects\.vercel\.app$/;

const shellOrigin = (host) => (ALLOWED_HOST.test(String(host || '').toLowerCase()) ? `https://${host.toLowerCase()}` : SITE_URL);

export default async function handler(req, res) {
    const shell = await fetch(`${shellOrigin(req.headers.host)}/`).then((r) => r.text());

    const url = SITE_URL + URL_PATH;
    const title = escapeHtml(PAGE_TITLE);
    const description = escapeHtml(PAGE_DESCRIPTION);
    const ogTitle = escapeHtml(OG_TITLE);
    const ogDescription = escapeHtml(OG_DESCRIPTION);

    let html = shell;
    html = setTag(html, /<title>[^<]*<\/title>/, `<title>${title}</title>`);
    html = setTag(html, /<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${description}"/>`);
    html = setTag(html, /<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${url}"/>`);
    html = setTag(html, /<meta property="og:locale" content="[^"]*"\s*\/?>/, `<meta property="og:locale" content="is_IS"/>`);
    html = setTag(html, /<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${ogTitle}"/>`);
    html = setTag(html, /<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${ogDescription}"/>`);
    html = setTag(html, /<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}"/>`);
    html = setTag(html, /<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${OG_IMAGE}"/>`);
    html = setTag(html, /<meta property="og:image:alt" content="[^"]*"\s*\/?>/, `<meta property="og:image:alt" content="${escapeHtml(OG_IMAGE_ALT)}"/>`);
    html = setTag(html, /<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${ogTitle}"/>`);
    html = setTag(html, /<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${ogDescription}"/>`);
    html = setTag(html, /<meta name="twitter:image" content="[^"]*"\s*\/?>/, `<meta name="twitter:image" content="${OG_IMAGE}"/>`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    res.status(200).send(html);
}
