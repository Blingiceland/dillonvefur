// Teya online payments: OAuth client-credentials token, hosted checkout sessions,
// refunds and webhook signature verification. Docs: https://docs.teya.com
import { createVerify, randomUUID } from 'node:crypto';

const UA = 'Dillon-Web/1.0';
const SCOPES = 'checkout/sessions/create checkout/sessions/id/get refunds/create';

const isStaging = () => (process.env.TEYA_ENV || 'production').toLowerCase() !== 'production';
const API = () => (isStaging() ? 'https://api.teya.xyz' : 'https://api.teya.com');
const ID = () => (isStaging() ? 'https://id.teya.xyz' : 'https://id.teya.com');

/** True when the booking fee is switched on (credentials present and not paused with FEE_DISABLED=1).
 *  FEE_DISABLED only stops new charges; refunds of already-paid applications keep working. */
export const feeEnabled = () => process.env.FEE_DISABLED !== '1' && !!(process.env.TEYA_CLIENT_ID && process.env.TEYA_CLIENT_SECRET && process.env.TEYA_STORE_ID);

export const FEE_AMOUNT_ISK = () => Number(process.env.FEE_AMOUNT_ISK || 10000);

let cached = null;
export const getToken = async () => {
    if (cached && cached.exp > Date.now() + 30_000) return cached.token;
    const res = await fetch(`${ID()}/oauth/v2/oauth-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: process.env.TEYA_CLIENT_ID, client_secret: process.env.TEYA_CLIENT_SECRET, scope: SCOPES }),
    });
    if (!res.ok) throw new Error(`Teya auth failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    cached = { token: data.access_token, exp: Date.now() + (data.expires_in || 600) * 1000 };
    return cached.token;
};

const call = async (path, { method = 'GET', body, idempotencyKey } = {}) => {
    const token = await getToken();
    const res = await fetch(`${API()}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': UA,
            'Content-Type': 'application/json',
            ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = {};
    try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
    if (!res.ok) throw new Error(`Teya ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
    return json;
};

/**
 * Create a hosted checkout session for the booking fee.
 * @returns {Promise<{session_id: string, session_url: string}>}
 */
export const createCheckoutSession = async ({ app, siteUrl, token }) => {
    const amount = FEE_AMOUNT_ISK(); // ISK has no minor unit: 10000 = 10.000 kr.
    return call('/v2/checkout/sessions', {
        method: 'POST',
        idempotencyKey: randomUUID(),
        body: {
            store_id: process.env.TEYA_STORE_ID,
            amount: { currency: 'ISK', value: amount },
            type: 'SALE',
            merchant_reference: app.ref,
            line_items: [{ description: `Booking fee – Play at Dillon (${app.ref}, ${app.band_name})`, quantity: 1, unit_price: amount }],
            customer: { email: app.contact_email, name: app.contact_name },
            customer_success_email: app.contact_email,
            language: 'en-GB',
            post_success_payment: 'REDIRECT',
            success_url: `${siteUrl}/play/thanks/${token}`,
            cancel_url: `${siteUrl}/play/pay/${token}?cancelled=1`,
            failure_url: `${siteUrl}/play/pay/${token}?failed=1`,
            metadata: { application_id: app.id, ref: app.ref },
        },
    });
};

export const getCheckoutSession = (sessionId) => call(`/v2/checkout/sessions/${encodeURIComponent(sessionId)}`);

/**
 * Refund a captured payment in full.
 * @returns {Promise<{transaction_id: string, status: 'SUCCESS'|'FAILURE'|'PENDING', status_reason?: string}>}
 */
export const refundTransaction = ({ transactionId, amount, ref }) =>
    call('/v3/refunds', {
        method: 'POST',
        idempotencyKey: `refund-${ref}-${transactionId}`,
        body: { transaction_id: transactionId, merchant_reference: ref, amount },
    });

/** Normalise a PEM public key that may have been pasted as one line or without headers. */
export const normalisePublicKey = (raw) => {
    let s = String(raw || '').trim().replace(/\\n/g, '\n');
    if (!s) return '';
    const body = s.replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '').replace(/\s+/g, '');
    const lines = body.match(/.{1,64}/g) || [];
    return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----\n`;
};

/** Verify Teya's x-teya-signature (SHA256withRSA, base64) over the raw request body. */
export const verifyWebhookSignature = (rawBody, signature, publicKeyPem = process.env.TEYA_WEBHOOK_PUBLIC_KEY) => {
    const key = normalisePublicKey(publicKeyPem);
    if (!key || !signature) return false;
    try {
        const v = createVerify('RSA-SHA256');
        v.update(typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody);
        v.end();
        return v.verify(key, Buffer.from(String(signature), 'base64'));
    } catch {
        return false;
    }
};
