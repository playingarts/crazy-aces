/**
 * GameUI - Orchestrates all UI components
 * Delegates to specialized classes for rendering, animations, drag/drop, etc.
 */

import { AssetLoader } from './AssetLoader.js';
import { AnimationController } from './AnimationController.js';
import { CardRenderer } from './CardRenderer.js';
import { DragDropHandler } from './DragDropHandler.js';
import { GameOverView } from './GameOverView.js';

export class GameUI {
    constructor(config) {
        this.config = config;
        this.elements = this.cacheElements();
        this.statusClearTimeout = null;
        this.deckHintDismissed = false; // Track if deck hint was dismissed (resets on page refresh)

        // Initialize specialized components
        this.assetLoader = new AssetLoader();
        this.animationController = new AnimationController(config, this.elements);
        this.cardRenderer = new CardRenderer(config, this.elements);
        this.dragDropHandler = new DragDropHandler(this.elements);
        this.gameOverView = new GameOverView(this.elements, this.animationController);

        // Store onCardClick handler reference
        this.onCardClickHandler = null;
    }

    /**
     * Cache DOM elements for better performance
     */
    cacheElements() {
        const elements = {
            // Containers
            playerHand: document.getElementById('playerHand'),
            opponentHand: document.getElementById('opponentHandPreview'),
            tableCard: document.getElementById('topCard'),
            deckPile: document.querySelector('.deck-pile'),
            statusMessage: document.getElementById('statusMessage'),

            // Game over elements
            gameOver: document.getElementById('gameOver'),
            gameOverOverlay: document.getElementById('gameOverOverlay'),
            gameOverMessage: document.getElementById('gameOverMessage'),

            // Suit selector
            suitSelector: document.getElementById('suitSelector'),

            // Counters
            playerCardCount: document.querySelector('.player-card-count'),
            opponentCardCount: document.querySelector('.opponent-card-count'),
            deckCardCount: document.querySelector('.deck-card-count'),

            // Loading
            loadingScreen: document.getElementById('loadingScreen'),

            // Hints
            deckHint: document.getElementById('deckHint'),

            // Discount/email elements
            playMoreBtnSmall: document.getElementById('playMoreBtnSmall'),
            discountButtonsContainer: document.getElementById('discountButtonsContainer'),
            discountInfo: document.getElementById('discountInfo'),
            emailFormOverlay: document.getElementById('emailFormOverlay')
        };

        return elements;
    }

    // ========== Status & Counters ==========

    /**
     * Update status message
     * @param {string} message - Message to display
     * @param {number} autoClearDelay - Optional delay in ms to auto-clear the message
     */
    updateStatus(message, autoClearDelay = 0) {
        if (this.elements.statusMessage) {
            this.elements.statusMessage.textContent = message;

            // Clear any existing auto-clear timeout
            if (this.statusClearTimeout) {
                clearTimeout(this.statusClearTimeout);
                this.statusClearTimeout = null;
            }

            // Set new auto-clear timeout if specified
            if (autoClearDelay > 0 && message) {
                this.statusClearTimeout = setTimeout(() => {
                    if (this.elements.statusMessage) {
                        this.elements.statusMessage.textContent = '';
                    }
                    this.statusClearTimeout = null;
                }, autoClearDelay);
            }
        }
    }

    /**
     * Update card counters
     * @param {number} playerCount - Number of cards in player's hand
     * @param {number} computerCount - Number of cards in computer's hand
     * @param {number} deckCount - Number of cards in deck
     */
    updateCounters(playerCount, computerCount, deckCount) {
        if (this.elements.playerCardCount) {
            this.elements.playerCardCount.textContent = playerCount;
        }
        if (this.elements.opponentCardCount) {
            this.elements.opponentCardCount.textContent = computerCount;
        }
        if (this.elements.deckCardCount) {
            this.elements.deckCardCount.textContent = deckCount;
        }
    }

    // ========== Card Rendering (delegated to CardRenderer) ==========

    /**
     * Render the table card - delegates to CardRenderer
     */
    renderTableCard(
        card,
        animate = false,
        animateFrom = 'bottom',
        discardPile = [],
        suitWasChanged = false,
        currentSuit = null
    ) {
        this.cardRenderer.renderTableCard(
            card,
            animate,
            animateFrom,
            discardPile,
            suitWasChanged,
            currentSuit
        );
    }

    /**
     * Render player's hand - delegates to CardRenderer
     */
    renderPlayerHand(hand, onCardClick) {
        this.onCardClickHandler = onCardClick;

        // Setup card handlers callback
        const setupCardHandlers = (cardEl, cardIndex) => {
            // Click handler
            cardEl.addEventListener('click', () => {
                onCardClick(cardIndex);
            });

            // Drag and drop handlers
            this.dragDropHandler.setupCardHandlers(cardEl, cardIndex, onCardClick);
        };

        // Render cards with handlers
        this.cardRenderer.renderPlayerHand(hand, setupCardHandlers);

        // Setup discard pile as drop target
        this.dragDropHandler.setupDiscardPileDropTarget();
    }

    /**
     * Refresh player's hand display without re-rendering other components
     * Uses the previously stored click handler
     * @param {Array} hand - Current hand array
     */
    refreshPlayerHand(hand) {
        if (!this.onCardClickHandler) return;

        const onCardClick = this.onCardClickHandler;

        // Setup card handlers callback using stored handler
        const setupCardHandlers = (cardEl, cardIndex) => {
            cardEl.addEventListener('click', () => {
                onCardClick(cardIndex);
            });
            this.dragDropHandler.setupCardHandlers(cardEl, cardIndex, onCardClick);
        };

        // Re-render cards with handlers
        this.cardRenderer.renderPlayerHand(hand, setupCardHandlers);
    }

    /**
     * Render computer's hand - delegates to CardRenderer
     */
    renderComputerHand(count) {
        this.cardRenderer.renderComputerHand(count);
    }

    // ========== Animations (delegated to AnimationController) ==========

    /**
     * Animate computer playing a card
     */
    animateComputerCardPlay(previousCount) {
        return this.animationController.animateComputerCardPlay(previousCount);
    }

    /**
     * Animate deck draw with flying card
     * @param {string} direction - 'bottom' for player, 'top' for opponent
     */
    animateDeckDraw(direction = 'bottom') {
        return this.animationController.animateDeckDraw(direction);
    }

    /**
     * Animate card being played from hand
     */
    animateCardPlay(cardIndex) {
        return this.animationController.animateCardPlay(cardIndex);
    }

    /**
     * Show hint for playable cards
     */
    showPlayableCardHint(canPlayCard) {
        this.animationController.showPlayableCardHint(canPlayCard);
    }

    /**
     * Show deck hint (draw a card)
     */
    showDeckHint() {
        // Don't show if already dismissed
        if (this.deckHintDismissed) {
            return;
        }

        if (this.elements.deckHint) {
            this.elements.deckHint.style.display = 'block';
        }

        // Shake the deck pile to draw attention (softer animation)
        if (this.elements.deckPile) {
            this.elements.deckPile.classList.add('deck-hint-shake');
            // Remove shake class after animation completes
            setTimeout(() => {
                if (this.elements.deckPile) {
                    this.elements.deckPile.classList.remove('deck-hint-shake');
                }
            }, 800); // Match animation duration
        }
    }

    /**
     * Hide deck hint (draw a card)
     * @param {boolean} dismiss - If true, mark as dismissed (until page refresh)
     */
    hideDeckHint(dismiss = false) {
        if (this.elements.deckHint) {
            this.elements.deckHint.style.display = 'none';
            if (dismiss) {
                this.deckHintDismissed = true; // Mark as dismissed until page refresh
            }
        }

        // Stop shaking the deck pile
        if (this.elements.deckPile) {
            this.elements.deckPile.classList.remove('deck-hint-shake');
        }
    }

    /**
     * Start hint timer
     */
    startHintTimer(hintCallback) {
        this.animationController.startHintTimer(hintCallback);
    }

    /**
     * Clear hint timer
     */
    clearHintTimer() {
        this.animationController.clearHintTimer();
    }

    /**
     * Create a tracked timeout
     */
    createTimeout(callback, delay) {
        return this.animationController.createTimeout(callback, delay);
    }

    /**
     * Clear all active timeouts
     */
    clearAllTimeouts() {
        this.animationController.clearAllTimeouts();
    }

    // ========== Asset Loading (delegated to AssetLoader) ==========

    /**
     * Preload an image
     */
    preloadImage(url) {
        return this.assetLoader.preloadImage(url);
    }

    /**
     * Preload all hand images
     */
    async preloadHandImages(hand) {
        return this.assetLoader.preloadHandImages(hand);
    }

    /**
     * Preload card when drawn from deck
     */
    async preloadCardOnDraw(card) {
        return this.assetLoader.preloadCardOnDraw(card);
    }

    /**
     * Check if edition changed and clear cache if needed
     * @param {string} editionId - Current edition ID
     */
    checkEditionChange(editionId) {
        this.assetLoader.checkEditionChange(editionId);
    }

    // ========== Game Over (delegated to GameOverView) ==========

    /**
     * Show game over screen
     */
    showGameOver(playerWon, winStreak, discountClaimed = false) {
        this.gameOverView.showGameOver(playerWon, winStreak, discountClaimed);
    }

    /**
     * Hide game over screen
     */
    hideGameOver() {
        this.gameOverView.hideGameOver();
    }

    // ========== Suit Selector ==========

    /**
     * Update suit selector to disable certain suits
     * @param {Array<string>} disabledSuits - Array of suits to disable (suits already chosen by previous Aces)
     */
    updateSuitSelector(disabledSuits = []) {
        const suitIds = {
            '♠': 'suit-spades',
            '♥': 'suit-hearts',
            '♦': 'suit-diamonds',
            '♣': 'suit-clubs'
        };

        // Enable all suits first
        Object.values(suitIds).forEach((id) => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.remove('disabled');
                element.style.pointerEvents = 'auto';
                element.style.opacity = '1';
            }
        });

        // Disable suits that have already been chosen by previous Aces
        if (Array.isArray(disabledSuits)) {
            disabledSuits.forEach((suit) => {
                if (suitIds[suit]) {
                    const element = document.getElementById(suitIds[suit]);
                    if (element) {
                        element.classList.add('disabled');
                        element.style.pointerEvents = 'none';
                        element.style.opacity = '0.3';
                    }
                }
            });
        }
    }

    /**
     * Show suit selector
     */
    showSuitSelector(onSuitSelect, onCancel = null, _unused = null, disabledSuits = []) {
        if (!this.elements.suitSelector) return;

        // Update which suits are available (disable suits already chosen by previous Aces)
        this.updateSuitSelector(disabledSuits);

        // Use CSS class instead of inline style
        this.elements.suitSelector.classList.add('show');

        // Show overlay
        const suitSelectorOverlay = document.getElementById('suitSelectorOverlay');
        if (suitSelectorOverlay) {
            suitSelectorOverlay.classList.add('show');
            // Allow clicking overlay to cancel
            if (onCancel) {
                suitSelectorOverlay.onclick = () => {
                    this.hideSuitSelector();
                    onCancel();
                };
            }
        }

        // The suit selector buttons use inline onclick handlers that call window.chooseSuit(suit)
        // So we don't need to set up event listeners here
    }

    /**
     * Hide suit selector
     */
    hideSuitSelector() {
        if (this.elements.suitSelector) {
            this.elements.suitSelector.classList.remove('show');
        }

        const suitSelectorOverlay = document.getElementById('suitSelectorOverlay');
        if (suitSelectorOverlay) {
            suitSelectorOverlay.classList.remove('show');
            suitSelectorOverlay.onclick = null;
        }
    }

    /**
     * Show suit selector overlay (wrapper for compatibility)
     */
    showSuitSelectorOverlay() {
        const suitSelectorOverlay = document.getElementById('suitSelectorOverlay');
        if (suitSelectorOverlay) {
            suitSelectorOverlay.classList.add('show');
        }
        if (this.elements.suitSelector) {
            this.elements.suitSelector.classList.add('show');
        }
    }

    // ========== Loading Screen ==========

    /**
     * Show loading screen
     */
    showLoading() {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.style.display = 'flex';
        }
    }

    /**
     * Hide loading screen
     */
    hideLoading() {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.style.display = 'none';
        }
    }
}
