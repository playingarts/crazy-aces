/**
 * Vercel Serverless Function - Analytics Event Handler
 *
 * Stores game analytics events in Redis for later analysis.
 * Lightweight, fire-and-forget approach with batching support.
 *
 * Events are stored in Redis sorted sets for time-series queries
 * and counters for aggregated metrics.
 */

import Redis from 'ioredis';
import { setSecurityHeaders } from './lib/securityHeaders.js';
import { checkRateLimit, getClientIP } from './lib/rateLimit.js';

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

// Valid event types (whitelist for security)
const VALID_EVENTS = new Set([
    'game_started',
    'game_ended',
    'game_abandoned',
    'card_played',
    'card_drawn',
    'suit_selected',
    'invalid_card',
    'hint_shown',
    'first_action',
    'session_start',
    'session_end',
    'discount_offered',
    'claim_clicked',
    'email_form_opened',
    'email_submitted',
    'email_sent_success',
    'email_sent_failed',
    'rules_viewed',
    'play_again',
    'play_for_more'
]);

export default async function handler(req, res) {
    // Security headers
    setSecurityHeaders(res);

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

    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only accept POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Rate limiting: 100 analytics requests per IP per minute
    const clientIP = getClientIP(req);
    const rateLimit = await checkRateLimit(
        redis,
        `ratelimit:analytics:ip:${clientIP}`,
        100,
        60 // 1 minute
    );

    if (!rateLimit.allowed) {
        return res.status(429).json({
            success: false,
            error: 'Too many requests'
        });
    }

    try {
        const { events } = req.body;

        // Validate events array
        if (!Array.isArray(events) || events.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Events array required'
            });
        }

        // Limit batch size
        if (events.length > 50) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 50 events per batch'
            });
        }

        // Process events
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const pipeline = redis?.pipeline();
        let processedCount = 0;

        for (const event of events) {
            // Validate event structure
            if (!event.event || !VALID_EVENTS.has(event.event)) {
                continue; // Skip invalid events silently
            }

            // Sanitize event data (only keep allowed fields)
            const sanitizedEvent = sanitizeEvent(event);

            if (redis) {
                // Increment daily counter for this event type
                pipeline.hincrby(`analytics:daily:${today}`, event.event, 1);

                // Store detailed event in sorted set (timestamp as score for range queries)
                const eventData = JSON.stringify(sanitizedEvent);
                const timestamp = sanitizedEvent.timestamp || Date.now();
                pipeline.zadd(`analytics:events:${event.event}`, timestamp, eventData);

                // Expire detailed events after 30 days
                pipeline.expire(`analytics:events:${event.event}`, 60 * 60 * 24 * 30);

                // Update specific metrics based on event type
                updateMetrics(pipeline, today, sanitizedEvent);
            }

            processedCount++;
        }

        // Execute Redis pipeline
        if (redis && processedCount > 0) {
            await pipeline.exec();
        }

        // Always return success (fire-and-forget pattern)
        return res.status(200).json({
            success: true,
            processed: processedCount
        });

    } catch (error) {
        console.error('[Analytics] Error processing events:', error);
        // Return success anyway (analytics should never block user experience)
        return res.status(200).json({
            success: true,
            processed: 0
        });
    }
}

/**
 * Sanitize event data - only keep allowed fields
 */
function sanitizeEvent(event) {
    const allowed = {
        event: event.event,
        sessionId: typeof event.sessionId === 'string' ? event.sessionId.slice(0, 50) : undefined,
        device: ['mobile', 'desktop'].includes(event.device) ? event.device : undefined,
        timestamp: typeof event.timestamp === 'number' ? event.timestamp : Date.now()
    };

    // Event-specific fields (whitelist approach)
    switch (event.event) {
        case 'game_ended':
            if (['player', 'computer'].includes(event.winner)) {
                allowed.winner = event.winner;
            }
            if (typeof event.winStreak === 'number' && event.winStreak >= 0 && event.winStreak <= 100) {
                allowed.winStreak = event.winStreak;
            }
            if (typeof event.duration === 'number' && event.duration >= 0 && event.duration <= 3600000) {
                allowed.duration = event.duration;
            }
            if (typeof event.turns === 'number' && event.turns >= 0 && event.turns <= 1000) {
                allowed.turns = event.turns;
            }
            if (typeof event.cardsPlayed === 'number' && event.cardsPlayed >= 0) {
                allowed.cardsPlayed = event.cardsPlayed;
            }
            if (typeof event.cardsDrawn === 'number' && event.cardsDrawn >= 0) {
                allowed.cardsDrawn = event.cardsDrawn;
            }
            break;

        case 'card_played':
            if (['joker', 'ace', 'regular'].includes(event.cardType)) {
                allowed.cardType = event.cardType;
            }
            if (typeof event.rank === 'string' && event.rank.length <= 2) {
                allowed.rank = event.rank;
            }
            if (typeof event.suit === 'string' && event.suit.length === 1) {
                allowed.suit = event.suit;
            }
            break;

        case 'card_drawn':
            if (typeof event.playable === 'boolean') {
                allowed.playable = event.playable;
            }
            break;

        case 'discount_offered':
        case 'claim_clicked':
        case 'email_sent_success':
            if ([5, 10, 15].includes(event.percent)) {
                allowed.percent = event.percent;
            }
            if (typeof event.winStreak === 'number') {
                allowed.winStreak = event.winStreak;
            }
            break;

        case 'email_submitted':
            if (typeof event.valid === 'boolean') {
                allowed.valid = event.valid;
            }
            break;

        case 'email_sent_failed':
            if (typeof event.error === 'string') {
                allowed.error = event.error.slice(0, 100);
            }
            break;

        case 'rules_viewed':
            if (['auto', 'help_button'].includes(event.source)) {
                allowed.source = event.source;
            }
            break;

        case 'play_again':
            if (typeof event.afterWin === 'boolean') {
                allowed.afterWin = event.afterWin;
            }
            break;

        case 'play_for_more':
            if (typeof event.current === 'number') {
                allowed.current = event.current;
            }
            if (typeof event.target === 'number') {
                allowed.target = event.target;
            }
            break;

        case 'session_start':
            if (typeof event.referrer === 'string') {
                allowed.referrer = event.referrer.slice(0, 50);
            }
            if (typeof event.referrerFull === 'string') {
                allowed.referrerFull = event.referrerFull.slice(0, 200);
            }
            if (typeof event.isReturning === 'boolean') {
                allowed.isReturning = event.isReturning;
            }
            break;

        case 'session_end':
            if (typeof event.duration === 'number' && event.duration >= 0 && event.duration <= 86400000) {
                allowed.duration = event.duration;
            }
            if (typeof event.gamesPlayed === 'number' && event.gamesPlayed >= 0 && event.gamesPlayed <= 100) {
                allowed.gamesPlayed = event.gamesPlayed;
            }
            break;

        case 'first_action':
            if (typeof event.timeToAction === 'number' && event.timeToAction >= 0 && event.timeToAction <= 300000) {
                allowed.timeToAction = event.timeToAction;
            }
            break;

        case 'invalid_card':
            if (['joker', 'ace', 'regular'].includes(event.cardType)) {
                allowed.cardType = event.cardType;
            }
            if (typeof event.rank === 'string' && event.rank.length <= 2) {
                allowed.rank = event.rank;
            }
            if (typeof event.suit === 'string' && event.suit.length === 1) {
                allowed.suit = event.suit;
            }
            if (typeof event.reason === 'string') {
                allowed.reason = event.reason.slice(0, 50);
            }
            if (typeof event.attemptNumber === 'number' && event.attemptNumber >= 0 && event.attemptNumber <= 100) {
                allowed.attemptNumber = event.attemptNumber;
            }
            if (typeof event.turn === 'number' && event.turn >= 0 && event.turn <= 500) {
                allowed.turn = event.turn;
            }
            break;

        case 'hint_shown':
            if (['playable_card', 'draw_card'].includes(event.hintType)) {
                allowed.hintType = event.hintType;
            }
            if (typeof event.turn === 'number' && event.turn >= 0 && event.turn <= 500) {
                allowed.turn = event.turn;
            }
            break;

        case 'game_abandoned':
            if (typeof event.turn === 'number' && event.turn >= 0 && event.turn <= 500) {
                allowed.turn = event.turn;
            }
            if (typeof event.cardsPlayed === 'number' && event.cardsPlayed >= 0) {
                allowed.cardsPlayed = event.cardsPlayed;
            }
            if (typeof event.cardsDrawn === 'number' && event.cardsDrawn >= 0) {
                allowed.cardsDrawn = event.cardsDrawn;
            }
            if (typeof event.duration === 'number' && event.duration >= 0 && event.duration <= 3600000) {
                allowed.duration = event.duration;
            }
            break;

        case 'suit_selected':
            if (['ace', 'joker'].includes(event.cardType)) {
                allowed.cardType = event.cardType;
            }
            if (typeof event.suit === 'string' && event.suit.length === 1) {
                allowed.suit = event.suit;
            }
            if (typeof event.selectionTime === 'number' && event.selectionTime >= 0 && event.selectionTime <= 60000) {
                allowed.selectionTime = event.selectionTime;
            }
            break;
    }

    return allowed;
}

/**
 * Update specific metrics based on event type
 */
function updateMetrics(pipeline, today, event) {
    switch (event.event) {
        case 'game_started':
            // Track games by device
            if (event.device) {
                pipeline.hincrby(`analytics:daily:${today}`, `games_${event.device}`, 1);
            }
            break;

        case 'game_ended':
            // Track win/loss ratio
            if (event.winner === 'player') {
                pipeline.hincrby(`analytics:daily:${today}`, 'player_wins', 1);
            } else if (event.winner === 'computer') {
                pipeline.hincrby(`analytics:daily:${today}`, 'computer_wins', 1);
            }
            // Track average game duration (running sum for later averaging)
            if (event.duration) {
                pipeline.hincrby(`analytics:daily:${today}`, 'total_duration', event.duration);
            }
            break;

        case 'email_sent_success':
            // Track conversion by discount tier
            if (event.percent) {
                pipeline.hincrby(`analytics:daily:${today}`, `conversions_${event.percent}`, 1);
            }
            break;

        case 'card_played':
            // Track card type usage
            if (event.cardType) {
                pipeline.hincrby(`analytics:daily:${today}`, `cards_${event.cardType}`, 1);
            }
            break;

        case 'session_start':
            // Track new vs returning visitors
            if (event.isReturning) {
                pipeline.hincrby(`analytics:daily:${today}`, 'returning_visitors', 1);
            } else {
                pipeline.hincrby(`analytics:daily:${today}`, 'new_visitors', 1);
            }
            // Track referrers
            if (event.referrer) {
                pipeline.hincrby(`analytics:daily:${today}`, `referrer_${event.referrer}`, 1);
            }
            break;

        case 'first_action':
            // Track time to first action (running sum for averaging)
            if (event.timeToAction) {
                pipeline.hincrby(`analytics:daily:${today}`, 'total_time_to_first_action', event.timeToAction);
                pipeline.hincrby(`analytics:daily:${today}`, 'first_action_count', 1);
            }
            break;

        case 'invalid_card':
            // Track invalid card attempts
            pipeline.hincrby(`analytics:daily:${today}`, 'invalid_card_attempts', 1);
            break;

        case 'hint_shown':
            // Track hints by type
            if (event.hintType) {
                pipeline.hincrby(`analytics:daily:${today}`, `hints_${event.hintType}`, 1);
            }
            break;

        case 'game_abandoned':
            // Track game abandonment
            pipeline.hincrby(`analytics:daily:${today}`, 'games_abandoned', 1);
            if (event.turn !== undefined) {
                pipeline.hincrby(`analytics:daily:${today}`, 'abandon_turns_total', event.turn);
            }
            break;

        case 'suit_selected':
            // Track suit selection timing (running sum for averaging)
            if (event.selectionTime) {
                pipeline.hincrby(`analytics:daily:${today}`, 'total_suit_selection_time', event.selectionTime);
                pipeline.hincrby(`analytics:daily:${today}`, 'suit_selection_count', 1);
            }
            break;

        case 'session_end':
            // Track session duration (running sum for averaging)
            if (event.duration) {
                pipeline.hincrby(`analytics:daily:${today}`, 'total_session_duration', event.duration);
                pipeline.hincrby(`analytics:daily:${today}`, 'session_count', 1);
            }
            break;
    }
}
