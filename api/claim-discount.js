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
import { verifySessionToken } from './lib/session.js';

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

        // Get EmailJS template based on discount tier
        const templateIds = {
            1: process.env.EMAILJS_TEMPLATE_5,
            2: process.env.EMAILJS_TEMPLATE_10,
            3: process.env.EMAILJS_TEMPLATE_15
        };

        const templateId = templateIds[discountTier];

        // Verify environment variables are set
        if (!discountCode || !templateId) {
            console.error('Missing environment variables:', {
                hasDiscountCode: !!discountCode,
                hasTemplateId: !!templateId,
                discountTier,
                hasServiceId: !!process.env.EMAILJS_SERVICE_ID,
                hasPublicKey: !!process.env.EMAILJS_PUBLIC_KEY
            });
            return res.status(500).json({
                success: false,
                error: 'Server configuration error'
            });
        }

        // Send email via EmailJS (server-side with private key in strict mode)
        // In strict mode, use accessToken instead of user_id
        const emailPayload = {
            service_id: process.env.EMAILJS_SERVICE_ID,
            template_id: templateId,
            accessToken: process.env.EMAILJS_PRIVATE_KEY, // Private key for server-side in strict mode
            template_params: {
                to_email: normalizedEmail,
                discount_code: discountCode,
                discount: discountPercent
            }
        };

        console.log('Sending email to EmailJS (server-side strict mode):', {
            service_id: emailPayload.service_id?.substring(0, 10) + '...',
            template_id: emailPayload.template_id,
            hasPrivateKey: !!process.env.EMAILJS_PRIVATE_KEY,
            privateKeyPreview: process.env.EMAILJS_PRIVATE_KEY?.substring(0, 10) + '...',
            to_email: normalizedEmail
        });

        const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailPayload)
        });

        if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            console.error('EmailJS error response:', {
                status: emailResponse.status,
                statusText: emailResponse.statusText,
                errorText
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
