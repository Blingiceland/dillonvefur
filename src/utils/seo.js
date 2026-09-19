import { useEffect } from 'react';

export const SITE_URL = 'https://www.dillon.is';
export const SITE_NAME = 'Dillon Whiskey Bar';
export const DEFAULT_TITLE = `${SITE_NAME} | Live Music & 250+ Whiskies in Reykjavík`;
export const DEFAULT_DESCRIPTION =
    'Dillon Whiskey Bar on Laugavegur 30, Reykjavík. Over 250 whiskies, live rock and blues, resident DJ Andrea and happy hour every day 12–19. Est. 1999.';

const VENUE = {
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
 * Social scrapers read the static tags in index.html; search engines that run JS get these.
 */
export const usePageMeta = ({ title, description = DEFAULT_DESCRIPTION, path = '/' }) => {
    useEffect(() => {
        const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
        const url = SITE_URL + path;
        document.title = fullTitle;
        setHeadTag('meta[name="description"]', { name: 'description', content: description });
        setHeadTag('link[rel="canonical"]', { rel: 'canonical', href: url });
        setHeadTag('meta[property="og:title"]', { property: 'og:title', content: fullTitle });
        setHeadTag('meta[property="og:description"]', { property: 'og:description', content: description });
        setHeadTag('meta[property="og:url"]', { property: 'og:url', content: url });
    }, [title, description, path]);
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

const pad = (n) => String(n).padStart(2, '0');

/** schema.org event list for the events page (Iceland is UTC all year). */
export const eventsJsonLd = (events) => {
    if (!events.length) return null;
    return {
        '@graph': events.map((e) => {
            const d = e.dateObj;
            const startDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${e.time}:00+00:00`;
            return {
                '@type': /comedy/i.test(e.title) ? 'ComedyEvent' : 'MusicEvent',
                name: e.title,
                startDate,
                eventStatus: 'https://schema.org/EventScheduled',
                eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
                location: VENUE,
                organizer: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
                url: `${SITE_URL}/events`,
                image: `${SITE_URL}/og-image.jpg`,
                ...(e.genre ? { genre: e.genre } : {}),
            };
        }),
    };
};
