import { supabase } from '../../utils/supabaseClient';

export const STATUS_LABEL = {
    pending_payment: 'Awaiting fee',
    submitted: 'New',
    changes_requested: 'Waiting on band',
    approved: 'Approved',
    rejected: 'Rejected',
    played: 'Played',
    cancelled: 'Cancelled',
    withdrawn: 'Withdrawn',
};

export const STATUS_COLOR = {
    pending_payment: '#888',
    submitted: '#c89b3c',
    changes_requested: '#e0a44b',
    approved: '#7bc07b',
    rejected: '#b04a4a',
    played: '#8aa8d8',
    cancelled: '#b04a4a',
    withdrawn: '#888',
};

export const FEE_LABEL = {
    none: 'No fee',
    pending: 'Fee pending',
    paid: 'Fee paid',
    refund_pending: 'Refund pending',
    refunded: 'Refunded',
    refund_failed: 'Refund failed',
};

export const AUDIENCE_LABEL = { under_30: 'Under 30', '30_60': '30–60', '60_100': '60–100', over_100: 'Over 100' };

export const prettyDate = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

export const mediaUrl = (path) => (path ? `${process.env.REACT_APP_SUPABASE_URL}/storage/v1/object/public/band-media/${path}` : null);

/** Call the admin API with the current session's access token. */
export const adminAction = async (session, body) => {
    const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
};

export const loadApplications = async () => {
    const { data, error } = await supabase
        .from('applications')
        .select('id, ref, status, fee_status, band_name, genre, preferred_date, alt_date_1, alt_date_2, confirmed_date, entry_type, ticket_price_isk, audience_estimate, created_at, poster_path, press_photo_path')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

export const loadApplication = async (id) => {
    const { data, error } = await supabase.from('applications').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
};

export const loadLog = async (id) => {
    const { data, error } = await supabase.from('application_log').select('*').eq('application_id', id).order('at', { ascending: false });
    if (error) throw error;
    return data;
};
