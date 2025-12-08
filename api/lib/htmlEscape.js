/**
 * HTML Escaping Utility
 * Prevents XSS and HTML injection in email templates
 */

/**
 * Escape HTML special characters to prevent injection
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for HTML
 */
export function escapeHtml(text) {
    if (typeof text !== 'string') {
        return String(text);
    }

    const htmlEscapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
    };

    return text.replace(/[&<>"'\/]/g, char => htmlEscapeMap[char]);
}

/**
 * Escape HTML and preserve line breaks as <br>
 * @param {string} text - Text to escape
 * @returns {string} Escaped text with line breaks
 */
export function escapeHtmlWithBreaks(text) {
    return escapeHtml(text).replace(/\n/g, '<br>');
}
