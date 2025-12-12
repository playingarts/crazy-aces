/**
 * Deck model for managing cards
 */

import { Card } from './Card.js';
import { SUITS, RANKS, GAME_CONFIG } from '../config/constants.js';
import { getCurrentEdition } from '../config/editions.js';

export class Deck {
    constructor() {
        this.cards = [];
        this._initialize();
    }

    /**
     * Initialize a standard 54-card deck (52 + 2 jokers)
     * Uses current edition for artist data
     */
    _initialize() {
        this.cards = [];
        const edition = getCurrentEdition();

        // Create standard 52 cards
        Object.values(SUITS).forEach((suit) => {
            if (suit === SUITS.JOKER) return; // Skip joker suit

            RANKS.forEach((rank) => {
                const key = `${rank}${suit}`;
                const artist = edition.cardArtists[key] || 'Unknown';
                this.cards.push(new Card(rank, suit, artist));
            });
        });

        // Add jokers with jokerIndex for image lookup
        for (let i = 0; i < GAME_CONFIG.NUM_JOKERS; i++) {
            const artistKey = i === 0 ? 'JOKER_1' : 'JOKER_2';
            const artist = edition.cardArtists[artistKey] || 'Unknown';
            const joker = new Card('JOKER', SUITS.JOKER, artist);
            joker.jokerIndex = i + 1; // 1 or 2
            this.cards.push(joker);
        }
    }

    /**
     * Shuffle the deck using Fisher-Yates algorithm
     */
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
        return this;
    }

    /**
     * Draw n cards from the deck
     */
    draw(count = 1) {
        if (count > this.cards.length) {
            throw new Error(`Cannot draw ${count} cards, only ${this.cards.length} remaining`);
        }
        return this.cards.splice(0, count);
    }

    /**
     * Draw a single card
     */
    drawOne() {
        if (this.cards.length === 0) {
            throw new Error('Cannot draw from empty deck');
        }
        return this.cards.shift();
    }

    /**
     * Get a non-special card (not Ace or Joker) for initial discard
     */
    drawNonSpecial() {
        const index = this.cards.findIndex((card) => !card.isAce && !card.isJoker);
        if (index === -1) {
            throw new Error('No non-special cards available');
        }
        return this.cards.splice(index, 1)[0];
    }

    /**
     * Find and swap a card
     */
    swapCard(cardToRemove, cardToAdd) {
        const index = this.cards.findIndex(
            (c) => c.rank === cardToRemove.rank && c.suit === cardToRemove.suit
        );

        if (index !== -1) {
            this.cards[index] = cardToAdd;
            return true;
        }
        return false;
    }

    /**
     * Find a matching card
     */
    findMatchingCard(targetCard) {
        return this.cards.find(
            (card) => card.suit === targetCard.suit || card.rank === targetCard.rank
        );
    }

    /**
     * Remove a specific card
     */
    removeCard(card) {
        const index = this.cards.findIndex(
            (c) => c.rank === card.rank && c.suit === card.suit && c.artist === card.artist
        );

        if (index !== -1) {
            return this.cards.splice(index, 1)[0];
        }
        return null;
    }

    /**
     * Add card back to deck
     */
    addCard(card) {
        this.cards.push(card);
    }

    /**
     * Get number of remaining cards
     */
    get size() {
        return this.cards.length;
    }

    /**
     * Check if deck is empty
     */
    get isEmpty() {
        return this.cards.length === 0;
    }

    /**
     * Reset and create new deck
     */
    reset() {
        this._initialize();
        return this;
    }

    /**
     * Get all cards (for testing)
     */
    getCards() {
        return [...this.cards];
    }
}
