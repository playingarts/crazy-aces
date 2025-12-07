/**
 * AnimationController - Handles all game animations
 * Manages card animations, hints, confetti, and timeouts
 */

export class AnimationController {
    constructor(config, elements) {
        this.config = config;
        this.elements = elements;
        this.hintTimeout = null;
        this.activeTimeouts = new Set();
    }

    /**
     * Animate computer playing a card
     * @param {number} previousCount - Number of cards before playing
     * @returns {Promise<void>}
     */
    animateComputerCardPlay(previousCount) {
        return new Promise((resolve) => {
            if (!this.elements.opponentHand) {
                resolve();
                return;
            }

            const cardElements = this.elements.opponentHand.querySelectorAll('.card-back-small');
            const lastCardIndex = previousCount - 1;

            if (cardElements[lastCardIndex]) {
                const cardEl = cardElements[lastCardIndex];
                cardEl.classList.add('card-flying-out-opponent');

                // Also shrink with transition for smooth resize
                setTimeout(() => {
                    cardEl.style.transition = 'all 0.25s ease';
                    cardEl.style.width = '0';
                    cardEl.style.marginRight = '0';
                    cardEl.style.opacity = '0';
                }, 150);

                setTimeout(() => {
                    resolve();
                }, this.config.ANIMATION.CARD_FLY_DURATION + this.config.ANIMATION.CARD_SHRINK_DURATION);
            } else {
                resolve();
            }
        });
    }

    /**
     * Animate deck draw
     */
    animateDeckDraw() {
        if (!this.elements.deckPile) return;

        this.elements.deckPile.classList.add('draw-animation');
        setTimeout(() => {
            this.elements.deckPile.classList.remove('draw-animation');
        }, this.config.ANIMATION.CARD_DROP_DURATION);
    }

    /**
     * Animate card being played from hand
     * @param {number} cardIndex - Index of card in hand
     * @returns {Promise<void>}
     */
    animateCardPlay(cardIndex) {
        return new Promise((resolve) => {
            if (!this.elements.playerHand) {
                resolve();
                return;
            }

            const cardElement = this.elements.playerHand.querySelector(
                `[data-card-index="${cardIndex}"]`
            );
            if (cardElement) {
                cardElement.classList.add('card-flying-out');
                setTimeout(() => {
                    resolve();
                }, this.config.ANIMATION.CARD_FLY_DURATION);
            } else {
                resolve();
            }
        });
    }

    /**
     * Show hint for playable cards
     * @param {Function} canPlayCard - Function to check if card is playable
     */
    showPlayableCardHint(canPlayCard) {
        if (!this.elements.playerHand) return;

        const cardElements = this.elements.playerHand.querySelectorAll('.hand-card');

        cardElements.forEach((cardEl) => {
            // Get the actual card index from data attribute (not visual position)
            const cardIndex = parseInt(cardEl.dataset.cardIndex, 10);
            const isPlayable = canPlayCard(cardIndex);

            if (isPlayable) {
                cardEl.classList.add('hint-shake');
                setTimeout(() => {
                    cardEl.classList.remove('hint-shake');
                }, this.config.ANIMATION.HINT_SHAKE_DURATION);
            }
        });
    }

    /**
     * Start hint timer
     * @param {Function} hintCallback - Function to call for hint
     */
    startHintTimer(hintCallback) {
        this.clearHintTimer();
        this.hintTimeout = setTimeout(() => {
            hintCallback();
        }, this.config.TIMING.HINT_INITIAL_DELAY);
    }

    /**
     * Clear hint timer
     */
    clearHintTimer() {
        if (this.hintTimeout) {
            clearTimeout(this.hintTimeout);
            this.hintTimeout = null;
        }

        // Also stop any active shake animations
        if (this.elements.playerHand) {
            const cardElements = this.elements.playerHand.querySelectorAll('.hand-card');
            cardElements.forEach((cardEl) => {
                cardEl.classList.remove('hint-shake');
            });
        }
    }

    /**
     * Launch confetti animation
     */
    launchConfetti() {
        const container = document.getElementById('confettiContainer');
        if (!container) return;

        const colors = [
            '#ff0000',
            '#00ff00',
            '#0000ff',
            '#ffff00',
            '#ff00ff',
            '#00ffff',
            '#ffa500',
            '#ff1493'
        ];
        const confettiCount = 300;

        for (let i = 0; i < confettiCount; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.animationDuration = Math.random() * 3 + 2 + 's';

                container.appendChild(confetti);

                setTimeout(() => {
                    confetti.remove();
                }, 5000);
            }, i * 20);
        }
    }

    /**
     * Create a tracked timeout
     * @param {Function} callback - Function to execute
     * @param {number} delay - Delay in milliseconds
     * @returns {number} Timeout ID
     */
    createTimeout(callback, delay) {
        const timeoutId = setTimeout(() => {
            this.activeTimeouts.delete(timeoutId);
            callback();
        }, delay);
        this.activeTimeouts.add(timeoutId);
        return timeoutId;
    }

    /**
     * Clear all active timeouts
     */
    clearAllTimeouts() {
        this.activeTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
        this.activeTimeouts.clear();
        this.clearHintTimer();
    }
}
