/**
 * EventController - Centralized event handling using event delegation
 * Replaces global function pollution with proper event management
 */

import { EMAIL_CONFIG } from '../config/email.config.js';
import { logger } from '../utils/Logger.js';
import { analytics } from './Analytics.js';

export class EventController {
    constructor(game) {
        this.game = game;
        this.boundHandleClick = this.handleClick.bind(this);
        this.boundHandleSubmit = this.handleSubmit.bind(this);
    }

    /**
     * Setup all event listeners using event delegation
     */
    setupEventListeners() {
        // Single click listener for the entire document
        document.addEventListener('click', this.boundHandleClick);

        // Form submission listeners
        document.addEventListener('submit', this.boundHandleSubmit);
    }

    /**
     * Remove all event listeners (cleanup)
     */
    removeEventListeners() {
        document.removeEventListener('click', this.boundHandleClick);
        document.removeEventListener('submit', this.boundHandleSubmit);
    }

    /**
     * Handle all click events using delegation
     * @param {Event} event - Click event
     */
    handleClick(event) {
        const target = event.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const param = target.dataset.param;

        // Prevent default for certain actions
        if (action !== 'card-info') {
            event.preventDefault();
        }

        // Route to appropriate handler
        switch (action) {
            case 'hide-rules':
                this.handleHideRules();
                break;

            case 'show-rules':
                this.handleShowRules();
                break;

            case 'draw-card':
                this.handleDrawCard();
                break;

            case 'choose-suit':
                this.handleChooseSuit(param);
                break;

            case 'play-again':
                this.handlePlayAgain();
                break;

            case 'play-more':
                this.handlePlayMore();
                break;

            case 'play-to-get-discount':
                this.handlePlayToGetDiscount();
                break;

            case 'show-email-form':
                this.handleShowEmailForm();
                break;

            case 'hide-email-form':
                this.handleHideEmailForm();
                break;

            case 'send-discount':
                this.handleSendDiscount();
                break;

            default:
                logger.warn(`Unknown action: ${action}`);
        }
    }

    /**
     * Handle form submissions
     * @param {Event} event - Submit event
     */
    handleSubmit(event) {
        const form = event.target;
        if (form.dataset.action === 'email-form') {
            event.preventDefault();
            this.handleSendDiscount();
        }
    }

    // ============================================================================
    // ACTION HANDLERS
    // ============================================================================

    /**
     * Hide rules box and show help button
     */
    handleHideRules() {
        const rulesBox = document.getElementById('rulesBox');
        const helpBtn = document.getElementById('rulesHelpBtn');

        if (rulesBox) {
            rulesBox.classList.add('hidden');
            rulesBox.classList.remove('shown');
        }
        if (helpBtn) {
            helpBtn.classList.add('visible');
        }
    }

    /**
     * Show rules box and hide help button
     */
    handleShowRules() {
        // Track rules viewed via help button
        analytics.rulesViewed('help_button');

        const rulesBox = document.getElementById('rulesBox');
        const helpBtn = document.getElementById('rulesHelpBtn');

        if (rulesBox) {
            rulesBox.classList.remove('hidden');
            rulesBox.classList.add('shown');
        }
        if (helpBtn) {
            helpBtn.classList.remove('visible');
        }
    }

    /**
     * Handle draw card button click
     */
    async handleDrawCard() {
        if (this.game) {
            await this.game.handleDrawCard();
        }
    }

    /**
     * Choose suit for Ace/Joker
     * @param {string} suit - Selected suit
     */
    handleChooseSuit(suit) {
        if (!this.game || !this.game.state.pendingEightCard) return;

        // Hide suit selector
        const suitSelectorOverlay = document.getElementById('suitSelectorOverlay');
        const suitSelector = document.getElementById('suitSelector');

        if (suitSelectorOverlay) suitSelectorOverlay.classList.remove('show');
        if (suitSelector) suitSelector.classList.remove('show');

        // Handle suit selection
        const card = this.game.state.pendingEightCard;
        this.game.handleSuitSelection(suit, card);
    }

    /**
     * Handle play again button
     */
    async handlePlayAgain() {
        if (this.game) {
            // Track play again (after loss since win goes through handlePlayMore)
            analytics.playAgain(false);
            await this.game.reset();
        }
    }

    /**
     * Handle play more button (after claiming discount)
     */
    async handlePlayMore() {
        // Track play again after win
        analytics.playAgain(true);
        if (this.game) {
            await this.game.reset();
        }
    }

    /**
     * Handle "Play More to Get X%" button
     */
    async handlePlayToGetDiscount() {
        // Track play for more discount
        const currentDiscount = this.getDiscount();
        const targetDiscount = currentDiscount < 10 ? 10 : 15;
        analytics.playForMore(currentDiscount, targetDiscount);

        if (this.game) {
            await this.game.reset();
        }
    }

    /**
     * Show email form for discount claim
     */
    handleShowEmailForm() {
        // Track claim button clicked
        const discount = this.getDiscount();
        analytics.claimClicked(discount);
        analytics.emailFormOpened();

        const discountButtonsContainer = document.getElementById('discountButtonsContainer');
        const emailFormInline = document.getElementById('emailFormInline');
        const emailInput = document.getElementById('emailInput');
        const emailError = document.getElementById('emailError');

        if (discountButtonsContainer) discountButtonsContainer.style.display = 'none';
        if (emailFormInline) emailFormInline.style.display = 'block';

        if (emailInput) {
            emailInput.value = '';
            emailInput.focus();
        }

        if (emailError) {
            emailError.textContent = '';
            emailError.classList.remove('show');
        }
    }

    /**
     * Hide email form (return to claim buttons)
     */
    handleHideEmailForm() {
        const emailFormInline = document.getElementById('emailFormInline');
        const discountButtonsContainer = document.getElementById('discountButtonsContainer');

        if (emailFormInline) emailFormInline.style.display = 'none';
        if (discountButtonsContainer) discountButtonsContainer.style.display = 'flex';
    }

    /**
     * Send discount email
     */
    async handleSendDiscount() {
        const emailInput = document.getElementById('emailInput');
        const emailError = document.getElementById('emailError');

        if (!emailInput || !emailError) return;

        const email = emailInput.value.trim();

        // Clear previous error
        emailError.textContent = '';
        emailError.classList.remove('show');

        // Validate email
        if (!email) {
            emailError.textContent = 'Please enter your email address';
            emailError.classList.add('show');
            analytics.emailSubmitted(false);
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            emailError.textContent = 'Please enter a valid email address';
            emailError.classList.add('show');
            analytics.emailSubmitted(false);
            return;
        }

        if (this.hasEmailClaimed(email)) {
            emailError.textContent = 'This email has already claimed a discount!';
            emailError.classList.add('show');
            analytics.emailSubmitted(false);
            return;
        }

        // Track valid email submission
        analytics.emailSubmitted(true);

        // Send email
        await this.sendDiscountEmail(email);
    }

    /**
     * Check if email has already claimed a discount
     * @param {string} email - Email address
     * @returns {boolean} True if already claimed
     */
    hasEmailClaimed(email) {
        try {
            const claimed = localStorage.getItem('claimedEmails');
            if (!claimed) return false;

            const claimedList = JSON.parse(claimed);
            return claimedList.includes(email.toLowerCase());
        } catch (error) {
            logger.error('Error checking claimed emails:', error);
            return false;
        }
    }

    /**
     * Mark email as having claimed a discount
     * @param {string} email - Email address
     */
    markEmailAsClaimed(email) {
        try {
            const claimed = localStorage.getItem('claimedEmails');
            const claimedList = claimed ? JSON.parse(claimed) : [];

            claimedList.push(email.toLowerCase());
            localStorage.setItem('claimedEmails', JSON.stringify(claimedList));
        } catch (error) {
            logger.error('Error saving claimed email:', error);
        }
    }

    /**
     * Get current discount based on win streak
     * @returns {number} Discount percentage
     */
    getDiscount() {
        if (!this.game) return 0;
        const winStreak = this.game.state.winStreak;
        if (winStreak === 1) return 5;
        if (winStreak === 2) return 10;
        if (winStreak >= 3) return 15;
        return 0;
    }

    /**
     * Map server errors to user-friendly messages
     */
    getFriendlyErrorMessage(serverError) {
        const errorMap = {
            'Session token is required': 'Session expired. Please refresh and play again!',
            'Invalid or expired session token': 'Session expired. Please refresh the page!',
            'Session expired. Please play a new game.': 'Session expired. Start a new game to earn another discount!',
            'This email has already claimed a discount': 'This email already has a discount! Check your inbox (and spam folder)',
            'Too many discount requests. Please try again later.': 'Too many attempts. Please wait a moment and try again.',
            'Invalid email': 'Please enter a valid email (like you@example.com)',
            'Server configuration error': 'Oops! Something went wrong on our end. Please try again later.',
            'Failed to send email. Please try again later.': 'Could not send your code. Please check your email and try again.',
            'No active game session. Please play a game first.': 'Session expired. Start a new game to earn another discount!'
        };
        return errorMap[serverError] || serverError || 'Oops! Something went wrong. Please try again!';
    }

    /**
     * Send discount email via secure API
     * @param {string} email - Email address
     */
    async sendDiscountEmail(email) {
        const sendButton = document.getElementById('sendDiscountBtn');
        const emailError = document.getElementById('emailError');

        if (!sendButton || !emailError) return;

        try {
            sendButton.disabled = true;
            sendButton.innerHTML = '<span class="spinner"></span> Sending...';

            // Determine API URL based on environment
            const apiUrl = window.location.hostname === 'localhost'
                ? 'http://localhost:3000/api/claim-discount'
                : '/api/claim-discount';

            // Get session token from game's SessionService for server-side validation
            const sessionToken = this.game.sessionService?.getSessionToken();

            if (!sessionToken) {
                throw new Error('No active game session. Please play a game first.');
            }

            // Call secure backend API with session token
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    sessionToken: sessionToken
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Track successful email
                const discount = this.getDiscount();
                analytics.emailSentSuccess(discount);

                // Mark email as claimed (client-side tracking for UX only)
                this.markEmailAsClaimed(email);

                // Hide email form and show success message
                const emailFormInline = document.getElementById('emailFormInline');
                if (emailFormInline) {
                    emailFormInline.innerHTML = `
                        <div class="discount-sent-message">
                            ✅ Discount sent! Check your email.
                        </div>
                    `;
                }

                // Mark discount as claimed and reset win streak
                this.game.state.claimDiscount();
                this.game.state.resetWinStreak();
            } else {
                // Track failed email
                analytics.emailSentFailed(data.error || 'unknown');

                // Show user-friendly error message
                emailError.textContent = this.getFriendlyErrorMessage(data.error);
                emailError.classList.add('show');
            }
        } catch (error) {
            logger.error('Error sending email:', error);
            analytics.emailSentFailed(error.message || 'network_error');
            emailError.textContent = this.getFriendlyErrorMessage(error.message);
            emailError.classList.add('show');
        } finally {
            if (sendButton) {
                sendButton.disabled = false;
                sendButton.innerHTML = 'Get My Discount Code!';
            }
        }
    }

    /**
     * Update suit selector state
     */
    updateSuitSelector() {
        // All suits are always available for Aces (they're wild cards)
        // No need to disable anything
    }
}
