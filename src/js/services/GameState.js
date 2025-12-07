/**
 * GameState - Centralized state management for the game
 * Replaces scattered global variables with a single source of truth
 */

import { Deck } from '../models/Deck.js';

export class GameState {
    constructor() {
        // Initialize persistent values (not reset between games)
        this.winStreak = 0;
        this.discountClaimed = false;
        this.playerMadeFirstMove = false; // Track if player made first move (persists across games, resets on page refresh)

        // Initialize game-specific values
        this.reset();
    }

    /**
     * Reset the game state to initial values
     * NOTE: winStreak, discountClaimed, and playerMadeFirstMove are NOT reset here - they persist across games
     */
    reset() {
        this.deck = null;
        this.playerHand = [];
        this.computerHand = [];
        this.discardPile = [];
        this.currentSuit = null;
        this.currentRank = null;
        this.gameOver = false;
        this.pendingEightCard = null;
        this.isComputerTurn = false;
        this.isFirstMove = true;
        this.suitWasChanged = false;
        this.isDrawing = false;
        this.jokerWasPlayed = false;
        // winStreak is NOT reset - it persists across games (only reset on loss or claim)
        // this.winStreak = 0;
        this.isFirstGame = true;
        this.playerHasActed = false;
        // playerMadeFirstMove is NOT reset - it persists across games (resets on page refresh)
        // this.playerMadeFirstMove = false;
        // discountClaimed is NOT reset - it persists across games
        // this.discountClaimed = false;
        this.deckHintShown = false; // Track if "draw a card" hint was shown
        this.isProcessingMove = false; // Prevent race conditions with rapid clicks

        // Track which suits have been CHOSEN when Aces were played
        // (not the original suit of the Ace card)
        this.chosenAceSuits = [];
    }

    /**
     * Initialize a new game
     * @param {number} handSize - Number of cards to deal to each player
     */
    initializeGame(handSize = 7) {
        // Create and shuffle deck
        this.deck = new Deck().shuffle();

        // Separate special cards (Aces and Jokers) from non-special cards
        const specialCards = [];
        const nonSpecialCards = [];

        this.deck.cards.forEach((card) => {
            if (card.isAce || card.isJoker) {
                specialCards.push(card);
            } else {
                nonSpecialCards.push(card);
            }
        });

        // Deal hands from non-special cards only
        this.playerHand = nonSpecialCards.splice(0, handSize);
        this.computerHand = nonSpecialCards.splice(0, handSize);

        // Draw first discard card from non-special cards
        let firstCard = nonSpecialCards.splice(0, 1)[0];
        this.discardPile = [firstCard];

        // Rebuild deck with remaining non-special cards and all special cards, then shuffle
        this.deck.cards = [...nonSpecialCards, ...specialCards];
        this.deck.shuffle();

        this.currentSuit = firstCard.suit;
        this.currentRank = firstCard.rank;

        // Reset turn-based state
        this.gameOver = false;
        this.isComputerTurn = false;
        this.isFirstMove = true;
        this.suitWasChanged = false;
        this.isDrawing = false;
        this.jokerWasPlayed = false;
        this.playerHasActed = false;
        this.pendingEightCard = null;
    }

    /**
     * Ensure player has at least one playable card
     */
    ensurePlayerHasPlayableCard() {
        const hasPlayableCard = this.playerHand.some(
            (card) => card.suit === this.currentSuit || card.rank === this.currentRank
        );

        if (!hasPlayableCard && this.deck.size > 0) {
            // Find a matching NON-SPECIAL card in deck and swap with random card in hand
            const matchingCard = this.deck.cards.find(
                (card) =>
                    !card.isAce &&
                    !card.isJoker &&
                    (card.suit === this.currentSuit || card.rank === this.currentRank)
            );

            if (matchingCard) {
                const randomIndex = Math.floor(Math.random() * this.playerHand.length);
                const cardToReturn = this.playerHand[randomIndex];

                this.deck.removeCard(matchingCard);
                this.deck.addCard(cardToReturn);
                this.playerHand[randomIndex] = matchingCard;
            }
        }
    }

    /**
     * Get the top card of the discard pile
     */
    get topCard() {
        return this.discardPile[this.discardPile.length - 1];
    }

    /**
     * Play a card from player's hand
     * @param {number} cardIndex - Index of card in player's hand
     * @returns {Card} The played card
     */
    playCardFromHand(cardIndex) {
        const card = this.playerHand.splice(cardIndex, 1)[0];
        this.discardPile.push(card);
        this.playerHasActed = true;
        return card;
    }

    /**
     * Draw a card for the player
     * @returns {Card|null} The drawn card or null if deck is empty
     */
    drawCardForPlayer() {
        if (this.deck.isEmpty) {
            return null;
        }
        const card = this.deck.drawOne();
        this.playerHand.push(card);
        this.playerHasActed = true;
        return card;
    }

    /**
     * Play a card from computer's hand
     * @param {number} cardIndex - Index of card in computer's hand
     * @returns {Card} The played card
     */
    playComputerCard(cardIndex) {
        const card = this.computerHand.splice(cardIndex, 1)[0];
        this.discardPile.push(card);
        return card;
    }

    /**
     * Draw a card for the computer
     * @returns {Card|null} The drawn card or null if deck is empty
     */
    drawCardForComputer() {
        if (this.deck.isEmpty) {
            return null;
        }
        const card = this.deck.drawOne();
        this.computerHand.push(card);
        return card;
    }

    /**
     * Update the current suit and rank
     * @param {string} suit - New current suit
     * @param {string} rank - New current rank
     */
    updateCurrentCard(suit, rank) {
        this.currentSuit = suit;
        this.currentRank = rank;
    }

    /**
     * Record a suit that was chosen when an Ace was played
     * @param {string} suit - The chosen suit
     */
    recordChosenAceSuit(suit) {
        if (!this.chosenAceSuits.includes(suit)) {
            this.chosenAceSuits.push(suit);
        }
    }

    /**
     * Check if player has won
     */
    get playerWon() {
        return this.playerHand.length === 0;
    }

    /**
     * Check if computer has won
     */
    get computerWon() {
        return this.computerHand.length === 0;
    }

    /**
     * Increment win streak
     */
    incrementWinStreak() {
        this.winStreak++;
    }

    /**
     * Reset win streak
     */
    resetWinStreak() {
        this.winStreak = 0;
    }

    /**
     * Mark discount as claimed
     */
    claimDiscount() {
        this.discountClaimed = true;
    }

    /**
     * Get game state as plain object (for debugging/serialization)
     */
    toJSON() {
        return {
            deckSize: this.deck?.size || 0,
            playerHandSize: this.playerHand.length,
            computerHandSize: this.computerHand.length,
            discardPileSize: this.discardPile.length,
            currentSuit: this.currentSuit,
            currentRank: this.currentRank,
            topCard: this.topCard?.toString(),
            gameOver: this.gameOver,
            isComputerTurn: this.isComputerTurn,
            winStreak: this.winStreak
        };
    }
}
