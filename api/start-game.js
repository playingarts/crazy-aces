/**
 * Vercel Serverless Function - Game Session Management
 *
 * This function creates and manages secure game sessions to prevent
 * win streak manipulation. Each session is cryptographically signed
 * and tracked server-side in Redis.
 *
 * Security Features:
 * - HMAC-signed session tokens (can't be forged)
 * - Server-side win streak tracking (can't be manipulated)
 * - Session expiration (1 hour timeout)
 */

import Redis from 'ioredis';
import crypto from 'crypto';

// Initialize Redis client
const redis = process.env.KV_REST_API_REDIS_URL
    ? new Redis(process.env.KV_REST_API_REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            if (times > 3) return null;
            return Math.min(times * 50, 2000);
        }
    })
    : null;

// Session secret for HMAC signing (must be set in Vercel env vars)
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-in-production';

// Session timeout (1 hour)
const SESSION_TIMEOUT = 3600; // seconds

/**
 * Generate a cryptographically signed session token
 */
function generateSessionToken(sessionId, winStreak = 0) {
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
function verifySessionToken(token) {
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

export default async function handler(req, res) {
    // CORS headers
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://playingarts.github.io',
        'https://play.playingarts.com'
    ];

    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // START NEW SESSION
        if (req.method === 'POST' && !req.body.sessionToken) {
            // Generate new session
            const sessionId = crypto.randomBytes(32).toString('hex');
            const sessionData = {
                id: sessionId,
                winStreak: 0,
                gamesPlayed: 0,
                createdAt: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
                ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown'
            };

            if (redis) {
                // Store in Redis with expiration
                await redis.setex(`session:${sessionId}`, SESSION_TIMEOUT, JSON.stringify(sessionData));
            }

            // Generate signed token
            const token = generateSessionToken(sessionId, 0);

            return res.status(200).json({
                success: true,
                sessionToken: token,
                winStreak: 0
            });
        }

        // UPDATE SESSION (record win/loss)
        if (req.method === 'POST' && req.body.sessionToken) {
            const { sessionToken, won } = req.body;

            // Verify token
            const tokenData = verifySessionToken(sessionToken);
            if (!tokenData) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid session token'
                });
            }

            const { sessionId } = tokenData;

            if (redis) {
                // Get session from Redis
                const sessionDataStr = await redis.get(`session:${sessionId}`);
                if (!sessionDataStr) {
                    return res.status(404).json({
                        success: false,
                        error: 'Session expired or not found'
                    });
                }

                const sessionData = JSON.parse(sessionDataStr);

                // Update win streak
                if (won) {
                    sessionData.winStreak += 1;
                } else {
                    sessionData.winStreak = 0; // Reset on loss
                }
                sessionData.gamesPlayed += 1;
                sessionData.lastActivity = new Date().toISOString();

                // Save updated session
                await redis.setex(`session:${sessionId}`, SESSION_TIMEOUT, JSON.stringify(sessionData));

                // Generate new token with updated win streak
                const newToken = generateSessionToken(sessionId, sessionData.winStreak);

                return res.status(200).json({
                    success: true,
                    sessionToken: newToken,
                    winStreak: sessionData.winStreak
                });
            } else {
                // Development fallback (just trust client for now)
                return res.status(200).json({
                    success: true,
                    sessionToken,
                    winStreak: tokenData.winStreak + (won ? 1 : -tokenData.winStreak)
                });
            }
        }

        // GET SESSION INFO
        if (req.method === 'GET') {
            const sessionToken = req.query.token;

            if (!sessionToken) {
                return res.status(400).json({
                    success: false,
                    error: 'Session token required'
                });
            }

            const tokenData = verifySessionToken(sessionToken);
            if (!tokenData) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid session token'
                });
            }

            const { sessionId } = tokenData;

            if (redis) {
                const sessionDataStr = await redis.get(`session:${sessionId}`);
                if (!sessionDataStr) {
                    return res.status(404).json({
                        success: false,
                        error: 'Session expired'
                    });
                }

                const sessionData = JSON.parse(sessionDataStr);
                return res.status(200).json({
                    success: true,
                    winStreak: sessionData.winStreak,
                    gamesPlayed: sessionData.gamesPlayed
                });
            }

            return res.status(200).json({
                success: true,
                winStreak: tokenData.winStreak
            });
        }

        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });

    } catch (error) {
        console.error('Session error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

// Export helper functions for use in other API routes
export { verifySessionToken };
