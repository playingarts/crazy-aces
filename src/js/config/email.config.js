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
 * @returns {Object} Email configuration object (or disabled config if env vars missing)
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
        console.warn(
            `[Email Config] Missing environment variables: ${missing.join(', ')}. ` +
                'Email features will be disabled. This is expected in development without .env file.'
        );

        // Return disabled configuration - app will load but email features won't work
        return {
            SERVICE_ID: null,
            PUBLIC_KEY: null,
            TEMPLATES: {
                5: null,
                10: null,
                15: null
            },
            DISCOUNT_CODES: {
                5: null,
                10: null,
                15: null
            },
            ENABLED: false
        };
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
        },
        ENABLED: true
    };
}

/**
 * Email configuration singleton
 * Returns disabled config if environment variables are missing (allows app to load)
 */
export const EMAIL_CONFIG = getEmailConfig();

/**
 * Check if email configuration is properly set up
 * @returns {boolean} True if all config is available
 */
export function isEmailConfigured() {
    return EMAIL_CONFIG.ENABLED === true;
}
