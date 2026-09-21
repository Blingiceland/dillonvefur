// GET /api/event-info?slug=2026-11-28-nop → { info } with the public part of the approved
// application behind that event (bio, line-up, music links, photos). Contact details never
// leave the server. { info: null } when the event was not booked through Play at Dillon.
import { supabaseAdmin } from '../server/supabase.mjs';
import { publicBandInfo } from '../src/utils/bandInfo.js';

const SLUG_RE = /^\d{4}-\d{2}-\d{2}-[a-z0-9-]{1,80}$/;

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const slug = String(req.query.slug || '');
    if (!SLUG_RE.test(slug)) { res.status(400).json({ error: 'Invalid event id' }); return; }

    try {
        const db = supabaseAdmin();
        const { data, error } = await db
            .from('applications')
            .select('band_name, genre, based_in, bio, line_up, previous_gigs, spotify_url, youtube_url, soundcloud_url, bandcamp_url, instagram_url, facebook_url, website_url, press_photo_path, poster_path')
            .eq('event_slug', slug)
            .in('status', ['approved', 'played'])
            .order('decided_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) throw error;
        const base = `${process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL}/storage/v1/object/public/band-media`;
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        res.status(200).json({ info: publicBandInfo(data, base) });
    } catch (e) {
        console.error('event-info failed', e);
        res.status(500).json({ error: 'Could not load band info' });
    }
}
