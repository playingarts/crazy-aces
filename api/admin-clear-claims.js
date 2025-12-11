/**
 * Admin endpoint to clear claimed emails
 * Protected by API key
 */

import Redis from 'ioredis';

const redis = process.env.KV_REST_API_REDIS_URL
    ? new Redis(process.env.KV_REST_API_REDIS_URL)
    : null;

export default async function handler(req, res) {
    // Only accept POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check API key
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.ANALYTICS_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!redis) {
        return res.status(500).json({ error: 'Redis not configured' });
    }

    try {
        // Find all claim keys
        const keys = await redis.keys('claim:*');

        if (keys.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No claims to clear',
                deleted: 0
            });
        }

        // Delete all claim keys
        await redis.del(...keys);

        return res.status(200).json({
            success: true,
            message: `Cleared ${keys.length} claimed emails`,
            deleted: keys.length
        });

    } catch (error) {
        console.error('Error clearing claims:', error);
        return res.status(500).json({ error: 'Failed to clear claims' });
    }
}
