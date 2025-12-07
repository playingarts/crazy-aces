/**
 * Crazy Aces - Main Application Entry Point
 * Refactored to use modular architecture
 */

import { Game } from './services/Game.js';
import { GAME_CONFIG } from './config/constants.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    GAME: {
        INITIAL_HAND_SIZE: 7,
        NUM_JOKERS: 2
    },
    ANIMATION: {
        CARD_DROP_DURATION: 400,
        CARD_FLY_DURATION: 250,
        CARD_SHRINK_DURATION: 250,
        HINT_SHAKE_DURATION: 600,
        HAND_RESIZE_DURATION: 500
    },
    TIMING: {
        COMPUTER_TURN_DELAY: 800,
        HINT_INITIAL_DELAY: 5000,
        HINT_REPEAT_DELAY: 5000,
        STATUS_MESSAGE_SHORT: 1500,
        STATUS_MESSAGE_LONG: 2000,
        DRAW_MESSAGE_DELAY: 1200,
        ANIMATION_DELAY: 400,
        GAME_END_DELAY: 500
    },
    URLS: {
        BASE_IMAGE: 'https://s3.amazonaws.com/img.playingarts.com/one-small-hd/',
        CARD_INFO_BASE: 'https://playingarts.com/one/',
        BACKSIDE_IMAGE:
            'https://s3.amazonaws.com/img.playingarts.com/one-small-hd/_backside-evgeny-kiselev.jpg?2'
    }
};

// Email configuration
const EMAIL_CONFIG = {
    SERVICE_ID: 'service_ev80is9',
    PUBLIC_KEY: 'nygYALzXMsCwmblfZ',
    TEMPLATES: {
        5: 'template_t0u5gkf',
        10: 'template_t0u5gkf',
        15: 'template_t0u5gkf'
    },
    DISCOUNT_CODES: {
        5: 'A2F05DZGAME',
        10: 'VPQ10VMGAME',
        15: 'N2V15XWGAME'
    }
};

// ============================================================================
// GLOBAL STATE
// ============================================================================

let game = null;

// ============================================================================
// UI HELPER FUNCTIONS
// ============================================================================

/**
 * Hide the rules box
 */
function hideRulesBox() {
    const rulesBox = document.querySelector('.rules-box');
    if (rulesBox) {
        rulesBox.style.display = 'none';
    }
}

/**
 * Get current discount based on win streak
 */
function getDiscount() {
    if (!game) return 0;
    const winStreak = game.state.winStreak;
    if (winStreak >= 3) return 15;
    if (winStreak >= 2) return 10;
    if (winStreak >= 1) return 5;
    return 0;
}

// ============================================================================
// DISCOUNT & EMAIL FUNCTIONS
// ============================================================================

/**
 * Show email form
 */
function showEmailForm() {
    const emailFormOverlay = document.getElementById('emailFormOverlay');
    const emailInput = document.getElementById('emailInput');

    if (emailFormOverlay) {
        emailFormOverlay.classList.add('show');
    }

    if (emailInput) {
        emailInput.value = '';
        emailInput.focus();
    }

    const emailError = document.getElementById('emailError');
    if (emailError) {
        emailError.textContent = '';
    }
}

/**
 * Hide email form
 */
function hideEmailForm() {
    const emailFormOverlay = document.getElementById('emailFormOverlay');
    if (emailFormOverlay) {
        emailFormOverlay.classList.remove('show');
    }
}

/**
 * Handle "Play More to Get X%" button
 */
function handlePlayToGet10() {
    handlePlayAgain();
}

/**
 * Handle "Play More" button (after claiming discount)
 */
function handlePlayMore() {
    handlePlayAgain();
}

/**
 * Send discount email
 */
async function handleSendDiscount() {
    const emailInput = document.getElementById('emailInput');
    const emailError = document.getElementById('emailError');

    if (!emailInput || !emailError) return;

    const email = emailInput.value.trim();

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        emailError.textContent = 'Please enter a valid email address';
        return;
    }

    // Send email
    await sendDiscountEmail(email);
}

/**
 * Send discount email via EmailJS
 */
async function sendDiscountEmail(email) {
    const discount = getDiscount();
    const discountCode = EMAIL_CONFIG.DISCOUNT_CODES[discount];
    const templateId = EMAIL_CONFIG.TEMPLATES[discount];
    const sendButton = document.getElementById('sendDiscountBtn');
    const emailError = document.getElementById('emailError');

    if (!sendButton || !emailError) return;

    try {
        sendButton.disabled = true;
        sendButton.textContent = 'Sending...';

        const response = await emailjs.send(
            EMAIL_CONFIG.SERVICE_ID,
            templateId,
            {
                to_email: email,
                discount_code: discountCode,
                discount_percent: discount
            },
            EMAIL_CONFIG.PUBLIC_KEY
        );

        if (response.status === 200) {
            hideEmailForm();
            game.state.claimDiscount();

            // Update UI
            const playAgainBtn = document.getElementById('playAgainBtn');
            const playMoreBtnSmall = document.getElementById('playMoreBtnSmall');
            const discountButtonsContainer = document.getElementById('discountButtonsContainer');
            const discountInfo = document.getElementById('discountInfo');

            if (playAgainBtn) playAgainBtn.style.display = 'block';
            if (playMoreBtnSmall) playMoreBtnSmall.style.display = 'none';
            if (discountButtonsContainer) discountButtonsContainer.style.display = 'none';
            if (discountInfo) discountInfo.style.marginBottom = '0';

            alert(`Discount code sent to ${email}!`);
        }
    } catch (error) {
        console.error('Error sending email:', error);
        emailError.textContent = 'Failed to send email. Please try again.';
    } finally {
        if (sendButton) {
            sendButton.disabled = false;
            sendButton.textContent = 'Send Discount Code';
        }
    }
}

// ============================================================================
// GAME CONTROL FUNCTIONS
// ============================================================================

/**
 * Handle "Play Again" button
 */
async function handlePlayAgain() {
    if (game) {
        await game.reset();
    }
}

/**
 * Handle "Draw Card" button
 */
async function handleDrawCard() {
    if (game) {
        await game.handleDrawCard();
    }
}

/**
 * Choose suit (for 8s, Aces, Jokers)
 */
function chooseSuit(suit) {
    // This is handled by GameUI now - stub for compatibility
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the application
 */
async function initialize() {
    try {
        // Initialize EmailJS
        if (typeof emailjs !== 'undefined') {
            emailjs.init(EMAIL_CONFIG.PUBLIC_KEY);
        }

        // Create game instance
        game = new Game(CONFIG);

        // Initialize game
        await game.init();

        // Hide loading screen
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }, 1000);
        }
    } catch (error) {
        console.error('Error initializing application:', error);
        console.error('Error stack:', error.stack);
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `<div style="color: white; font-size: 18px; padding: 20px;">
                Error loading game:<br>
                ${error.message}<br><br>
                <pre style="font-size: 12px; text-align: left;">${error.stack}</pre>
                <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; font-size: 16px;">Reload Page</button>
            </div>`;
        }
        alert('Error: ' + error.message);
    }
}

// Start the game when DOM is loaded
initialize();

// ============================================================================
// EXPORT FUNCTIONS TO GLOBAL SCOPE FOR INLINE EVENT HANDLERS
// ============================================================================

window.hideRulesBox = hideRulesBox;
window.handleDrawCard = handleDrawCard;
window.chooseSuit = chooseSuit;
window.handlePlayMore = handlePlayMore;
window.showEmailForm = showEmailForm;
window.handlePlayToGet10 = handlePlayToGet10;
window.handleSendDiscount = handleSendDiscount;
window.hideEmailForm = hideEmailForm;
window.handlePlayAgain = handlePlayAgain;
