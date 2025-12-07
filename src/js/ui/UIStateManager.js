/**
 * UIStateManager - Centralized DOM state management
 * Handles visibility, opacity, and layout state for UI elements
 * Follows Single Responsibility Principle by separating DOM manipulation
 * from business logic
 */

/**
 * DOM selectors used throughout the application
 * Centralized to avoid duplication and maintain consistency
 */
const DOM_SELECTORS = {
    PLAYER_HAND: '.player-hand',
    PLAYER_HAND_SECTION: '.player-hand-section',
    OPPONENT_HAND_PREVIEW: '#opponentHandPreview',
    STATUS_MESSAGE: '#statusMessage'
};

/**
 * Style properties that can be reset on elements
 */
const RESETABLE_STYLE_PROPS = [
    'opacity',
    'transition',
    'height',
    'minHeight',
    'display',
    'visibility',
    'pointerEvents'
];

export class UIStateManager {
    constructor() {
        this.elements = this.cacheElements();
    }

    /**
     * Cache frequently accessed DOM elements for performance
     * @returns {Object} Cached element references
     */
    cacheElements() {
        return {
            playerHand: document.querySelector(DOM_SELECTORS.PLAYER_HAND),
            playerHandSection: document.querySelector(DOM_SELECTORS.PLAYER_HAND_SECTION),
            opponentHand: document.querySelector(DOM_SELECTORS.OPPONENT_HAND_PREVIEW),
            statusMessage: document.querySelector(DOM_SELECTORS.STATUS_MESSAGE)
        };
    }

    /**
     * Refresh cached elements (useful after DOM updates)
     */
    refreshCache() {
        this.elements = this.cacheElements();
    }

    /**
     * Reset element styles to default state
     * @param {HTMLElement} element - Element to reset
     * @param {Array<string>} props - Style properties to reset (defaults to all)
     */
    resetElementStyles(element, props = RESETABLE_STYLE_PROPS) {
        if (!element) return;

        props.forEach((prop) => {
            element.style[prop] = '';
        });
    }

    /**
     * Reset all game UI elements to their default display state
     * Called on game initialization to ensure clean state
     */
    resetAllDisplays() {
        // Reset player hand container
        this.resetElementStyles(this.elements.playerHand);

        // Reset player hand section
        this.resetElementStyles(this.elements.playerHandSection);

        // Reset opponent hand
        this.resetElementStyles(this.elements.opponentHand);

        // Reset status message
        this.resetElementStyles(this.elements.statusMessage);

        // Ensure visible state
        this.showAllElements();
    }

    /**
     * Show all game UI elements
     */
    showAllElements() {
        [
            this.elements.playerHand,
            this.elements.playerHandSection,
            this.elements.opponentHand,
            this.elements.statusMessage
        ].forEach((el) => {
            if (el) {
                el.style.opacity = '1';
                el.style.display = '';
            }
        });
    }

    /**
     * Hide player hand when they run out of cards
     * Locks height to prevent layout shift, then fades out smoothly
     */
    hidePlayerHandOnEmpty() {
        this.lockAndHideElement(this.elements.playerHand);
        this.lockAndHideElement(this.elements.playerHandSection);
        this.lockAndHideElement(this.elements.statusMessage);
    }

    /**
     * Lock element height and fade it out
     * Prevents layout shift during animations
     * @param {HTMLElement} element - Element to lock and hide
     */
    lockAndHideElement(element) {
        if (!element) return;

        const height = element.offsetHeight;
        element.style.height = `${height}px`;
        element.style.minHeight = `${height}px`;
        element.style.opacity = '0';
        element.style.pointerEvents = 'none';
    }

    /**
     * Show element by removing locked height and restoring visibility
     * @param {HTMLElement} element - Element to unlock and show
     */
    unlockAndShowElement(element) {
        if (!element) return;

        element.style.height = '';
        element.style.minHeight = '';
        element.style.opacity = '1';
        element.style.pointerEvents = '';
    }

    /**
     * Fade out element smoothly
     * @param {HTMLElement} element - Element to fade
     * @param {number} duration - Fade duration in ms
     */
    fadeOut(element, duration = 300) {
        if (!element) return;

        element.style.transition = `opacity ${duration}ms ease`;
        element.style.opacity = '0';
    }

    /**
     * Fade in element smoothly
     * @param {HTMLElement} element - Element to fade
     * @param {number} duration - Fade duration in ms
     */
    fadeIn(element, duration = 300) {
        if (!element) return;

        element.style.transition = `opacity ${duration}ms ease`;
        element.style.opacity = '1';
    }

    /**
     * Hide opponent hand (used during game end animations)
     */
    hideOpponentHand() {
        this.lockAndHideElement(this.elements.opponentHand);
        this.lockAndHideElement(this.elements.statusMessage);
    }

    /**
     * Show opponent hand
     */
    showOpponentHand() {
        this.unlockAndShowElement(this.elements.opponentHand);
        this.unlockAndShowElement(this.elements.statusMessage);
    }

    /**
     * Get current visibility state of player hand
     * @returns {boolean} True if visible
     */
    isPlayerHandVisible() {
        return this.elements.playerHand && this.elements.playerHand.style.opacity !== '0';
    }

    /**
     * Get current visibility state of opponent hand
     * @returns {boolean} True if visible
     */
    isOpponentHandVisible() {
        return this.elements.opponentHand && this.elements.opponentHand.style.opacity !== '0';
    }
}
