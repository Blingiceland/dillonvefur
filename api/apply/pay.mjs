// GET  /api/apply/pay?token=…  → { ref, status, fee_status, feeEnabled }  (status page; also polls Teya as a fallback)
// POST /api/apply/pay { token }  → { checkoutUrl }  (start or restart the booking-fee payment)
import { supabaseAdmin } from '../../server/supabase.mjs';
import { feeEnabled, createCheckoutSession } from '../../server/teya.mjs';
import { syncPaymentFromTeya } from '../../server/payments.mjs';

const TOKEN_RE = /^[a-f0-9]{48}$/;
const SITE_URL = () => process.env.SITE_URL || 'https://www.dillon.is';

export default async function handler(req, res) {
    let db;
    try { db = supabaseAdmin(); } catch (e) { res.status(500).json({ error: 'Applications are not configured yet' }); return; }

    const token = req.method === 'GET' ? req.query.token : (req.body || {}).token;
    if (!TOKEN_RE.test(String(token || ''))) { res.status(404).json({ error: 'This link is not valid.' }); return; }
    const { data: found } = await db.from('applications').select('*').eq('edit_token', token).maybeSingle();
    if (!found) { res.status(404).json({ error: 'This link is not valid.' }); return; }

    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'GET') {
        const app = await syncPaymentFromTeya(found);
        res.status(200).json({ ref: app.ref, status: app.status, fee_status: app.fee_status, fee_amount_isk: app.fee_amount_isk, feeEnabled: feeEnabled() });
        return;
    }

    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); res.status(405).json({ error: 'Method not allowed' }); return; }

    const app = await syncPaymentFromTeya(found);
    if (app.fee_status === 'paid') { res.status(200).json({ alreadyPaid: true, ref: app.ref }); return; }
    if (app.status !== 'pending_payment') { res.status(409).json({ error: `This application is ${app.status}; no payment is due.` }); return; }
    if (!feeEnabled()) { res.status(409).json({ error: 'Payments are not enabled.' }); return; }

    try {
        const session = await createCheckoutSession({ app, siteUrl: SITE_URL(), token });
        await db.from('applications').update({ teya_session_id: session.session_id, fee_status: 'pending' }).eq('id', app.id);
        await db.from('application_log').insert({ application_id: app.id, actor: 'band', type: 'checkout_started', payload: { session_id: session.session_id } });
        res.status(200).json({ checkoutUrl: session.session_url, ref: app.ref });
    } catch (e) {
        console.error('checkout session failed', e);
        res.status(502).json({ error: 'Could not start the payment. Please try again in a moment.' });
    }
}
