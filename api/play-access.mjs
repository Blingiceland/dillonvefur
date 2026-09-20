// POST /api/play-access { code } → 204 when the soft-launch code is right (or no gate), 401 otherwise
import { gateEnabled, codeMatches } from '../server/gate.mjs';

export default async function handler(req, res) {
    if (req.method === 'GET') { res.status(200).json({ gated: gateEnabled() }); return; }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); res.status(405).json({ error: 'Method not allowed' }); return; }
    if (codeMatches((req.body || {}).code)) { res.status(204).send(''); return; }
    res.status(401).json({ error: 'Wrong access code' });
}
