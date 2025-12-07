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

        // Validate input
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
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

        // Strict email validation
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email address'
            });
        }

        // Normalize email
        const normalizedEmail = email.toLowerCase().trim();

        // Check if already claimed (using Redis in production, Map in dev)
        const claimKey = `claim:${normalizedEmail}`;

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

        // Validate win streak (must have at least 1 win)
        if (winStreak < 1) {
            return res.status(400).json({
                success: false,
                error: 'You must win at least one game to claim a discount'
            });
        }

        // Map win streak to discount tier (3+ wins = 15% discount)
        const discountTier = Math.min(winStreak, 3);

        // Get discount code from environment (server-side only!)
        const discountCodes = {
            1: process.env.DISCOUNT_CODE_5,
            2: process.env.DISCOUNT_CODE_10,
            3: process.env.DISCOUNT_CODE_15
        };

        const discountCode = discountCodes[discountTier];
        const discountPercent = discountTier === 1 ? 5 : discountTier === 2 ? 10 : 15;

        // Verify environment variables are set
        if (!discountCode || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
            console.error('Missing environment variables:', {
                hasDiscountCode: !!discountCode,
                hasResendKey: !!process.env.RESEND_API_KEY,
                hasEmailFrom: !!process.env.EMAIL_FROM,
                discountTier
            });
            return res.status(500).json({
                success: false,
                error: 'Server configuration error'
            });
        }

        // Send email via Resend
        try {
            console.log('Resend configuration:', {
                hasApiKey: !!process.env.RESEND_API_KEY,
                apiKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 8),
                from: process.env.EMAIL_FROM
            });
            console.log('Sending email via Resend:', {
                to: normalizedEmail,
                discountPercent,
                discountCode: discountCode.substring(0, 5) + '...'
            });

            const emailResult = await resend.emails.send({
                from: process.env.EMAIL_FROM,
                to: normalizedEmail,
                subject: `Your ${discountPercent}% Discount Code from Playing Arts!`,
                html: `
                    <h2>Congratulations! 🎉</h2>
                    <p>You've earned a <strong>${discountPercent}% discount</strong> by winning ${winStreak} game${winStreak > 1 ? 's' : ''} in a row at Crazy Aces!</p>

                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                        <p style="margin: 0; font-size: 14px; color: #666;">Your Discount Code:</p>
                        <p style="margin: 10px 0; font-size: 32px; font-weight: bold; color: #7B61FF; letter-spacing: 2px;">${discountCode}</p>
                    </div>

                    <p>Use this code at checkout to get ${discountPercent}% off any product at:</p>
                    <p><a href="https://playingarts.com/shop" style="color: #7B61FF; text-decoration: none; font-weight: bold;">https://playingarts.com/shop</a></p>

                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />

                    <p style="font-size: 12px; color: #999;">
                        This discount is valid for one-time use. Happy shopping!<br />
                        - The Playing Arts Team
                    </p>
                `
            });

            console.log('Resend API response:', JSON.stringify(emailResult, null, 2));

            // Check if Resend returned an error
            if (emailResult.error) {
                console.error('Resend API error:', emailResult.error);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to send email. Please try again later.',
                    details: emailResult.error
                });
            }

            if (!emailResult.data?.id) {
                console.error('Resend returned no email ID:', emailResult);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to send email. Please try again later.'
                });
            }

            console.log('Email sent successfully:', { id: emailResult.data.id });

        } catch (error) {
            console.error('Resend error:', error);
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
        console.error('Claim discount error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}
