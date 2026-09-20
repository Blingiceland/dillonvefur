// GET  /api/apply/edit?token=…  → the band's own application (editable fields) + availability
// POST /api/apply/edit { token, ...fields } → update it and put it back in the owner's queue
// The token is a secret from the "request changes" email; it stays valid for further rounds.
import { validateApplication, EDITABLE_FIELDS } from '../../src/utils/applicationRules.js';
import { getAvailability } from '../availability.mjs';
import { supabaseAdmin, BUCKET, publicMediaUrl } from '../../server/supabase.mjs';
import { notifyAdminUpdatedApplication } from '../../server/email.mjs';

const TOKEN_RE = /^[a-f0-9]{48}$/;
const fileName = (path) => path.split('/').pop();

const loadByToken = async (db, token) => {
    if (!TOKEN_RE.test(String(token || ''))) return null;
    const { data } = await db.from('applications').select('*').eq('edit_token', token).maybeSingle();
    return data || null;
};

export default async function handler(req, res) {
    let db;
    try { db = supabaseAdmin(); } catch (e) { res.status(500).json({ error: 'Applications are not configured yet' }); return; }

    if (req.method === 'GET') {
        const app = await loadByToken(db, req.query.token);
        if (!app) { res.status(404).json({ error: 'This link is not valid any more.' }); return; }
        if (!['changes_requested', 'submitted'].includes(app.status)) { res.status(409).json({ error: `This application is ${app.status} and can no longer be edited.` }); return; }
        const availability = await getAvailability();
        const fields = Object.fromEntries(EDITABLE_FIELDS.map((k) => [k, app[k] ?? '']));
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json({
            id: app.id,
            ref: app.ref,
            status: app.status,
            message: app.decision_message || '',
            dates: [app.preferred_date, app.alt_date_1, app.alt_date_2].filter(Boolean),
            fields: { ...fields, ticket_price_isk: app.ticket_price_isk ?? '' },
            existing: { press_photo_url: publicMediaUrl(app.press_photo_path), poster_url: publicMediaUrl(app.poster_path) },
            availability,
        });
        return;
    }

    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); res.status(405).json({ error: 'Method not allowed' }); return; }

    const body = req.body || {};
    if (body.website_hp) { res.status(200).json({ ok: true, ref: 'DLN-000000' }); return; }
    const app = await loadByToken(db, body.token);
    if (!app) { res.status(404).json({ error: 'This link is not valid any more.' }); return; }
    if (!['changes_requested', 'submitted'].includes(app.status)) { res.status(409).json({ error: `This application is ${app.status} and can no longer be edited.` }); return; }

    try {
        const availability = await getAvailability();
        const ownDates = [app.preferred_date, app.alt_date_1, app.alt_date_2].filter(Boolean);
        const { errors, clean } = validateApplication(body, availability, { existingId: app.id, ownDates });
        if (Object.keys(errors).length) { res.status(400).json({ error: 'Please check the form', errors }); return; }

        const storage = db.storage.from(BUCKET);
        const moved = {};
        for (const [fieldKey, name] of [['press_photo_path', 'press-photo'], ['poster_path', 'poster']]) {
            const p = clean[fieldKey];
            if (!p || !p.startsWith('incoming/')) continue;
            const { data: found } = await storage.list('incoming', { search: fileName(p), limit: 1 });
            if (!found || !found.length) { res.status(400).json({ error: 'An uploaded image is missing, please upload it again', errors: { [fieldKey]: 'Upload the image again' } }); return; }
            const to = `applications/${app.id}/${name}.${p.split('.').pop()}`;
            if (app[fieldKey] && app[fieldKey] !== to) await storage.remove([app[fieldKey]]);
            else if (app[fieldKey] === to) await storage.remove([to]);
            const { error: moveError } = await storage.move(p, to);
            if (moveError) throw moveError;
            moved[fieldKey] = to;
        }

        const { data: updated, error: upErr } = await db.from('applications')
            .update({ ...clean, ...moved, status: 'submitted', resubmitted_at: new Date().toISOString(), last_error: null })
            .eq('id', app.id)
            .select('*')
            .single();
        if (upErr) throw upErr;

        await db.from('application_log').insert({ application_id: app.id, actor: 'band', type: 'resubmitted', payload: { dates: [clean.preferred_date, clean.alt_date_1, clean.alt_date_2].filter(Boolean) } });
        try { await notifyAdminUpdatedApplication(updated); } catch (e) { console.error('admin email failed', e); }

        res.status(200).json({ ok: true, ref: updated.ref, id: updated.id, updated: true });
    } catch (error) {
        console.error('edit failed', error);
        res.status(500).json({ error: 'Something went wrong on our side. Please try again, or email dillon@dillon.is.' });
    }
}
