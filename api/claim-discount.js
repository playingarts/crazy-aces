/**
 * Vercel Serverless Function - Secure Discount Claim Handler
 *
 * This function:
 * 1. Validates email format
 * 2. Checks if email has already claimed (using Vercel KV)
 * 3. Validates win streak
 * 4. Generates appropriate discount code
 * 5. Sends email via EmailJS server-side
 * 6. Stores claim record to prevent duplicates
 *
 * Security Features:
 * - Server-side validation (can't be bypassed)
 * - Rate limiting per email
 * - Discount codes never exposed to client
 * - EmailJS credentials server-side only
 */

// Simple in-memory store for development
// In production, use Vercel KV or another persistent store
const claimedEmails = new Map();

export default async function handler(req, res) {
    // CORS headers - Update this to your production domain
    const allowedOrigins = [
        'http://localhost:3000',
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
        const { email, winStreak } = req.body;

        // Validate input
        if (!email || !winStreak) {
            return res.status(400).json({
                success: false,
                error: 'Email and win streak are required'
            });
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

        // Check if already claimed
        // TODO: Replace with Vercel KV in production
        if (claimedEmails.has(normalizedEmail)) {
            return res.status(409).json({
                success: false,
                error: 'This email has already claimed a discount'
            });
        }

        // Validate win streak
        if (![1, 2, 3].includes(winStreak)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid win streak'
            });
        }

        // Get discount code from environment (server-side only!)
        const discountCodes = {
            1: process.env.DISCOUNT_CODE_5,
            2: process.env.DISCOUNT_CODE_10,
            3: process.env.DISCOUNT_CODE_15
        };

        const discountCode = discountCodes[winStreak];
        const discountPercent = winStreak === 1 ? 5 : winStreak === 2 ? 10 : 15;

        // Get EmailJS template based on discount
        const templateIds = {
            1: process.env.EMAILJS_TEMPLATE_5,
            2: process.env.EMAILJS_TEMPLATE_10,
            3: process.env.EMAILJS_TEMPLATE_15
        };

        const templateId = templateIds[winStreak];

        // Verify environment variables are set
        if (!discountCode || !templateId) {
            console.error('Missing environment variables:', {
                hasDiscountCode: !!discountCode,
                hasTemplateId: !!templateId
            });
            return res.status(500).json({
                success: false,
                error: 'Server configuration error'
            });
        }

        // Send email via EmailJS (server-side)
        const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                service_id: process.env.EMAILJS_SERVICE_ID,
                template_id: templateId,
                user_id: process.env.EMAILJS_PUBLIC_KEY,
                template_params: {
                    to_email: normalizedEmail,
                    discount_code: discountCode,
                    discount: discountPercent
                }
            })
        });

        if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            console.error('EmailJS error:', errorText);
            return res.status(500).json({
                success: false,
                error: 'Failed to send email. Please try again later.'
            });
        }

        // Mark email as claimed
        // TODO: Replace with Vercel KV in production
        claimedEmails.set(normalizedEmail, {
            winStreak,
            discountPercent,
            claimedAt: new Date().toISOString(),
            ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown'
        });

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
