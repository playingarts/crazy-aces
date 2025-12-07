/**
 * Email Configuration
 * Reads from environment variables for security
 *
 * NOTE: In a production environment, discount code validation
 * and email sending should be handled server-side to prevent
 * abuse and maintain security.
 */

/**
 * Get email configuration from environment variables
 * @returns {Object} Email configuration object
 * @throws {Error} If required environment variables are missing
 */
function getEmailConfig() {
    const requiredVars = [
        'VITE_EMAILJS_SERVICE_ID',
        'VITE_EMAILJS_PUBLIC_KEY',
        'VITE_EMAILJS_TEMPLATE_5',
        'VITE_EMAILJS_TEMPLATE_10',
        'VITE_EMAILJS_TEMPLATE_15',
        'VITE_DISCOUNT_CODE_5',
        'VITE_DISCOUNT_CODE_10',
        'VITE_DISCOUNT_CODE_15'
    ];

    const missing = requiredVars.filter((varName) => !import.meta.env[varName]);

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}. ` +
                'Please check your .env file and ensure all EmailJS configuration is set.'
        );
    }

    return {
        SERVICE_ID: import.meta.env.VITE_EMAILJS_SERVICE_ID,
        PUBLIC_KEY: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
        TEMPLATES: {
            5: import.meta.env.VITE_EMAILJS_TEMPLATE_5,
            10: import.meta.env.VITE_EMAILJS_TEMPLATE_10,
            15: import.meta.env.VITE_EMAILJS_TEMPLATE_15
        },
        DISCOUNT_CODES: {
            5: import.meta.env.VITE_DISCOUNT_CODE_5,
            10: import.meta.env.VITE_DISCOUNT_CODE_10,
            15: import.meta.env.VITE_DISCOUNT_CODE_15
        }
    };
}

/**
 * Email configuration singleton
 * Validates environment variables on first access
 */
export const EMAIL_CONFIG = getEmailConfig();

/**
 * Check if email configuration is properly set up
 * @returns {boolean} True if all config is available
 */
export function isEmailConfigured() {
    try {
        getEmailConfig();
        return true;
    } catch (error) {
        console.error('Email configuration error:', error.message);
        return false;
    }
}
