/**
 * Shared Session Utilities
 * Used by both start-game.js and claim-discount.js
 */

import crypto from 'crypto';

// Session secret for HMAC signing (must be set in Vercel env vars)
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-in-production';

/**
 * Generate a cryptographically signed session token
 */
export function generateSessionToken(sessionId, winStreak = 0) {
    const payload = JSON.stringify({ sessionId, winStreak, timestamp: Date.now() });
    const signature = crypto
        .createHmac('sha256', SESSION_SECRET)
        .update(payload)
        .digest('hex');

    return Buffer.from(JSON.stringify({ payload, signature })).toString('base64');
}

/**
 * Verify and decode a session token
 */
export function verifySessionToken(token) {
    try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        const { payload, signature } = decoded;

        // Verify signature
        const expectedSignature = crypto
            .createHmac('sha256', SESSION_SECRET)
            .update(payload)
            .digest('hex');

        if (signature !== expectedSignature) {
            throw new Error('Invalid signature');
        }

        return JSON.parse(payload);
    } catch (error) {
        return null;
    }
}
