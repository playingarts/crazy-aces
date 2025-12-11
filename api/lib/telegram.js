/**
 * Telegram Notification Helper
 *
 * Sends notifications to Telegram when important events occur.
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Send a message to Telegram
 * @param {string} message - Message text (supports emoji)
 * @returns {Promise<boolean>} - Success status
 */
export async function sendTelegramMessage(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log('[Telegram] Not configured, skipping notification');
        return false;
    }

    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });

        const data = await response.json();

        if (!data.ok) {
            console.error('[Telegram] Failed to send:', data.description);
            return false;
        }

        return true;
    } catch (error) {
        console.error('[Telegram] Error:', error.message);
        return false;
    }
}

/**
 * Send discount claimed notification
 * @param {Object} params - Notification parameters
 */
export async function notifyDiscountClaimed({ email, discount, winStreak, device }) {
    const message = `🎉 <b>New Discount Claimed!</b>

📧 Email: <code>${email}</code>
💰 Discount: <b>${discount}%</b>
🏆 Win Streak: ${winStreak}
📱 Device: ${device || 'unknown'}
🕐 Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}`;

    return sendTelegramMessage(message);
}
