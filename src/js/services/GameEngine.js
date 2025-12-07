/**
 * GameEngine - Core game logic and rules
 * Handles card validation, computer AI, and game flow
 */

export class GameEngine {
    constructor(gameState) {
        this.state = gameState;
    }

    /**
     * Check if a card can be played on the current card
     * @param {Card} card - Card to check
     * @returns {boolean} True if card can be played
     */
    canPlayCard(card) {
        if (!card) return false;

        // Joker and Ace are wild
        if (card.isJoker || card.isAce) return true;

        // After a Joker, any card can be played
        if (this.state.jokerWasPlayed) return true;

        // Must match suit or rank
        return card.suit === this.state.currentSuit || card.rank === this.state.currentRank;
    }

    /**
     * Find a playable card in the computer's hand
     * @returns {number} Index of playable card, or -1 if none found
     */
    findComputerPlayableCard() {
        return this.state.computerHand.findIndex((card) => this.canPlayCard(card));
    }

    /**
     * Computer AI - Choose the best suit when playing an Ace
     * Excludes suits that have already been chosen by previous Aces
     * @returns {string} The suit to change to
     */
    chooseBestSuitForComputer() {
        // Get suits that have already been CHOSEN (not original Ace card suits)
        const chosenSuits = this.state.chosenAceSuits;

        const suitCounts = {
            '♠': 0,
            '♥': 0,
            '♦': 0,
            '♣': 0
        };

        // Count cards by suit in computer's hand
        this.state.computerHand.forEach((card) => {
            if (!card.isJoker && suitCounts[card.suit] !== undefined) {
                suitCounts[card.suit]++;
            }
        });

        // Exclude suits that have already been chosen
        chosenSuits.forEach((suit) => {
            delete suitCounts[suit];
        });

        // Return the suit with the most cards (from available suits only)
        let maxCount = -1;
        let bestSuit = '♠'; // Default fallback (should never be needed)
        for (const [suit, count] of Object.entries(suitCounts)) {
            if (count > maxCount) {
                maxCount = count;
                bestSuit = suit;
            }
        }

        return bestSuit;
    }

    /**
     * Check if the current player has any playable cards
     * @param {boolean} isComputer - Whether to check computer's hand
     * @returns {boolean} True if player has playable cards
     */
    hasPlayableCards(isComputer = false) {
        const hand = isComputer ? this.state.computerHand : this.state.playerHand;
        return hand.some((card) => this.canPlayCard(card));
    }

    /**
     * Process the effects of playing a card
     * @param {Card} card - The card that was played
     * @param {boolean} isComputer - Whether the computer played it
     * @returns {Object} Effect information
     */
    processCardEffect(card, isComputer = false) {
        const effect = {
            needsSuitSelection: false,
            skipNextTurn: false,
            drawTwo: false,
            reverse: false
        };

        // Update current suit and rank
        this.state.updateCurrentCard(card.suit, card.rank);

        // Reset joker flag
        this.state.jokerWasPlayed = false;

        // Joker - wild card, can be played on anything
        if (card.isJoker) {
            this.state.jokerWasPlayed = true;
            effect.needsSuitSelection = !isComputer;
            return effect;
        }

        // Ace - wild card
        if (card.isAce) {
            effect.needsSuitSelection = !isComputer;
            return effect;
        }

        // 2 - draw two (opponent draws 2 cards)
        if (card.rank === '2') {
            effect.drawTwo = true;
            return effect;
        }

        return effect;
    }

    /**
     * Execute the draw two effect
     * @param {boolean} affectsComputer - Whether the computer is affected
     * @returns {Card[]} The cards that were drawn
     */
    executeDrawTwo(affectsComputer = true) {
        const drawnCards = [];
        const drawCount = 2;

        for (let i = 0; i < drawCount; i++) {
            const card = affectsComputer
                ? this.state.drawCardForComputer()
                : this.state.drawCardForPlayer();

            if (card) {
                drawnCards.push(card);
            }
        }

        return drawnCards;
    }

    /**
     * Check win condition
     * @returns {Object|null} Winner info or null if game continues
     */
    checkWinCondition() {
        if (this.state.playerWon) {
            this.state.gameOver = true;
            this.state.incrementWinStreak();
            return { winner: 'player', winStreak: this.state.winStreak };
        }

        if (this.state.computerWon) {
            this.state.gameOver = true;
            this.state.resetWinStreak();
            return { winner: 'computer' };
        }

        return null;
    }

    /**
     * Execute computer's turn
     * @returns {Object} Turn result information
     */
    async executeComputerTurn() {
        this.state.isComputerTurn = true;

        // Find playable card
        const playableIndex = this.findComputerPlayableCard();

        if (playableIndex !== -1) {
            // Play the card
            const card = this.state.playComputerCard(playableIndex);

            // Handle Joker
            if (card.isJoker) {
                this.state.jokerWasPlayed = true;
                this.state.isComputerTurn = false; // Will continue turn after joker
                return {
                    action: 'play',
                    card,
                    effect: { needsSuitSelection: false },
                    isJoker: true
                };
            }

            // Check if this card was played after a Joker
            const wasAfterJoker = this.state.jokerWasPlayed;
            if (this.state.jokerWasPlayed) {
                this.state.jokerWasPlayed = false;
                this.state.suitWasChanged = true;
            } else {
                this.state.suitWasChanged = false;
            }

            // Handle Ace - choose suit but DON'T mutate the card
            if (card.isAce) {
                const bestSuit = this.chooseBestSuitForComputer();

                // DON'T mutate the card - it remains an Ace with its original suit
                // Only update the game state to require the chosen suit
                this.state.updateCurrentCard(bestSuit, 'A');
                this.state.suitWasChanged = true; // Show suit change indicator

                // Record the chosen suit
                this.state.recordChosenAceSuit(bestSuit);

                this.state.isComputerTurn = false;
                this.state.playerHasActed = false; // Reset for player's next turn

                return {
                    action: 'play',
                    card,
                    effect: {},
                    newSuit: bestSuit
                };
            }

            // Regular card
            this.state.updateCurrentCard(card.suit, card.rank);

            this.state.isComputerTurn = false;
            this.state.playerHasActed = false; // Reset for player's next turn

            return {
                action: 'play',
                card,
                effect: {},
                newSuit: null
            };
        } else {
            // Draw a card
            const drawnCard = this.state.drawCardForComputer();

            if (!drawnCard) {
                // Deck is empty
                this.state.isComputerTurn = false;
                this.state.playerHasActed = false; // Reset for player's next turn
                return {
                    action: 'pass',
                    card: null
                };
            }

            // Check if drawn card is playable
            const canPlay = this.canPlayCard(drawnCard);

            // Only unlock turn if card is NOT playable
            // If playable, computer will play it next (keep turn locked)
            if (!canPlay) {
                this.state.isComputerTurn = false;
                this.state.playerHasActed = false; // Reset for player's next turn
            }

            return {
                action: 'draw',
                card: drawnCard,
                canPlayDrawnCard: canPlay
            };
        }
    }

    /**
     * Validate if it's a legal move
     * @param {number} cardIndex - Index of card in player's hand
     * @returns {Object} Validation result
     */
    validatePlayerMove(cardIndex) {
        // Note: isComputerTurn check is done in handlePlayerCardClick before calling this

        if (this.state.isDrawing) {
            return { valid: false, reason: 'Wait for draw to complete' };
        }

        if (this.state.gameOver) {
            return { valid: false, reason: 'Game is over' };
        }

        const card = this.state.playerHand[cardIndex];
        if (!card) {
            return { valid: false, reason: 'Invalid card' };
        }

        if (!this.canPlayCard(card)) {
            return { valid: false, reason: 'Card cannot be played on current card' };
        }

        return { valid: true };
    }
}
