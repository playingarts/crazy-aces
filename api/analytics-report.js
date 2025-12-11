/**
 * Vercel Serverless Function - Analytics Report
 *
 * Returns analytics data from Redis for viewing metrics.
 * Protected by a simple API key for security.
 */

import Redis from 'ioredis';
import { setSecurityHeaders } from './lib/securityHeaders.js';

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

    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only accept GET
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Check API key (use ANALYTICS_API_KEY env var, or allow if not set for dev)
    const apiKey = req.headers['x-api-key'] || req.query.key;
    const expectedKey = process.env.ANALYTICS_API_KEY;

    if (expectedKey && apiKey !== expectedKey) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!redis) {
        return res.status(500).json({ success: false, error: 'Redis not configured' });
    }

    try {
        // Get date range (default: last 7 days)
        const days = parseInt(req.query.days) || 7;
        const dates = [];
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
        }

        // Fetch daily metrics for each date
        const dailyMetrics = {};
        const totals = {
            game_started: 0,
            game_ended: 0,
            player_wins: 0,
            computer_wins: 0,
            card_played: 0,
            card_drawn: 0,
            discount_offered: 0,
            claim_clicked: 0,
            email_form_opened: 0,
            email_submitted: 0,
            email_sent_success: 0,
            email_sent_failed: 0,
            rules_viewed: 0,
            play_again: 0,
            play_for_more: 0,
            total_duration: 0,
            // New metrics
            new_visitors: 0,
            returning_visitors: 0,
            invalid_card_attempts: 0,
            total_time_to_first_action: 0,
            first_action_count: 0,
            games_abandoned: 0,
            abandon_turns_total: 0,
            hints_playable_card: 0,
            hints_draw_card: 0,
            total_suit_selection_time: 0,
            suit_selection_count: 0,
            total_session_duration: 0,
            session_count: 0
        };

        for (const date of dates) {
            const data = await redis.hgetall(`analytics:daily:${date}`);
            if (data && Object.keys(data).length > 0) {
                dailyMetrics[date] = {};
                for (const [key, value] of Object.entries(data)) {
                    const numValue = parseInt(value) || 0;
                    dailyMetrics[date][key] = numValue;
                    if (totals.hasOwnProperty(key)) {
                        totals[key] += numValue;
                    }
                }
            }
        }

        // Calculate derived metrics
        const winRate = totals.game_ended > 0
            ? ((totals.player_wins / totals.game_ended) * 100).toFixed(1)
            : 0;

        const conversionRate = totals.player_wins > 0
            ? ((totals.email_sent_success / totals.player_wins) * 100).toFixed(1)
            : 0;

        const avgGameDuration = totals.game_ended > 0
            ? Math.round(totals.total_duration / totals.game_ended / 1000)
            : 0;

        const funnelDropoff = {
            discount_to_claim: totals.discount_offered > 0
                ? ((totals.claim_clicked / totals.discount_offered) * 100).toFixed(1)
                : 0,
            claim_to_submit: totals.claim_clicked > 0
                ? ((totals.email_submitted / totals.claim_clicked) * 100).toFixed(1)
                : 0,
            submit_to_success: totals.email_submitted > 0
                ? ((totals.email_sent_success / totals.email_submitted) * 100).toFixed(1)
                : 0
        };

        // Calculate new derived metrics
        const avgTimeToFirstAction = totals.first_action_count > 0
            ? Math.round(totals.total_time_to_first_action / totals.first_action_count / 1000)
            : 0;

        const avgSuitSelectionTime = totals.suit_selection_count > 0
            ? Math.round(totals.total_suit_selection_time / totals.suit_selection_count / 1000)
            : 0;

        const avgSessionDuration = totals.session_count > 0
            ? Math.round(totals.total_session_duration / totals.session_count / 1000)
            : 0;

        const avgAbandonTurn = totals.games_abandoned > 0
            ? Math.round(totals.abandon_turns_total / totals.games_abandoned)
            : 0;

        const totalVisitors = totals.new_visitors + totals.returning_visitors;
        const returningRate = totalVisitors > 0
            ? ((totals.returning_visitors / totalVisitors) * 100).toFixed(1)
            : 0;

        return res.status(200).json({
            success: true,
            period: `Last ${days} days`,
            generated: new Date().toISOString(),
            summary: {
                total_games: totals.game_ended,
                player_wins: totals.player_wins,
                computer_wins: totals.computer_wins,
                win_rate: `${winRate}%`,
                avg_game_duration: `${avgGameDuration}s`,
                conversion_rate: `${conversionRate}%`,
                emails_sent: totals.email_sent_success
            },
            visitors: {
                total: totalVisitors,
                new: totals.new_visitors,
                returning: totals.returning_visitors,
                returning_rate: `${returningRate}%`,
                avg_session_duration: `${avgSessionDuration}s`
            },
            user_behavior: {
                avg_time_to_first_action: `${avgTimeToFirstAction}s`,
                invalid_card_attempts: totals.invalid_card_attempts,
                hints_playable: totals.hints_playable_card,
                hints_draw: totals.hints_draw_card,
                avg_suit_selection_time: `${avgSuitSelectionTime}s`,
                games_abandoned: totals.games_abandoned,
                avg_abandon_turn: avgAbandonTurn
            },
            funnel: {
                games_won: totals.player_wins,
                discount_offered: totals.discount_offered,
                claim_clicked: totals.claim_clicked,
                email_submitted: totals.email_submitted,
                email_success: totals.email_sent_success,
                dropoff_rates: funnelDropoff
            },
            engagement: {
                rules_viewed: totals.rules_viewed,
                play_again: totals.play_again,
                play_for_more: totals.play_for_more,
                cards_played: totals.card_played,
                cards_drawn: totals.card_drawn
            },
            devices: {
                mobile: totals.games_mobile || 0,
                desktop: totals.games_desktop || 0
            },
            daily: dailyMetrics
        });

    } catch (error) {
        console.error('[Analytics Report] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
    }
}
