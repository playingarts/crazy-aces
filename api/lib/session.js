/**
 * Shared Session Utilities
 * Used by both start-game.js and claim-discount.js
 */

import crypto from 'crypto';

// Session secret for HMAC signing (must be set in Vercel env vars)
const SESSION_SECRET = process.env.SESSION_SECRET;

// Validate SESSION_SECRET on module load (fail fast in production)
if (!SESSION_SECRET) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
        throw new Error('CRITICAL: SESSION_SECRET environment variable must be set in production');
    }
    console.warn('WARNING: Using development mode without SESSION_SECRET. This is insecure!');
}

// Validate SECRET strength (minimum 32 characters in production)
if (SESSION_SECRET && SESSION_SECRET.length < 32) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
        throw new Error('CRITICAL: SESSION_SECRET must be at least 32 characters long');
    }
    console.warn('WARNING: SESSION_SECRET is too short. Use at least 32 characters.');
}

// Development fallback (only used in local dev)
const SAFE_SECRET = SESSION_SECRET || 'dev-only-secret-DO-NOT-USE-IN-PRODUCTION-' + crypto.randomBytes(16).toString('hex');

/**
 * Generate a cryptographically signed session token
 */
export function generateSessionToken(sessionId, winStreak = 0) {
    const payload = JSON.stringify({ sessionId, winStreak, timestamp: Date.now() });
    const signature = crypto
        .createHmac('sha256', SAFE_SECRET)
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

        // Verify signature using timing-safe comparison
        const expectedSignature = crypto
            .createHmac('sha256', SAFE_SECRET)
            .update(payload)
            .digest('hex');

        // Use timingSafeEqual to prevent timing attacks
        const signatureBuffer = Buffer.from(signature, 'hex');
        const expectedBuffer = Buffer.from(expectedSignature, 'hex');

        if (signatureBuffer.length !== expectedBuffer.length) {
            throw new Error('Invalid signature length');
        }

        if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
            throw new Error('Invalid signature');
        }

        return JSON.parse(payload);
    } catch (error) {
        return null;
    }
}
