// Turn a music link into something the admin page can play inline.

const YT_ID = /^[A-Za-z0-9_-]{6,}$/;

/** @returns {{kind:string, src:string, ratio?:number, height?:number}|null} */
export const embedFor = (url) => {
    const v = String(url || '').trim();
    if (!v) return null;
    let u;
    try { u = new URL(v); } catch { return null; }
    const host = u.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be' || host === 'youtube.com' || host === 'music.youtube.com') {
        let id = null;
        if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
        else if (u.pathname.startsWith('/shorts/') || u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2];
        else id = u.searchParams.get('v');
        if (id && YT_ID.test(id)) return { kind: 'youtube', src: `https://www.youtube.com/embed/${id}`, ratio: 16 / 9 };
    }

    if (host === 'open.spotify.com') {
        const m = u.pathname.match(/^\/(artist|album|track|playlist|episode|show)\/([A-Za-z0-9]+)/);
        if (m) return { kind: 'spotify', src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, height: m[1] === 'track' || m[1] === 'episode' ? 152 : 352 };
    }

    if (host === 'soundcloud.com') {
        return { kind: 'soundcloud', src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(u.origin + u.pathname)}&color=%23c89b3c`, height: 166 };
    }

    return { kind: 'link', src: v };
};
