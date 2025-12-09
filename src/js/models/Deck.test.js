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

    // === EDGE CASE TESTS ===

    describe('draw - edge cases', () => {
        it('should draw exactly all 54 cards', () => {
            const deck = new Deck();
            const cards = deck.draw(54);

            expect(cards.length).toBe(54);
            expect(deck.size).toBe(0);
            expect(deck.isEmpty).toBe(true);
        });

        it('should draw 0 cards and return empty array', () => {
            const deck = new Deck();
            const cards = deck.draw(0);

            expect(cards.length).toBe(0);
            expect(deck.size).toBe(54);
        });

        it('should throw when drawing 1 more than deck size', () => {
            const deck = new Deck();
            deck.draw(54); // Empty the deck

            expect(() => deck.draw(1)).toThrow('Cannot draw 1 cards, only 0 remaining');
        });

        it('should handle drawing with exactly 1 card left', () => {
            const deck = new Deck();
            deck.draw(53); // Leave 1 card

            expect(deck.size).toBe(1);

            const cards = deck.draw(1);
            expect(cards.length).toBe(1);
            expect(deck.isEmpty).toBe(true);
        });
    });

    describe('drawNonSpecial - edge cases', () => {
        it('should throw when only Aces and Jokers remain', () => {
            const deck = new Deck();
            // Keep only special cards
            deck.cards = deck.cards.filter((card) => card.isAce || card.isJoker);

            expect(() => deck.drawNonSpecial()).toThrow('No non-special cards available');
        });

        it('should work when exactly one non-special card remains', () => {
            const deck = new Deck();
            // Keep one 5 of spades plus special cards
            deck.cards = deck.cards.filter(
                (card) => card.isAce || card.isJoker || (card.rank === '5' && card.suit === '♠')
            );

            const card = deck.drawNonSpecial();
            expect(card.rank).toBe('5');
            expect(card.suit).toBe('♠');
        });
    });

    describe('swapCard - edge cases', () => {
        it('should return false when card to remove is not in deck', () => {
            const deck = new Deck();
            const fakeCard = { rank: 'X', suit: 'Y' };
            const newCard = { rank: 'A', suit: '♠' };

            const result = deck.swapCard(fakeCard, newCard);
            expect(result).toBe(false);
        });

        it('should swap first matching card only', () => {
            const deck = new Deck();
            const cardToFind = deck.cards[0];
            const newCard = { rank: 'X', suit: 'X', artist: 'Test' };

            const result = deck.swapCard(cardToFind, newCard);
            expect(result).toBe(true);
            expect(deck.cards[0]).toBe(newCard);
        });
    });

    describe('removeCard - edge cases', () => {
        it('should return null when card is not in deck', () => {
            const deck = new Deck();
            const fakeCard = { rank: 'X', suit: 'Y', artist: 'Fake' };

            const result = deck.removeCard(fakeCard);
            expect(result).toBeNull();
        });

        it('should require matching artist to remove card', () => {
            const deck = new Deck();
            const realCard = deck.cards[0];
            const cardWithWrongArtist = { rank: realCard.rank, suit: realCard.suit, artist: 'Wrong' };

            const result = deck.removeCard(cardWithWrongArtist);
            expect(result).toBeNull();
            expect(deck.size).toBe(54); // Card not removed
        });
    });

    describe('findMatchingCard - edge cases', () => {
        it('should return undefined for non-matching criteria', () => {
            const deck = new Deck();

            const result = deck.findMatchingCard({ suit: 'INVALID', rank: 'INVALID' });
            expect(result).toBeUndefined();
        });

        it('should match by suit only when rank differs', () => {
            const deck = new Deck();
            const match = deck.findMatchingCard({ suit: '♠', rank: 'NONEXISTENT' });

            expect(match).toBeDefined();
            expect(match.suit).toBe('♠');
        });

        it('should match by rank only when suit differs', () => {
            const deck = new Deck();
            const match = deck.findMatchingCard({ suit: 'NONEXISTENT', rank: 'K' });

            expect(match).toBeDefined();
            expect(match.rank).toBe('K');
        });
    });

    describe('addCard - edge cases', () => {
        it('should add card to empty deck', () => {
            const deck = new Deck();
            deck.cards = []; // Empty the deck

            const card = { rank: '5', suit: '♠', artist: 'Test' };
            deck.addCard(card);

            expect(deck.size).toBe(1);
            expect(deck.cards[0]).toBe(card);
        });

        it('should add card to end of deck', () => {
            const deck = new Deck();
            const card = { rank: 'X', suit: 'X', artist: 'Test' };

            deck.addCard(card);

            expect(deck.size).toBe(55);
            expect(deck.cards[54]).toBe(card);
        });
    });

    describe('reset', () => {
        it('should restore deck to full 54 cards after being emptied', () => {
            const deck = new Deck();
            deck.draw(54);

            expect(deck.isEmpty).toBe(true);

            deck.reset();

            expect(deck.size).toBe(54);
            expect(deck.isEmpty).toBe(false);
        });

        it('should return deck instance for chaining', () => {
            const deck = new Deck();
            const result = deck.reset();

            expect(result).toBe(deck);
        });
    });

    describe('getCards', () => {
        it('should return a copy, not the original array', () => {
            const deck = new Deck();
            const copy = deck.getCards();

            copy.pop(); // Modify the copy

            expect(deck.size).toBe(54); // Original unaffected
            expect(copy.length).toBe(53);
        });
    });
});
