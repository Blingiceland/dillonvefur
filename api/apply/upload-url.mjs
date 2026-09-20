// POST /api/apply/upload-url  { kind: 'press_photo' | 'poster', contentType, size }
// Returns a one-off signed upload target in bucket band-media under incoming/.
import { randomUUID } from 'node:crypto';
import { supabaseAdmin, BUCKET } from '../../server/supabase.mjs';
import { clientIp, hashIp, allowRequest } from '../../server/ratelimit.mjs';
import { passesGate } from '../../server/gate.mjs';

const MAX_BYTES = 8 * 1024 * 1024;
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    if (!passesGate(req)) { res.status(401).json({ error: 'Applications are not open yet.' }); return; }
    const { kind, contentType, size } = req.body || {};
    if (!['press_photo', 'poster'].includes(kind)) { res.status(400).json({ error: 'Unknown upload kind' }); return; }
    const ext = EXT[contentType];
    if (!ext) { res.status(400).json({ error: 'Use a JPG, PNG or WebP image' }); return; }
    if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) { res.status(400).json({ error: 'Images must be under 8 MB' }); return; }

    try {
        const ipHash = hashIp(clientIp(req));
        if (!(await allowRequest('upload_url', ipHash, 20, 60))) {
            res.status(429).json({ error: 'Too many uploads, please try again in an hour' });
            return;
        }
        const path = `incoming/${randomUUID()}.${ext}`;
        const { data, error } = await supabaseAdmin().storage.from(BUCKET).createSignedUploadUrl(path);
        if (error) throw error;
        res.status(200).json({ path, token: data.token });
    } catch (error) {
        console.error('upload-url failed', error);
        res.status(500).json({ error: 'Could not prepare the upload, please try again' });
    }
}
