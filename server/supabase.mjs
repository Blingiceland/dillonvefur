// Service-role Supabase client for serverless functions only. Never import from src/.
import { createClient } from '@supabase/supabase-js';

let client;

export const supabaseAdmin = () => {
    if (!client) {
        const url = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured');
        client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    }
    return client;
};

export const BUCKET = 'band-media';

export const publicMediaUrl = (path) => {
    if (!path) return null;
    const url = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    return `${url}/storage/v1/object/public/${BUCKET}/${path}`;
};
