// POST /api/teya-webhook — Teya calls this on successful payments.
// Web-standard signature so we can verify x-teya-signature over the untouched raw body.
import { verifyWebhookSignature } from '../server/teya.mjs';
import { supabaseAdmin } from '../server/supabase.mjs';
import { recordPayment } from '../server/payments.mjs';

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function POST(request) {
    const raw = await request.text();
    const signature = request.headers.get('x-teya-signature');
    if (!verifyWebhookSignature(raw, signature)) {
        console.error('teya webhook: bad signature');
        return json(401, { error: 'invalid signature' });
    }

    let event;
    try { event = JSON.parse(raw); } catch { return json(400, { error: 'invalid json' }); }
    const data = event.data || {};
    if (event.event !== 'payment.succeeded.v1' || String(data.status || '').toUpperCase() !== 'SUCCESS') {
        return json(200, { ok: true, ignored: event.event });
    }

    const db = supabaseAdmin();
    let app = null;
    if (data.session_id) {
        const { data: bySession } = await db.from('applications').select('*').eq('teya_session_id', data.session_id).maybeSingle();
        app = bySession;
    }
    if (!app && data.merchant_reference) {
        const { data: byRef } = await db.from('applications').select('*').eq('ref', data.merchant_reference).maybeSingle();
        app = byRef;
    }
    if (!app) {
        console.error('teya webhook: no application for', data.session_id, data.merchant_reference);
        return json(200, { ok: true, unmatched: true });
    }

    try {
        const r = await recordPayment({ app, transactionId: data.transaction_id, source: 'webhook', payload: { session_id: data.session_id, amount: data.amount, last4: data.payment_method?.last4 } });
        return json(200, { ok: true, duplicate: r.duplicate });
    } catch (e) {
        console.error('teya webhook: failed to record payment', e);
        return json(500, { error: 'failed to record payment' });
    }
}

export async function GET() {
    return json(405, { error: 'POST only' });
}
