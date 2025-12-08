/**
 * Email Validation and Normalization Utility
 * Prevents abuse from disposable emails and normalizes common email providers
 */

import crypto from 'crypto';

// Common disposable email domains (add more as needed)
const DISPOSABLE_DOMAINS = new Set([
    // Temporary/disposable services
    'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.biz',
    'sharklasers.com', 'grr.la', 'guerrillamail.de',
    'mailinator.com', 'mailinator2.com', 'mailinator.net',
    'temp-mail.org', 'temp-mail.io', 'tempmail.com', 'tempmail.net',
    '10minutemail.com', '10minutemail.net', '10minutemail.org',
    'throwaway.email', 'throwawaymail.com',
    'yopmail.com', 'yopmail.fr', 'yopmail.net',
    'maildrop.cc', 'mailnator.com', 'mailsac.com',
    'trashmail.com', 'trashmail.net', 'trash-mail.com',
    'getnada.com', 'fakeinbox.com', 'fake-mail.com',
    'discard.email', 'spamgourmet.com', 'mintemail.com',
    'emailondeck.com', 'mytemp.email', 'mohmal.com',
    'gmx.net', 'gmx.de', 'gmx.at', 'gmx.ch', 'gmx.com',
    'burnermail.io', 'getairmail.com', 'anonymousemail.me'
]);

/**
 * Validate email format and block disposable domains
 * @param {string} email - Email to validate
 * @returns {{valid: boolean, error?: string, normalized: string}}
 */
export function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return { valid: false, error: 'Email is required' };
    }

    // Trim and lowercase
    const trimmedEmail = email.trim().toLowerCase();

    // Basic format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
        return { valid: false, error: 'Invalid email format' };
    }

    // Extract domain
    const domain = trimmedEmail.split('@')[1];

    // Block disposable email domains
    if (DISPOSABLE_DOMAINS.has(domain)) {
        return {
            valid: false,
            error: 'Disposable email addresses are not allowed. Please use a permanent email address.'
        };
    }

    // Normalize the email
    const normalized = normalizeEmail(trimmedEmail);

    return { valid: true, normalized };
}

/**
 * Normalize email addresses to prevent duplicates
 * @param {string} email - Email to normalize (already lowercased and trimmed)
 * @returns {string} Normalized email
 */
export function normalizeEmail(email) {
    const [localPart, domain] = email.split('@');

    // Gmail normalization
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
        // Remove dots from local part
        let normalized = localPart.replace(/\./g, '');

        // Remove everything after + (plus addressing)
        const plusIndex = normalized.indexOf('+');
        if (plusIndex !== -1) {
            normalized = normalized.substring(0, plusIndex);
        }

        // Always use gmail.com (googlemail.com is an alias)
        return `${normalized}@gmail.com`;
    }

    // For other providers, just remove plus addressing
    const plusIndex = localPart.indexOf('+');
    if (plusIndex !== -1) {
        return `${localPart.substring(0, plusIndex)}@${domain}`;
    }

    return email;
}

/**
 * Hash email address for use in Redis keys (privacy protection)
 * Uses SHA-256 to create a deterministic hash
 * @param {string} email - Normalized email address
 * @returns {string} Hex-encoded SHA-256 hash
 */
export function hashEmail(email) {
    return crypto.createHash('sha256').update(email).digest('hex');
}
