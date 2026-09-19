// POST /api/apply — receive a band application.
// Validates everything server-side, re-checks the dates against the live schedule,
// moves the uploaded images into place, stores the row and sends the emails.
import { validateApplication, makeRef } from '../../src/utils/applicationRules.js';
import { getAvailability } from '../availability.mjs';
import { supabaseAdmin, BUCKET } from '../../server/supabase.mjs';
import { clientIp, hashIp, allowRequest } from '../../server/ratelimit.mjs';
import { notifyAdminNewApplication, notifyBandReceived } from '../../server/email.mjs';

const MIN_FILL_SECONDS = 20;

const fileName = (path) => path.split('/').pop();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const body = req.body || {};

    // Honeypot: bots fill every field. Pretend it worked and drop it.
    if (body.website_hp) { res.status(200).json({ ok: true, ref: 'DLN-000000' }); return; }
    const started = Number(body.startedAt) || 0;
    if (!started || Date.now() - started < MIN_FILL_SECONDS * 1000) {
        res.status(400).json({ error: 'That was quick. Please take a moment with the form and try again.' });
        return;
    }

    let db;
    try { db = supabaseAdmin(); } catch (e) { res.status(500).json({ error: 'Applications are not configured yet' }); return; }

    try {
        const ipHash = hashIp(clientIp(req));
        if (!(await allowRequest('apply', ipHash, 3, 60))) {
            res.status(429).json({ error: 'Too many applications from this connection. Try again in an hour.' });
            return;
        }

        const availability = await getAvailability();
        const { errors, clean } = validateApplication(body, availability);
        if (Object.keys(errors).length) { res.status(400).json({ error: 'Please check the form', errors }); return; }

        // Same act asking twice while a request is still open
        const { data: dupes } = await db.from('applications')
            .select('id, ref, status')
            .eq('contact_email', clean.contact_email)
            .ilike('band_name', clean.band_name)
            .in('status', ['pending_payment', 'submitted', 'approved'])
            .limit(1);
        if (dupes && dupes.length) {
            res.status(409).json({ error: `You already have an open application (${dupes[0].ref}). Reply to your confirmation email to change it.` });
            return;
        }

        // Dates requested by other open applications (not blocking, but we record it)
        const storage = db.storage.from(BUCKET);
        for (const p of [clean.press_photo_path, clean.poster_path].filter(Boolean)) {
            const { data: found } = await storage.list('incoming', { search: fileName(p), limit: 1 });
            if (!found || !found.length) { res.status(400).json({ error: 'An uploaded image is missing, please upload it again', errors: { press_photo_path: 'Upload the image again' } }); return; }
        }

        const { data: inserted, error: insertError } = await db.from('applications')
            .insert({ ...clean, ref: 'PENDING', ip_hash: ipHash, user_agent: String(req.headers['user-agent'] || '').slice(0, 300) })
            .select('id')
            .single();
        if (insertError) throw insertError;
        const id = inserted.id;
        const ref = makeRef(id);

        const moved = {};
        for (const [field, name] of [['press_photo_path', 'press-photo'], ['poster_path', 'poster']]) {
            const from = clean[field];
            if (!from) continue;
            const to = `applications/${id}/${name}.${from.split('.').pop()}`;
            const { error: moveError } = await storage.move(from, to);
            if (moveError) throw moveError;
            moved[field] = to;
        }

        const { data: app, error: updateError } = await db.from('applications')
            .update({ ref, ...moved })
            .eq('id', id)
            .select('*')
            .single();
        if (updateError) throw updateError;

        await db.from('application_log').insert({ application_id: id, actor: 'band', type: 'submitted', payload: { dates: [clean.preferred_date, clean.alt_date_1, clean.alt_date_2].filter(Boolean) } });

        const results = await Promise.allSettled([notifyAdminNewApplication(app), notifyBandReceived(app)]);
        results.forEach((r, i) => { if (r.status === 'rejected') console.error(i === 0 ? 'admin email failed' : 'band email failed', r.reason); });

        res.status(200).json({ ok: true, ref, id });
    } catch (error) {
        console.error('apply failed', error);
        res.status(500).json({ error: 'Something went wrong on our side. Please try again, or email dillon@dillon.is.' });
    }
}
