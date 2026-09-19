import { createHash } from 'node:crypto';
import { supabaseAdmin } from './supabase.mjs';

export const clientIp = (req) => {
    const fwd = req.headers['x-forwarded-for'];
    const first = Array.isArray(fwd) ? fwd[0] : String(fwd || '').split(',')[0];
    return (first || req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown').trim();
};

export const hashIp = (ip) =>
    createHash('sha256').update(`${process.env.IP_HASH_SALT || 'dillon'}:${ip}`).digest('hex').slice(0, 32);

/**
 * Count recent requests of `kind` from this IP and record this one.
 * @returns {Promise<boolean>} true when the request is allowed
 */
export const allowRequest = async (kind, ipHash, max, windowMinutes) => {
    const db = supabaseAdmin();
    const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
    const { count, error } = await db
        .from('request_log')
        .select('id', { count: 'exact', head: true })
        .eq('kind', kind)
        .eq('ip_hash', ipHash)
        .gte('created_at', since);
    if (error) throw error;
    if ((count || 0) >= max) return false;
    await db.from('request_log').insert({ kind, ip_hash: ipHash });
    return true;
};
