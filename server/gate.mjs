// Soft-launch gate for Play at Dillon. While PLAY_ACCESS_CODE is set, the public application
// endpoints require the code in the x-play-code header. Remove the env var to open to everyone.
import { timingSafeEqual } from 'node:crypto';

export const gateEnabled = () => !!process.env.PLAY_ACCESS_CODE;

export const codeMatches = (code) => {
    const expected = String(process.env.PLAY_ACCESS_CODE || '');
    const given = String(code || '');
    if (!expected) return true;
    if (given.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
};

/** @returns {boolean} true when the request may proceed */
export const passesGate = (req) => !gateEnabled() || codeMatches(req.headers['x-play-code']);
