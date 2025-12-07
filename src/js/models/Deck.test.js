import { describe, it, expect } from 'vitest';
import { Deck } from './Deck.js';

describe('Deck', () => {
    it('should create a deck with 54 cards (52 regular + 2 jokers)', () => {
        const deck = new Deck();

        expect(deck.cards.length).toBe(54);
    });

    it('should have 13 cards per suit', () => {
        const deck = new Deck();
        const suits = { '♠': 0, '♥': 0, '♦': 0, '♣': 0 };

        deck.cards.forEach((card) => {
            if (!card.isJoker) {
                suits[card.suit]++;
            }
        });

        expect(suits['♠']).toBe(13);
        expect(suits['♥']).toBe(13);
        expect(suits['♦']).toBe(13);
        expect(suits['♣']).toBe(13);
    });

    it('should have 2 jokers', () => {
        const deck = new Deck();
        const jokers = deck.cards.filter((card) => card.isJoker);

        expect(jokers.length).toBe(2);
        expect(jokers[0].artist).toBe('Mike Friedrich');
        expect(jokers[1].artist).toBe('Joshua Davis');
    });

    it('should have 4 Aces', () => {
        const deck = new Deck();
        const aces = deck.cards.filter((card) => card.isAce);

        expect(aces.length).toBe(4);
    });

    describe('shuffle', () => {
        it('should shuffle the deck', () => {
            const deck1 = new Deck();
            const originalOrder = [...deck1.cards];

            const deck2 = new Deck().shuffle();

            // Very unlikely to have same order after shuffle
            const isSameOrder = deck2.cards.every((card, i) => card === originalOrder[i]);
            expect(isSameOrder).toBe(false);
        });

        it('should return the deck instance for chaining', () => {
            const deck = new Deck();
            const result = deck.shuffle();

            expect(result).toBe(deck);
        });
    });

    describe('draw', () => {
        it('should draw specified number of cards', () => {
            const deck = new Deck();
            const cards = deck.draw(7);

            expect(cards.length).toBe(7);
            expect(deck.size).toBe(47);
        });

        it('should remove drawn cards from deck', () => {
            const deck = new Deck();
            const originalSize = deck.size;
            const drawnCards = deck.draw(5);

            expect(deck.size).toBe(originalSize - 5);
            drawnCards.forEach((card) => {
                expect(deck.cards.includes(card)).toBe(false);
            });
        });

        it('should throw error if count exceeds deck size', () => {
            const deck = new Deck();

            expect(() => deck.draw(100)).toThrow('Cannot draw 100 cards');
        });
    });

    describe('drawOne', () => {
        it('should draw one card', () => {
            const deck = new Deck();
            const card = deck.drawOne();

            expect(card).toBeDefined();
            expect(deck.size).toBe(53);
        });

        it('should throw error when deck is empty', () => {
            const deck = new Deck();
            deck.draw(54); // Draw all cards

            expect(() => deck.drawOne()).toThrow('Cannot draw from empty deck');
        });
    });

    describe('drawNonSpecial', () => {
        it('should draw a card that is not an Ace or Joker', () => {
            const deck = new Deck().shuffle();
            const card = deck.drawNonSpecial();

            expect(card.isAce).toBe(false);
            expect(card.isJoker).toBe(false);
        });

        it('should remove the card from the deck', () => {
            const deck = new Deck();
            const originalSize = deck.size;
            const card = deck.drawNonSpecial();

            expect(deck.size).toBe(originalSize - 1);
            expect(deck.cards.includes(card)).toBe(false);
        });
    });

    describe('findMatchingCard', () => {
        it('should find a card matching the suit', () => {
            const deck = new Deck();
            const match = deck.findMatchingCard({ suit: '♠', rank: '5' });

            expect(match).toBeDefined();
            expect(match.suit).toBe('♠');
        });

        it('should find a card matching the rank', () => {
            const deck = new Deck();
            const match = deck.findMatchingCard({ suit: '♦', rank: 'K' });

            expect(match).toBeDefined();
            expect(match.rank).toBe('K');
        });

        it('should return undefined if no match found', () => {
            const deck = new Deck();
            // Draw all cards of a specific rank
            deck.cards = deck.cards.filter((card) => card.rank !== '7');

            const match = deck.findMatchingCard({ suit: 'NONEXISTENT', rank: '7' });
            expect(match).toBeUndefined();
        });
    });

    describe('isEmpty', () => {
        it('should return false when deck has cards', () => {
            const deck = new Deck();

            expect(deck.isEmpty).toBe(false);
        });

        it('should return true when deck is empty', () => {
            const deck = new Deck();
            deck.draw(54);

            expect(deck.isEmpty).toBe(true);
        });
    });

    describe('size', () => {
        it('should return the number of cards in the deck', () => {
            const deck = new Deck();

            expect(deck.size).toBe(54);

            deck.draw(10);
            expect(deck.size).toBe(44);
        });
    });
});
