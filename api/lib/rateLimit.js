/**
 * Rate Limiting Utility
 * Uses Upstash Redis for distributed rate limiting across Vercel serverless functions
 */

/**
 * Check and enforce rate limit for a given key
 * @param {Redis} redis - Redis client instance (null in dev mode)
 * @param {string} key - Rate limit key (e.g., 'ratelimit:claim:ip:192.168.1.1')
 * @param {number} limit - Maximum number of requests allowed
 * @param {number} windowSeconds - Time window in seconds
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: number}>}
 */
export async function checkRateLimit(redis, key, limit, windowSeconds) {
    // Development mode: no rate limiting
    if (!redis) {
        return { allowed: true, remaining: limit - 1, resetAt: Date.now() + windowSeconds * 1000 };
    }

    try {
        const now = Date.now();
        const windowStart = now - windowSeconds * 1000;

        // Use Redis sorted set with timestamps as scores
        // Remove expired entries
        await redis.zremrangebyscore(key, 0, windowStart);

        // Count current requests in window
        const currentCount = await redis.zcard(key);

        if (currentCount >= limit) {
            // Get oldest entry to calculate reset time
            const oldestEntries = await redis.zrange(key, 0, 0, 'WITHSCORES');
            const resetAt = oldestEntries.length > 1
                ? parseInt(oldestEntries[1]) + windowSeconds * 1000
                : now + windowSeconds * 1000;

            return {
                allowed: false,
                remaining: 0,
                resetAt
            };
        }

        // Add current request with timestamp
        await redis.zadd(key, now, `${now}-${Math.random()}`);

        // Set expiration on the key (cleanup)
        await redis.expire(key, windowSeconds);

        return {
            allowed: true,
            remaining: limit - currentCount - 1,
            resetAt: now + windowSeconds * 1000
        };
    } catch (error) {
        console.error('[ERROR] Rate limit check failed:', {
            errorType: error?.name || 'Unknown',
            timestamp: new Date().toISOString()
        });

        // On error, allow request (fail open for availability)
        return { allowed: true, remaining: limit - 1, resetAt: Date.now() + windowSeconds * 1000 };
    }
}

/**
 * Get client IP address from request headers
 */
export function getClientIP(req) {
    return (
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.connection?.remoteAddress ||
        'unknown'
    );
}
