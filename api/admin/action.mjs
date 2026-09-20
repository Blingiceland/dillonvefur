// POST /api/admin/action  (Authorization: Bearer <supabase access token of the owner>)
// { id, action, message?, confirmedDate?, startTime?, ticketUrl?, entry?, note? }
import { supabaseAdmin } from '../../server/supabase.mjs';
import { requireAdmin } from '../../server/auth.mjs';
import { ACTIONS, canTransition, notifyBandApproved, notifyBandRejected, notifyBandCancelled, notifyBandRefunded } from '../../server/decisions.mjs';
import { slugify } from '../../src/utils/googleSheet.js';
import { entryText } from '../../src/utils/sheetRows.js';
import { writeEventRow, cancelEventRow } from '../../server/sheets.mjs';
import { publicMediaUrl } from '../../server/supabase.mjs';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export default async function handler(req, res) {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ error: 'Method not allowed' }); return; }

    const user = await requireAdmin(req).catch(() => null);
    if (!user) { res.status(401).json({ error: 'Not signed in as the owner' }); return; }

    const { id, action, message = '', confirmedDate, startTime, note } = req.body || {};
    if (!id || !ACTIONS[action]) { res.status(400).json({ error: 'Unknown action' }); return; }

    const db = supabaseAdmin();
    const { data: app, error } = await db.from('applications').select('*').eq('id', id).single();
    if (error || !app) { res.status(404).json({ error: 'Application not found' }); return; }
    if (!canTransition(action, app.status)) { res.status(409).json({ error: `Cannot ${action} an application that is ${app.status}` }); return; }

    const log = (type, payload) => db.from('application_log').insert({ application_id: id, actor: 'admin', type, payload: payload || null });
    const now = new Date().toISOString();
    let patch = {};
    let email = null;

    try {
        switch (action) {
            case 'approve': {
                const date = confirmedDate || app.preferred_date;
                if (![app.preferred_date, app.alt_date_1, app.alt_date_2].includes(date)) { res.status(400).json({ error: 'Pick one of the dates the band asked for' }); return; }
                const time = startTime || app.suggested_start_time;
                if (!TIME_RE.test(time)) { res.status(400).json({ error: 'Start time must look like 21:00' }); return; }
                const { data: clash } = await db.from('applications').select('ref').eq('status', 'approved').eq('confirmed_date', date).neq('id', id).limit(1);
                if (clash && clash.length) { res.status(409).json({ error: `${date} is already taken by ${clash[0].ref}` }); return; }
                // Sheet first: if this throws (DATE_TAKEN, SHEET_TAB_MISSING, auth) the application stays "submitted".
                const written = await writeEventRow({
                    isoDate: date,
                    time,
                    band: app.band_name,
                    contact: `${app.contact_name} – ${app.contact_email} – ${app.contact_phone}`,
                    genre: app.genre,
                    posterUrl: publicMediaUrl(app.poster_path || app.press_photo_path),
                    ticketUrl: app.ticket_url || '',
                    entry: entryText(app),
                });
                patch = { status: 'approved', confirmed_date: date, start_time: time, decision_message: message || null, decided_at: now, event_slug: `${date}-${slugify(app.band_name)}`, sheet_tab: written.tab, sheet_row: written.rowNumber, last_error: null };
                email = (a) => notifyBandApproved(a, message);
                break;
            }
            case 'reject':
                patch = { status: 'rejected', decision_message: message || null, decided_at: now };
                email = (a) => notifyBandRejected(a, message);
                break;
            case 'played':
                patch = { status: 'played', played_at: now };
                break;
            case 'cancel':
                await cancelEventRow({ isoDate: app.confirmed_date, band: app.band_name });
                patch = { status: 'cancelled', decision_message: message || null };
                email = (a) => notifyBandCancelled(a, message);
                break;
            case 'withdraw':
                if (app.status === 'approved') await cancelEventRow({ isoDate: app.confirmed_date, band: app.band_name });
                patch = { status: 'withdrawn', decision_message: message || null };
                break;
            case 'mark_refunded':
                if (!['paid', 'refund_pending', 'refund_failed'].includes(app.fee_status)) { res.status(409).json({ error: 'No paid fee to mark as refunded' }); return; }
                patch = { fee_status: 'refunded', refunded_at: now };
                email = (a) => notifyBandRefunded(a);
                break;
            case 'add_note':
                patch = { admin_note: String(note ?? '').slice(0, 2000) || null };
                break;
            default:
                res.status(400).json({ error: 'Unknown action' });
                return;
        }

        const { data: updated, error: upErr } = await db.from('applications').update(patch).eq('id', id).select('*').single();
        if (upErr) throw upErr;
        await log(action, { message: message || undefined, confirmedDate: patch.confirmed_date, startTime: patch.start_time });

        if (email) {
            try { await email(updated); } catch (e) { console.error('decision email failed', e); await db.from('applications').update({ last_error: `Email failed: ${e.message}` }).eq('id', id); }
        }
        res.status(200).json({ ok: true, application: updated });
    } catch (e) {
        console.error('admin action failed', e);
        await db.from('applications').update({ last_error: String(e.message || e).slice(0, 500) }).eq('id', id);
        res.status(500).json({ error: e.message || 'Action failed' });
    }
}
