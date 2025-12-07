/**
 * Test endpoint to verify Resend is working
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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

    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }

    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        console.log('Testing Resend with:', {
            apiKey: process.env.RESEND_API_KEY ? 'SET' : 'NOT SET',
            from: process.env.EMAIL_FROM,
            to: email
        });

        const result = await resend.emails.send({
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Test Email from Resend',
            html: '<p>This is a test email to verify Resend is working!</p>'
        });

        console.log('Resend result:', JSON.stringify(result, null, 2));

        return res.status(200).json({
            success: true,
            result: result
        });

    } catch (error) {
        console.error('Resend error:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            details: error
        });
    }
}
