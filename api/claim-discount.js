/**
 * Vercel Serverless Function - Secure Discount Claim Handler
 *
 * This function:
 * 1. Validates session token (prevents win streak manipulation)
 * 2. Validates email format
 * 3. Checks if email has already claimed (using Upstash Redis)
 * 4. Retrieves win streak from server-side session
 * 5. Generates appropriate discount code
 * 6. Sends email via EmailJS server-side
 * 7. Stores claim record to prevent duplicates
 *
 * Security Features:
 * - Session token validation (HMAC-signed, can't be forged)
 * - Server-side win streak tracking (can't be manipulated by client)
 * - Persistent claim tracking with Redis
 * - Rate limiting per email
 * - Discount codes never exposed to client
 * - EmailJS credentials server-side only
 */

import Redis from 'ioredis';
import { Resend } from 'resend';
import { verifySessionToken } from './lib/session.js';
import { checkRateLimit, getClientIP } from './lib/rateLimit.js';
import { escapeHtml } from './lib/htmlEscape.js';
import { validateEmail, hashEmail } from './lib/emailValidation.js';
import { setSecurityHeaders } from './lib/securityHeaders.js';
import { notifyDiscountClaimed } from './lib/telegram.js';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Redis client (uses KV_REST_API_REDIS_URL env var)
const redis = process.env.KV_REST_API_REDIS_URL
    ? new Redis(process.env.KV_REST_API_REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            if (times > 3) return null;
            return Math.min(times * 50, 2000);
        }
    })
    : null;

// Fallback in-memory store for local development (when Redis not configured)
const claimedEmails = new Map();

export default async function handler(req, res) {
    // Security headers (applied to all responses)
    setSecurityHeaders(res);

    // CORS headers
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173', // Vite dev server
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
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }

    try {
        const { email, sessionToken } = req.body;

        // Test email whitelist - bypasses rate limiting for testing
        const testEmails = ['korzinin@gmail.com'];
        const emailForRateCheck = email ? email.trim().toLowerCase() : '';
        const isTestEmailForRate = testEmails.includes(emailForRateCheck);

        // Rate limiting: Prevent spam and abuse (skip for test emails)
        if (!isTestEmailForRate) {
            const clientIP = getClientIP(req);

            // IP-based rate limit: 3 discount claims per IP per hour
            const ipRateLimit = await checkRateLimit(
                redis,
                `ratelimit:claim:ip:${clientIP}`,
                3,
                3600 // 1 hour
            );

            if (!ipRateLimit.allowed) {
                const resetDate = new Date(ipRateLimit.resetAt);
                return res.status(429).json({
                    success: false,
                    error: 'Too many discount requests. Please try again later.',
                    retryAfter: Math.ceil((ipRateLimit.resetAt - Date.now()) / 1000)
                });
            }
        }

        // Validate session token
        if (!sessionToken) {
            return res.status(400).json({
                success: false,
                error: 'Session token is required'
            });
        }

        // Verify session token and get win streak from server
        const tokenData = verifySessionToken(sessionToken);
        if (!tokenData) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired session token'
            });
        }

        const { sessionId, winStreak: serverWinStreak } = tokenData;

        // Additional validation: Get session from Redis to ensure it's still valid
        let winStreak;
        if (redis) {
            const sessionDataStr = await redis.get(`session:${sessionId}`);
            if (!sessionDataStr) {
                return res.status(404).json({
                    success: false,
                    error: 'Session expired. Please play a new game.'
                });
            }

            const sessionData = JSON.parse(sessionDataStr);

            // Use the win streak from Redis (most authoritative source)
            winStreak = sessionData.winStreak;
        } else {
            // Development fallback: use win streak from token
            winStreak = serverWinStreak;
        }

        // Comprehensive email validation (blocks disposables, normalizes Gmail)
        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            return res.status(400).json({
                success: false,
                error: emailValidation.error
            });
        }

        // Use normalized email (prevents Gmail dot/plus tricks and duplicates)
        const normalizedEmail = emailValidation.normalized;

        // Hash email for privacy protection in Redis (prevents email exposure if Redis is compromised)
        const emailHash = hashEmail(normalizedEmail);

        // Check if already claimed (using Redis in production, Map in dev)
        // Use hashed email in Redis key for privacy
        const claimKey = `claim:${emailHash}`;

        // Use test email whitelist from rate limit check (also bypasses claim check)
        const isTestEmail = testEmails.includes(normalizedEmail) || testEmails.includes(email.trim().toLowerCase());

        if (!isTestEmail) {
            if (redis) {
                // Production: Check Redis
                const existingClaim = await redis.get(claimKey);
                if (existingClaim) {
                    return res.status(409).json({
                        success: false,
                        error: 'This email has already claimed a discount'
                    });
                }
            } else {
                // Development: Check in-memory Map
                if (claimedEmails.has(normalizedEmail)) {
                    return res.status(409).json({
                        success: false,
                        error: 'This email has already claimed a discount'
                    });
                }
            }
        }

        // NEW SYSTEM: Calculate discount based on win streak
        // - Play 1 game (win or lose) = 5% Welcome Bonus
        // - WIN 1 game = 10%
        // - WIN 2+ games in a row = 15%
        let discountPercent;
        if (winStreak >= 2) {
            discountPercent = 15; // 2+ consecutive wins
        } else if (winStreak >= 1) {
            discountPercent = 10; // 1 win
        } else {
            discountPercent = 5; // Played at least 1 game (session exists = game was played)
        }

        // Get discount code from environment (server-side only!)
        const discountCodes = {
            5: process.env.DISCOUNT_CODE_5,
            10: process.env.DISCOUNT_CODE_10,
            15: process.env.DISCOUNT_CODE_15
        };

        const discountCode = discountCodes[discountPercent];

        // Verify environment variables are set
        if (!discountCode || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
            console.error('Missing environment variables:', {
                hasDiscountCode: !!discountCode,
                hasResendKey: !!process.env.RESEND_API_KEY,
                hasEmailFrom: !!process.env.EMAIL_FROM,
                discountPercent
            });
            return res.status(500).json({
                success: false,
                error: 'Server configuration error'
            });
        }

        // Send email via Resend
        try {
            // Log only non-sensitive information
            if (process.env.NODE_ENV !== 'production') {
                console.log('[DEV] Preparing to send discount email:', {
                    discountPercent,
                    hasValidConfig: !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
                });
            }

            // Escape all dynamic content to prevent HTML injection
            const safeDiscountPercent = escapeHtml(String(discountPercent));
            const safeWinStreak = escapeHtml(String(winStreak));
            const safeDiscountCode = escapeHtml(discountCode);

            // Determine bonus tier name and greeting for email
            let bonusName = 'Welcome Bonus';
            let greeting = 'Welcome, Card Collector! 🎉';
            if (discountPercent === 15) {
                bonusName = 'Champion Bonus';
                greeting = 'Champion Status Unlocked! 🏆';
            } else if (discountPercent === 10) {
                bonusName = 'Winner Bonus';
                greeting = "You're a Winner! 🏆";
            }

            // Determine achievement text
            let achievementText = 'playing Crazy Aces';
            if (winStreak >= 2) {
                achievementText = `winning ${safeWinStreak} games in a row`;
            } else if (winStreak >= 1) {
                achievementText = 'winning at Crazy Aces';
            }

            const emailResult = await resend.emails.send({
                from: process.env.EMAIL_FROM,
                to: normalizedEmail,
                subject: `Your ${safeDiscountPercent}% ${bonusName} Awaits - Playing Arts`,
                html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Discount Code - Playing Arts</title>
    <style>
        body { margin:0; padding:0; background:#fff; }
        table { border-collapse:collapse; }
        @media (max-width: 600px) {
            .container { width: 100% !important; padding: 15px !important; }
            h2 { font-size: 24px !important; }
            .discount-code { font-size: 28px !important; letter-spacing: 1px !important; }
            .button-cell a { padding: 10px 20px !important; font-size: 14px !important; }
        }
    </style>
</head>
<body>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
            <td class="container" style="padding:40px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px; margin:0 auto;">
                    <tr>
                        <td style="padding:0 0 20px 0;">
                            <h2 style="margin:0; font-size:28px; font-weight:bold; line-height:1.3; color:#000; font-family:'Segoe UI', Arial, sans-serif;">
                                ${greeting}
                            </h2>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 0 25px 0;">
                            <p style="margin:0; font-size:16px; line-height:1.6; color:#333; font-family:'Segoe UI', Arial, sans-serif;">
                                You've earned a <strong>${safeDiscountPercent}% ${bonusName}</strong> for ${achievementText}!
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 0 25px 0;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f5; border-radius:8px;">
                                <tr>
                                    <td style="text-align:center; padding:20px;">
                                        <p style="margin:0 0 12px 0; font-size:13px; color:#666; font-family:'Segoe UI', Arial, sans-serif; text-transform:uppercase; letter-spacing:1px;">
                                            Your Discount Code
                                        </p>
                                        <p class="discount-code" style="margin:0; font-size:32px; font-weight:bold; color:#7B61FF; letter-spacing:2px; word-break:break-all; font-family:monospace;">
                                            ${safeDiscountCode}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 0 25px 0; text-align:center;">
                            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                                <tr>
                                    <td class="button-cell" style="background:#7B61FF; border-radius:6px; text-align:center;">
                                        <a href="https://playingarts.com/shop" style="display:block; padding:12px 28px; color:white; text-decoration:none; font-weight:bold; font-size:16px; font-family:'Segoe UI', Arial, sans-serif; line-height:1.4;">
                                            Shop Now
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 0 30px 0; text-align:center;">
                            <p style="margin:0; font-size:14px; line-height:1.5; color:#666; font-family:'Segoe UI', Arial, sans-serif;">
                                Use code at checkout for ${safeDiscountPercent}% off your order.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:30px 0;">
                            <div style="height:1px; background:#e0e0e0; width:100%;"></div>
                        </td>
                    </tr>
                    <tr>
                        <td style="text-align:center;">
                            <p style="margin:0; font-size:14px; line-height:1.5; color:#666; font-family:'Segoe UI', Arial, sans-serif;">
                                Happy collecting,<br>
                                <strong>Playing Arts</strong>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
                `
            });

            // Check if Resend returned an error
            if (emailResult.error) {
                console.error('[ERROR] Email send failed:', {
                    errorType: emailResult.error?.name || 'Unknown',
                    errorMessage: emailResult.error?.message || 'No message',
                    errorCode: emailResult.error?.statusCode || 'No code',
                    fromAddress: process.env.EMAIL_FROM,
                    timestamp: new Date().toISOString()
                });
                return res.status(500).json({
                    success: false,
                    error: 'Failed to send email. Please try again later.'
                });
            }

            if (!emailResult.data?.id) {
                console.error('[ERROR] Email send failed: No email ID returned');
                return res.status(500).json({
                    success: false,
                    error: 'Failed to send email. Please try again later.'
                });
            }

            // Log success without sensitive data
            console.log('[SUCCESS] Discount email sent:', {
                emailId: emailResult.data.id,
                discountPercent,
                timestamp: new Date().toISOString()
            });

            // Send Telegram notification (await so it completes before function ends)
            try {
                await notifyDiscountClaimed({
                    email: normalizedEmail,
                    discount: discountPercent,
                    winStreak,
                    device: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop'
                });
            } catch (telegramErr) {
                console.error('[Telegram] Notification failed:', telegramErr.message);
            }

        } catch (error) {
            console.error('[ERROR] Email service exception:', {
                errorType: error?.name || 'Unknown',
                errorMessage: error?.message || 'No message',
                fromAddress: process.env.EMAIL_FROM,
                timestamp: new Date().toISOString()
            });
            return res.status(500).json({
                success: false,
                error: 'Failed to send email. Please try again later.'
            });
        }

        // Mark email as claimed
        const claimData = {
            winStreak,
            discountPercent,
            claimedAt: new Date().toISOString(),
            ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown'
        };

        if (redis) {
            // Production: Store in Redis (never expires to prevent re-claiming)
            await redis.set(claimKey, JSON.stringify(claimData));

            // Invalidate session after successful claim (defense in depth)
            // This prevents the same session from being used to claim again
            await redis.del(`session:${sessionId}`);
        } else {
            // Development: Store in Map
            claimedEmails.set(normalizedEmail, claimData);
        }

        // Success!
        return res.status(200).json({
            success: true,
            message: 'Discount code sent to your email!'
        });

    } catch (error) {
        console.error('[ERROR] Discount claim failed:', {
            errorType: error?.name || 'Unknown',
            timestamp: new Date().toISOString()
        });
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}
