/**
 * Analytics Service - Track game events for insights
 *
 * Lightweight analytics with:
 * - Vercel Analytics for page views (built-in, free)
 * - Custom events sent to backend API for game metrics
 */

import { logger } from '../utils/Logger.js';

// Event types
export const AnalyticsEvents = {
    // Game lifecycle
    GAME_STARTED: 'game_started',
    GAME_ENDED: 'game_ended',
    GAME_ABANDONED: 'game_abandoned',

    // Gameplay
    CARD_PLAYED: 'card_played',
    CARD_DRAWN: 'card_drawn',
    SUIT_SELECTED: 'suit_selected',

    // Conversion funnel
    DISCOUNT_OFFERED: 'discount_offered',
    CLAIM_CLICKED: 'claim_clicked',
    EMAIL_FORM_OPENED: 'email_form_opened',
    EMAIL_SUBMITTED: 'email_submitted',
    EMAIL_SENT_SUCCESS: 'email_sent_success',
    EMAIL_SENT_FAILED: 'email_sent_failed',

    // Engagement
    RULES_VIEWED: 'rules_viewed',
    PLAY_AGAIN: 'play_again',
    PLAY_FOR_MORE: 'play_for_more'
};

class AnalyticsService {
    constructor() {
        this.enabled = true;
        this.sessionId = this.generateSessionId();
        this.device = this.detectDevice();
        this.gameStartTime = null;
        this.turnCount = 0;
        this.cardsPlayed = 0;
        this.cardsDrawn = 0;
        this.eventQueue = [];
        this.flushInterval = null;
        this.apiUrl = null;
    }

    /**
     * Detect device type
     * @returns {string} 'mobile' or 'desktop'
     */
    detectDevice() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || window.innerWidth < 768;
        return isMobile ? 'mobile' : 'desktop';
    }

    /**
     * Initialize analytics
     */
    init() {
        // Determine API URL based on environment
        this.apiUrl = window.location.hostname === 'localhost'
            ? 'http://localhost:3000/api/analytics'
            : '/api/analytics';

        // Start queue flusher (batch events every 5 seconds)
        this.flushInterval = setInterval(() => this.flush(), 5000);

        // Flush on page unload
        window.addEventListener('beforeunload', () => this.flush(true));

        logger.debug('Analytics initialized', { sessionId: this.sessionId });
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Track an event
     * @param {string} eventName - Event name from AnalyticsEvents
     * @param {Object} data - Event data
     */
    track(eventName, data = {}) {
        if (!this.enabled) return;

        const event = {
            event: eventName,
            sessionId: this.sessionId,
            device: this.device,
            timestamp: Date.now(),
            ...data
        };

        this.eventQueue.push(event);

        // Flush immediately for critical events
        const criticalEvents = [
            AnalyticsEvents.GAME_ENDED,
            AnalyticsEvents.EMAIL_SENT_SUCCESS,
            AnalyticsEvents.EMAIL_SENT_FAILED
        ];

        if (criticalEvents.includes(eventName)) {
            this.flush();
        }
    }

    /**
     * Flush event queue to server
     * @param {boolean} sync - Use synchronous request (for beforeunload)
     */
    async flush(sync = false) {
        if (this.eventQueue.length === 0) return;

        const events = [...this.eventQueue];
        this.eventQueue = [];

        try {
            if (sync && navigator.sendBeacon) {
                // Use sendBeacon for page unload
                navigator.sendBeacon(
                    this.apiUrl,
                    JSON.stringify({ events })
                );
            } else {
                await fetch(this.apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ events })
                });
            }
        } catch (error) {
            // Re-queue events on failure
            this.eventQueue.unshift(...events);
            logger.debug('Analytics flush failed, events re-queued');
        }
    }

    // ========================================================================
    // CONVENIENCE METHODS
    // ========================================================================

    /**
     * Track game start
     */
    gameStarted() {
        this.gameStartTime = Date.now();
        this.turnCount = 0;
        this.cardsPlayed = 0;
        this.cardsDrawn = 0;

        this.track(AnalyticsEvents.GAME_STARTED);
    }

    /**
     * Track game end
     * @param {string} winner - 'player' or 'computer'
     * @param {number} winStreak - Current win streak
     */
    gameEnded(winner, winStreak = 0) {
        const duration = this.gameStartTime ? Date.now() - this.gameStartTime : 0;

        this.track(AnalyticsEvents.GAME_ENDED, {
            winner,
            winStreak,
            duration,
            turns: this.turnCount,
            cardsPlayed: this.cardsPlayed,
            cardsDrawn: this.cardsDrawn
        });
    }

    /**
     * Track card played
     * @param {Object} card - Card that was played
     */
    cardPlayed(card) {
        this.cardsPlayed++;
        this.turnCount++;

        this.track(AnalyticsEvents.CARD_PLAYED, {
            cardType: card.isJoker ? 'joker' : (card.isAce ? 'ace' : 'regular'),
            rank: card.rank,
            suit: card.suit
        });
    }

    /**
     * Track card drawn
     * @param {boolean} playable - Whether drawn card was playable
     */
    cardDrawn(playable = false) {
        this.cardsDrawn++;

        this.track(AnalyticsEvents.CARD_DRAWN, { playable });
    }

    /**
     * Track suit selection (for Ace/Joker)
     * @param {string} cardType - 'ace' or 'joker'
     * @param {string} chosenSuit - Suit selected
     */
    suitSelected(cardType, chosenSuit) {
        this.track(AnalyticsEvents.SUIT_SELECTED, {
            cardType,
            suit: chosenSuit
        });
    }

    /**
     * Track discount offered
     * @param {number} percent - Discount percentage
     * @param {number} winStreak - Win streak
     */
    discountOffered(percent, winStreak) {
        this.track(AnalyticsEvents.DISCOUNT_OFFERED, { percent, winStreak });
    }

    /**
     * Track claim button click
     * @param {number} percent - Discount percentage
     */
    claimClicked(percent) {
        this.track(AnalyticsEvents.CLAIM_CLICKED, { percent });
    }

    /**
     * Track email form opened
     */
    emailFormOpened() {
        this.track(AnalyticsEvents.EMAIL_FORM_OPENED);
    }

    /**
     * Track email submission attempt
     * @param {boolean} valid - Whether email was valid
     */
    emailSubmitted(valid) {
        this.track(AnalyticsEvents.EMAIL_SUBMITTED, { valid });
    }

    /**
     * Track successful email send
     * @param {number} percent - Discount percentage
     */
    emailSentSuccess(percent) {
        this.track(AnalyticsEvents.EMAIL_SENT_SUCCESS, { percent });
    }

    /**
     * Track failed email send
     * @param {string} error - Error type
     */
    emailSentFailed(error) {
        this.track(AnalyticsEvents.EMAIL_SENT_FAILED, { error });
    }

    /**
     * Track rules viewed
     * @param {string} source - 'auto' or 'help_button'
     */
    rulesViewed(source = 'auto') {
        this.track(AnalyticsEvents.RULES_VIEWED, { source });
    }

    /**
     * Track play again
     * @param {boolean} afterWin - Whether previous game was won
     */
    playAgain(afterWin) {
        this.track(AnalyticsEvents.PLAY_AGAIN, { afterWin });
    }

    /**
     * Track play for more discount
     * @param {number} currentPercent - Current discount
     * @param {number} targetPercent - Target discount
     */
    playForMore(currentPercent, targetPercent) {
        this.track(AnalyticsEvents.PLAY_FOR_MORE, {
            current: currentPercent,
            target: targetPercent
        });
    }

    /**
     * Disable analytics
     */
    disable() {
        this.enabled = false;
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
        }
    }
}

// Singleton instance
export const analytics = new AnalyticsService();
