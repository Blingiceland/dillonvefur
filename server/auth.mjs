import { supabaseAdmin } from './supabase.mjs';

const ADMIN_EMAIL = () => (process.env.ADMIN_EMAIL || 'dillon@dillon.is').toLowerCase();

/**
 * Verify the Supabase access token from the Authorization header and make sure it belongs
 * to the owner. Returns the user or null.
 */
export const requireAdmin = async (req) => {
    const header = req.headers.authorization || req.headers.Authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) return null;
    const { data, error } = await supabaseAdmin().auth.getUser(token);
    if (error || !data?.user?.email) return null;
    if (data.user.email.toLowerCase() !== ADMIN_EMAIL()) return null;
    return data.user;
};
