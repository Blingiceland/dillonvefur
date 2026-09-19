// Serves /events/:slug with per-event Open Graph tags so Facebook, Instagram, WhatsApp and
// Messenger show the right title, text and poster when an event link is shared.
// The rest of the page is the normal single-page app; only the <head> tags differ.
import { parseEventsCSV, sheetUrl } from '../src/utils/googleSheet.js';

const SITE_URL = 'https://www.dillon.is';
const SITE_NAME = 'Dillon Whiskey Bar';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

const escapeHtml = (s) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const setTag = (html, re, replacement) => (re.test(html) ? html.replace(re, replacement) : html);

const describe = (e) => {
    const bits = [`${e.dayOfWeek} ${e.dateDisplay} at ${e.time}`];
    if (e.genre) bits.push(e.genre);
    if (e.entry) bits.push(`Entry: ${e.entry}`);
    return `${e.title} live at Dillon Whiskey Bar, Laugavegur 30, Reykjavík. ${bits.join(' · ')}.`;
};

export default async function handler(req, res) {
    const slug = String(req.query.slug || '');
    const year = parseInt(slug.slice(0, 4), 10);
    const origin = `https://${req.headers.host}`;

    const [shell, csv] = await Promise.all([
        fetch(`${origin}/`).then((r) => r.text()),
        isNaN(year) ? Promise.resolve('') : fetch(sheetUrl(year)).then((r) => r.text()).catch(() => ''),
    ]);

    const event = csv ? parseEventsCSV(csv, year).find((e) => e.slug === slug) : null;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    if (!event) {
        // Unknown event: serve the app (its router shows the 404 page) with a real 404 status.
        res.setHeader('Cache-Control', 'public, s-maxage=60');
        res.status(404).send(shell);
        return;
    }

    const title = escapeHtml(`${event.title} – ${event.dayOfWeek} ${event.dateDisplay} | ${SITE_NAME}`);
    const description = escapeHtml(describe(event));
    const url = `${SITE_URL}/events/${event.slug}`;
    const image = escapeHtml(event.poster || DEFAULT_IMAGE);

    let html = shell;
    html = setTag(html, /<title>[^<]*<\/title>/, `<title>${title}</title>`);
    html = setTag(html, /<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${description}"/>`);
    html = setTag(html, /<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${url}"/>`);
    html = setTag(html, /<meta property="og:type" content="[^"]*"\s*\/?>/, `<meta property="og:type" content="article"/>`);
    html = setTag(html, /<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${title}"/>`);
    html = setTag(html, /<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${description}"/>`);
    html = setTag(html, /<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}"/>`);
    html = setTag(html, /<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${image}"/>`);
    html = setTag(html, /<meta property="og:image:alt" content="[^"]*"\s*\/?>/, `<meta property="og:image:alt" content="${escapeHtml(event.title)}"/>`);
    html = setTag(html, /<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${title}"/>`);
    html = setTag(html, /<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${description}"/>`);
    html = setTag(html, /<meta name="twitter:image" content="[^"]*"\s*\/?>/, `<meta name="twitter:image" content="${image}"/>`);
    if (event.poster) {
        // Poster dimensions are unknown; drop the fixed size hints that describe og-image.jpg
        html = html.replace(/<meta property="og:image:(width|height)" content="[^"]*"\s*\/?>/g, '');
    }

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    res.status(200).send(html);
}
