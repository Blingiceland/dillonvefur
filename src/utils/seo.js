import { useEffect } from 'react';

export const SITE_URL = 'https://www.dillon.is';
export const SITE_NAME = 'Dillon Whiskey Bar';
export const DEFAULT_TITLE = `${SITE_NAME} | Live Music & 250+ Whiskies in Reykjavík`;
export const DEFAULT_DESCRIPTION =
    'Dillon Whiskey Bar on Laugavegur 30, Reykjavík. Over 250 whiskies, live rock and blues, resident DJ Andrea and happy hour every day 12–19. Est. 1999.';
export const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

export const ADDRESS_TEXT = 'Laugavegur 30, 101 Reykjavík';
export const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=Dillon+Whiskey+Bar+Laugavegur+30+Reykjav%C3%ADk';
export const PHONE = '+354 537 9700';
export const PHONE_HREF = 'tel:+3545379700';
export const EMAIL = 'dillon@dillon.is';

export const VENUE = {
    '@type': 'BarOrPub',
    '@id': `${SITE_URL}/#venue`,
    name: SITE_NAME,
    url: SITE_URL,
    address: {
        '@type': 'PostalAddress',
        streetAddress: 'Laugavegur 30',
        postalCode: '101',
        addressLocality: 'Reykjavík',
        addressCountry: 'IS',
    },
};

const setHeadTag = (selector, attrs) => {
    let el = document.head.querySelector(selector);
    if (!el) {
        el = document.createElement(selector.startsWith('link') ? 'link' : 'meta');
        document.head.appendChild(el);
    }
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
};

/**
 * Per-page title, description, canonical and Open Graph tags.
 * Social scrapers read the static tags in index.html (or the per-event tags from /api/event);
 * search engines that run JS get these.
 */
export const usePageMeta = ({ title, description = DEFAULT_DESCRIPTION, path = '/', image = DEFAULT_IMAGE }) => {
    useEffect(() => {
        const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
        const url = SITE_URL + path;
        document.title = fullTitle;
        setHeadTag('meta[name="description"]', { name: 'description', content: description });
        setHeadTag('link[rel="canonical"]', { rel: 'canonical', href: url });
        setHeadTag('meta[property="og:title"]', { property: 'og:title', content: fullTitle });
        setHeadTag('meta[property="og:description"]', { property: 'og:description', content: description });
        setHeadTag('meta[property="og:url"]', { property: 'og:url', content: url });
        setHeadTag('meta[property="og:image"]', { property: 'og:image', content: image });
    }, [title, description, path, image]);
};

/** Inject a JSON-LD block (schema.org) for the current page; removed on unmount. */
export const useJsonLd = (id, data) => {
    useEffect(() => {
        if (!data) return undefined;
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = `jsonld-${id}`;
        script.text = JSON.stringify({ '@context': 'https://schema.org', ...data });
        document.head.appendChild(script);
        return () => script.remove();
    }, [id, data]);
};

/** Iceland is UTC all year. */
export const eventStartIso = (e) => `${e.isoDate}T${e.time}:00+00:00`;

export const eventUrl = (e) => `${SITE_URL}/events/${e.slug}`;

export const eventDescription = (e) => {
    const bits = [`${e.dayOfWeek} ${e.dateDisplay} at ${e.time}`];
    if (e.genre) bits.push(e.genre);
    if (e.entry) bits.push(`Entry: ${e.entry}`);
    return `${e.title} live at Dillon Whiskey Bar, Laugavegur 30, Reykjavík. ${bits.join(' · ')}.`;
};

/** schema.org event object (plain, no @context) */
export const eventJsonLd = (e) => ({
    '@type': /comedy/i.test(e.title) ? 'ComedyEvent' : 'MusicEvent',
    name: e.title,
    startDate: eventStartIso(e),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: VENUE,
    organizer: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    url: eventUrl(e),
    image: e.poster || DEFAULT_IMAGE,
    description: eventDescription(e),
    ...(e.genre ? { genre: e.genre } : {}),
    ...(/^free/i.test(e.entry) ? { isAccessibleForFree: true } : {}),
    ...(e.tickets ? { offers: { '@type': 'Offer', url: e.tickets, availability: 'https://schema.org/InStock' } } : {}),
});

/** schema.org event list for the events page. */
export const eventsJsonLd = (events) => {
    if (!events.length) return null;
    return { '@graph': events.map(eventJsonLd) };
};

/** Google Calendar "add event" link (2 hour default duration). */
export const googleCalendarUrl = (e) => {
    const [h, m] = e.time.split(':').map(Number);
    const start = `${e.isoDate.replace(/-/g, '')}T${String(h).padStart(2, '0')}${String(m || 0).padStart(2, '0')}00Z`;
    const endH = (h + 2) % 24;
    const end = `${e.isoDate.replace(/-/g, '')}T${String(endH).padStart(2, '0')}${String(m || 0).padStart(2, '0')}00Z`;
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: `${e.title} @ Dillon`,
        dates: `${start}/${end}`,
        details: `${eventDescription(e)}\n${eventUrl(e)}`,
        location: `Dillon Whiskey Bar, ${ADDRESS_TEXT}`,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
};
