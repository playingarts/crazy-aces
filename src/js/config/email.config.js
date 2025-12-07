/**
 * Email Configuration
 *
 * ⚠️ SECURITY UPDATE: Email sending now handled server-side via Vercel API
 *
 * This file is deprecated and only kept for backward compatibility.
 * All email sending and discount code management is now done through:
 * - API endpoint: /api/claim-discount
 * - Server-side validation, email sending, and claim tracking
 *
 * Sensitive data (EmailJS credentials, discount codes) are NO LONGER
 * exposed in client-side code.
 */

/**
 * Email configuration - DEPRECATED
 * Email functionality now uses secure backend API
 * @returns {Object} Minimal config object for compatibility
 */
function getEmailConfig() {
    // Email features now handled server-side
    // This config is kept minimal for backward compatibility only
    return {
        SERVICE_ID: null, // Moved to server-side
        PUBLIC_KEY: null, // Moved to server-side
        TEMPLATES: {
            5: null, // Moved to server-side
            10: null, // Moved to server-side
            15: null // Moved to server-side
        },
        DISCOUNT_CODES: {
            5: null, // Moved to server-side (SECURITY)
            10: null, // Moved to server-side (SECURITY)
            15: null // Moved to server-side (SECURITY)
        },
        ENABLED: true // API-based email is always enabled
    };
}

/**
 * Email configuration singleton
 */
export const EMAIL_CONFIG = getEmailConfig();

/**
 * Check if email configuration is properly set up
 * @returns {boolean} Always true since we use API now
 */
export function isEmailConfigured() {
    return true; // API-based email is always available
}
