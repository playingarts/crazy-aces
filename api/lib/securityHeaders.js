/**
 * Security Headers Utility
 * Sets comprehensive security headers on all API responses
 */

/**
 * Apply security headers to response
 * @param {Response} res - Vercel response object
 */
export function setSecurityHeaders(res) {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // XSS protection (legacy but still useful for older browsers)
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Strict Transport Security (HSTS) - enforce HTTPS
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // Referrer policy - don't leak URLs
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy - prevent XSS
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");

    // Permissions policy - disable unnecessary features
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
}
