/**
 * Test endpoint to debug EmailJS configuration
 * DELETE THIS FILE AFTER DEBUGGING
 */

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Check environment variables
        const envCheck = {
            hasServiceId: !!process.env.EMAILJS_SERVICE_ID,
            hasPublicKey: !!process.env.EMAILJS_PUBLIC_KEY,
            hasTemplate5: !!process.env.EMAILJS_TEMPLATE_5,
            hasTemplate10: !!process.env.EMAILJS_TEMPLATE_10,
            hasTemplate15: !!process.env.EMAILJS_TEMPLATE_15,
            hasDiscountCode5: !!process.env.DISCOUNT_CODE_5,
            hasDiscountCode10: !!process.env.DISCOUNT_CODE_10,
            hasDiscountCode15: !!process.env.DISCOUNT_CODE_15,
            serviceIdPreview: process.env.EMAILJS_SERVICE_ID?.substring(0, 10),
            publicKeyPreview: process.env.EMAILJS_PUBLIC_KEY?.substring(0, 10),
            template5: process.env.EMAILJS_TEMPLATE_5
        };

        // Try sending a test email with private key (strict mode)
        // In strict mode, use accessToken instead of user_id
        const testPayload = {
            service_id: process.env.EMAILJS_SERVICE_ID,
            template_id: process.env.EMAILJS_TEMPLATE_5,
            accessToken: process.env.EMAILJS_PRIVATE_KEY, // Use private key for server-side
            template_params: {
                to_email: 'test@example.com',
                discount_code: 'TEST123',
                discount: 5
            }
        };

        envCheck.hasPrivateKey = !!process.env.EMAILJS_PRIVATE_KEY;
        envCheck.privateKeyPreview = process.env.EMAILJS_PRIVATE_KEY?.substring(0, 10);

        const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testPayload)
        });

        const responseText = await emailResponse.text();

        return res.status(200).json({
            envCheck,
            emailJS: {
                status: emailResponse.status,
                statusText: emailResponse.statusText,
                ok: emailResponse.ok,
                response: responseText
            }
        });
    } catch (error) {
        return res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
}
