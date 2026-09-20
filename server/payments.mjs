// Booking-fee bookkeeping shared by the webhook, the status page and admin actions.
import { supabaseAdmin } from './supabase.mjs';
import { refundTransaction, getCheckoutSession } from './teya.mjs';
import { notifyAdminNewApplication, notifyBandReceived } from './email.mjs';

/**
 * Record a successful payment (idempotent on transaction id). Moves a pending_payment
 * application to submitted and sends the "new application" emails exactly once.
 */
export const recordPayment = async ({ app, transactionId, source, payload }) => {
    const db = supabaseAdmin();
    const externalId = transactionId ? `teya:${transactionId}` : null;
    if (externalId) {
        const { error } = await db.from('application_log').insert({ application_id: app.id, actor: 'teya', type: 'fee_paid', external_id: externalId, payload: { source, ...(payload || {}) } });
        if (error) {
            if (String(error.code) === '23505') return { duplicate: true }; // already recorded
            throw error;
        }
    }
    const wasPending = app.status === 'pending_payment';
    const { data: updated, error: upErr } = await db.from('applications')
        .update({
            fee_status: 'paid',
            paid_at: new Date().toISOString(),
            teya_transaction_id: transactionId || app.teya_transaction_id || null,
            ...(wasPending ? { status: 'submitted' } : {}),
        })
        .eq('id', app.id)
        .select('*')
        .single();
    if (upErr) throw upErr;
    if (wasPending) {
        const results = await Promise.allSettled([notifyAdminNewApplication(updated), notifyBandReceived(updated)]);
        results.forEach((r, i) => { if (r.status === 'rejected') console.error(i === 0 ? 'admin email failed' : 'band email failed', r.reason); });
    }
    return { duplicate: false, application: updated };
};

/**
 * Ask Teya about the session (fallback when the webhook has not arrived) and record the
 * payment if it succeeded. Returns the possibly-updated application.
 */
export const syncPaymentFromTeya = async (app) => {
    if (!app.teya_session_id || app.fee_status !== 'pending') return app;
    let session;
    try { session = await getCheckoutSession(app.teya_session_id); } catch (e) { console.error('teya session lookup failed', e.message); return app; }
    const paid = ['SUCCESS', 'PAID', 'CAPTURED', 'COMPLETED'].includes(String(session.payment_status || session.status || '').toUpperCase());
    if (!paid) return app;
    const transactionId = session.transaction_id || session.payment?.transaction_id || null;
    const r = await recordPayment({ app, transactionId, source: 'poll', payload: { session_id: app.teya_session_id } });
    return r.application || app;
};

/**
 * Refund the booking fee if it was paid. Never throws: the outcome lands in fee_status/last_error.
 * @returns {Promise<object>} patch to merge into the application update
 */
export const refundIfPaid = async (app, log) => {
    if (app.fee_status !== 'paid') return {};
    if (!app.teya_transaction_id) {
        await log('refund_failed', { reason: 'no transaction id' });
        return { fee_status: 'refund_failed', last_error: 'Refund not attempted: no Teya transaction id on record. Refund manually in the Teya portal, then mark as refunded.' };
    }
    try {
        const r = await refundTransaction({ transactionId: app.teya_transaction_id, amount: app.fee_amount_isk, ref: app.ref });
        await log('refund', { status: r.status, refund_id: r.transaction_id, reason: r.status_reason });
        if (r.status === 'SUCCESS') return { fee_status: 'refunded', refunded_at: new Date().toISOString(), teya_refund_id: r.transaction_id || null, last_error: null };
        if (r.status === 'PENDING') return { fee_status: 'refund_pending', teya_refund_id: r.transaction_id || null, last_error: null };
        return { fee_status: 'refund_failed', teya_refund_id: r.transaction_id || null, last_error: `Refund failed: ${r.status_reason || 'unknown reason'}. Refund manually in the Teya portal, then mark as refunded.` };
    } catch (e) {
        await log('refund_failed', { error: String(e.message).slice(0, 300) });
        return { fee_status: 'refund_failed', last_error: `Refund failed: ${String(e.message).slice(0, 200)}` };
    }
};
