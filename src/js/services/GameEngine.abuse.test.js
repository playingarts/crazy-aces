/**
 * GameEngine Abuse Tests
 * Tests for security vulnerabilities, edge cases, and weird player behavior
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from './GameEngine.js';
import { GameState } from './GameState.js';
import { Card } from '../models/Card.js';
import { Deck } from '../models/Deck.js';

describe('GameEngine - Abuse Cases', () => {
    let engine;
    let gameState;

    beforeEach(() => {
        gameState = new GameState();
        engine = new GameEngine(gameState);
    });

    describe('Rapid state changes (simulating button spam)', () => {
        it('should handle 100 rapid canPlayCard calls without state corruption', () => {
            gameState.currentSuit = '♠';
            gameState.currentRank = '5';
            const card = new Card('K', '♠', 'Artist');

            // Simulate 100 rapid calls
            const results = [];
            for (let i = 0; i < 100; i++) {
                results.push(engine.canPlayCard(card));
            }

            // All results should be consistent
            expect(results.every(r => r === true)).toBe(true);
        });

        it('should handle rapid joker flag toggling', () => {
            gameState.currentSuit = '♠';
            gameState.currentRank = '5';
            const nonMatchingCard = new Card('3', '♥', 'Artist');

            // Rapidly toggle joker flag
            for (let i = 0; i < 50; i++) {
                gameState.jokerWasPlayed = true;
                expect(engine.canPlayCard(nonMatchingCard)).toBe(true);
                gameState.jokerWasPlayed = false;
                expect(engine.canPlayCard(nonMatchingCard)).toBe(false);
            }
        });

        it('should handle concurrent validatePlayerMove calls', async () => {
            gameState.currentSuit = '♠';
            gameState.currentRank = '5';
            gameState.playerHand = [
                new Card('K', '♠', 'Artist'),
                new Card('3', '♥', 'Artist')
            ];

            // Simulate concurrent validation attempts
            const promises = Array(20).fill(null).map((_, i) =>
                Promise.resolve(engine.validatePlayerMove(i % 2))
            );

            const results = await Promise.all(promises);

            // Index 0 (valid) should always be valid
            // Index 1 (invalid) should always be invalid
            results.forEach((result, i) => {
                if (i % 2 === 0) {
                    expect(result.valid).toBe(true);
                } else {
                    expect(result.valid).toBe(false);
                }
            });
        });
    });

    describe('Invalid/malicious input handling', () => {
        beforeEach(() => {
            gameState.currentSuit = '♠';
            gameState.currentRank = '5';
        });

        it('should handle canPlayCard with null', () => {
            expect(engine.canPlayCard(null)).toBe(false);
        });

        it('should handle canPlayCard with undefined', () => {
            expect(engine.canPlayCard(undefined)).toBe(false);
        });

        it('should handle canPlayCard with empty object', () => {
            expect(() => engine.canPlayCard({})).not.toThrow();
        });

        it('should handle canPlayCard with partial card object (missing suit)', () => {
            const partialCard = { rank: '5' };
            expect(() => engine.canPlayCard(partialCard)).not.toThrow();
        });

        it('should handle canPlayCard with partial card object (missing rank)', () => {
            const partialCard = { suit: '♠' };
            expect(() => engine.canPlayCard(partialCard)).not.toThrow();
        });

        it('should handle validatePlayerMove with invalid indices', () => {
            gameState.playerHand = [new Card('5', '♠', 'Artist')];

            const invalidIndices = [-1, -100, 1, 2, 999];

            invalidIndices.forEach(index => {
                const result = engine.validatePlayerMove(index);
                expect(result.valid).toBe(false);
            });
        });

        it('should handle validatePlayerMove with NaN index', () => {
            gameState.playerHand = [new Card('5', '♠', 'Artist')];
            const result = engine.validatePlayerMove(NaN);
            expect(result.valid).toBe(false);
        });

        it('should handle validatePlayerMove with Infinity index', () => {
            gameState.playerHand = [new Card('5', '♠', 'Artist')];
            const result = engine.validatePlayerMove(Infinity);
            expect(result.valid).toBe(false);
        });
    });

    describe('State corruption attempts', () => {
        it('should handle win check when hands are manipulated mid-game', () => {
            gameState.playerHand = [new Card('5', '♠', 'Artist')];
            gameState.computerHand = [new Card('K', '♥', 'Artist')];

            // Simulate manipulation - empty both hands
            gameState.playerHand = [];
            gameState.computerHand = [];

            const result = engine.checkWinCondition();
            // Player wins (checked first)
            expect(result.winner).toBe('player');
        });

        it('should handle computer hand being emptied externally', () => {
            gameState.currentSuit = '♠';
            gameState.currentRank = '5';
            gameState.computerHand = [new Card('K', '♠', 'Artist')];

            // External code empties hand
            gameState.computerHand.length = 0;

            const index = engine.findComputerPlayableCard();
            expect(index).toBe(-1);
        });

        it('should handle currentSuit being modified to invalid value', () => {
            gameState.currentSuit = 'INVALID_SUIT';
            gameState.currentRank = '5';
            const card = new Card('5', '♠', 'Artist');

            // Should still match by rank
            expect(engine.canPlayCard(card)).toBe(true);
        });

        it('should handle currentRank being modified to invalid value', () => {
            gameState.currentSuit = '♠';
            gameState.currentRank = 'INVALID_RANK';
            const card = new Card('5', '♠', 'Artist');

            // Should still match by suit
            expect(engine.canPlayCard(card)).toBe(true);
        });
    });

    describe('Extreme boundary conditions', () => {
        it('should handle win streak at Number.MAX_SAFE_INTEGER', () => {
            gameState.playerHand = [];
            gameState.computerHand = [new Card('5', '♠', 'Artist')];
            gameState.winStreak = Number.MAX_SAFE_INTEGER - 1;

            const result = engine.checkWinCondition();
            expect(result.winStreak).toBe(Number.MAX_SAFE_INTEGER);
        });

        it('should handle win streak at 0', () => {
            gameState.playerHand = [];
            gameState.computerHand = [new Card('5', '♠', 'Artist')];
            gameState.winStreak = 0;

            const result = engine.checkWinCondition();
            expect(result.winStreak).toBe(1);
        });

        it('should handle chooseBestSuitForComputer with large hand (25 cards)', () => {
            gameState.computerHand = [];
            // Add 25 cards with mixed suits
            for (let i = 0; i < 25; i++) {
                const suits = ['♠', '♥', '♦', '♣'];
                const suit = suits[i % 4];
                const rank = String((i % 9) + 2);
                gameState.computerHand.push(new Card(rank, suit, 'Artist'));
            }
            gameState.chosenAceSuits = [];

            const suit = engine.chooseBestSuitForComputer();
            expect(['♠', '♥', '♦', '♣']).toContain(suit);
        });

        it('should handle empty player hand for hasPlayableCards', () => {
            gameState.playerHand = [];
            expect(engine.hasPlayableCards(false)).toBe(false);
        });

        it('should handle empty computer hand for hasPlayableCards', () => {
            gameState.computerHand = [];
            expect(engine.hasPlayableCards(true)).toBe(false);
        });
    });

    describe('Joker and Ace edge cases', () => {
        beforeEach(() => {
            gameState.currentSuit = '♥';
            gameState.currentRank = 'K';
        });

        it('should allow playing Joker on any card', () => {
            const joker = new Card('JOKER', 'joker', 'Mike Friedrich');
            expect(engine.canPlayCard(joker)).toBe(true);
        });

        it('should allow playing Ace on any card', () => {
            const ace = new Card('A', '♣', 'Artist');
            expect(engine.canPlayCard(ace)).toBe(true);
        });

        it('should allow any card after jokerWasPlayed is true', () => {
            gameState.jokerWasPlayed = true;
            const randomCard = new Card('3', '♣', 'Artist');
            expect(engine.canPlayCard(randomCard)).toBe(true);
        });

        it('should handle multiple Jokers in sequence', () => {
            const joker1 = new Card('JOKER', 'joker', 'Mike Friedrich');
            expect(engine.canPlayCard(joker1)).toBe(true);

            gameState.jokerWasPlayed = true;
            const joker2 = new Card('JOKER', 'joker', 'Joshua Davis');
            expect(engine.canPlayCard(joker2)).toBe(true);
        });

        it('should handle all 4 suits already chosen', () => {
            gameState.computerHand = [
                new Card('5', '♠', 'Artist'),
                new Card('7', '♠', 'Artist')
            ];
            gameState.chosenAceSuits = ['♠', '♥', '♦', '♣'];

            const suit = engine.chooseBestSuitForComputer();
            // Should still return a suit (fallback)
            expect(suit).toBeDefined();
        });

        it('should handle 3 suits chosen, only 1 remaining', () => {
            gameState.computerHand = [
                new Card('5', '♣', 'Artist')
            ];
            gameState.chosenAceSuits = ['♠', '♥', '♦'];

            const suit = engine.chooseBestSuitForComputer();
            expect(suit).toBe('♣');
        });
    });

    describe('Draw two edge cases', () => {
        beforeEach(() => {
            gameState.deck = new Deck();
            gameState.playerHand = [];
            gameState.computerHand = [];
        });

        it('should handle drawing from empty deck', () => {
            gameState.deck.cards = [];
            const drawnCards = engine.executeDrawTwo(true);
            expect(drawnCards).toHaveLength(0);
        });

        it('should handle drawing when deck has only 1 card', () => {
            gameState.deck.cards = [new Card('5', '♠', 'Artist')];
            const drawnCards = engine.executeDrawTwo(true);
            expect(drawnCards).toHaveLength(1);
        });

        it('should add cards to correct recipient (computer)', () => {
            const drawnCards = engine.executeDrawTwo(true);
            expect(gameState.computerHand.length).toBe(2);
            expect(gameState.playerHand.length).toBe(0);
        });

        it('should add cards to correct recipient (player)', () => {
            const drawnCards = engine.executeDrawTwo(false);
            expect(gameState.playerHand.length).toBe(2);
            expect(gameState.computerHand.length).toBe(0);
        });
    });

    describe('Computer turn edge cases', () => {
        beforeEach(() => {
            gameState.deck = new Deck();
            gameState.currentSuit = '♠';
            gameState.currentRank = '5';
        });

        it('should handle computer turn with empty hand', async () => {
            gameState.computerHand = [];

            const result = await engine.executeComputerTurn();

            // With empty hand but cards in deck, should draw
            expect(['draw', 'pass']).toContain(result.action);
        });

        it('should handle computer turn when only wild cards available', async () => {
            gameState.computerHand = [
                new Card('JOKER', 'joker', 'Artist'),
                new Card('A', '♥', 'Artist')
            ];

            const result = await engine.executeComputerTurn();

            expect(result.action).toBe('play');
        });

        it('should handle computer playing Ace and choosing suit', async () => {
            gameState.computerHand = [
                new Card('A', '♥', 'Artist')
            ];
            gameState.chosenAceSuits = [];

            const result = await engine.executeComputerTurn();

            expect(result.action).toBe('play');
            expect(result.newSuit).toBeDefined();
        });
    });

    describe('Multiple rapid win checks', () => {
        it('should be idempotent - multiple win checks return same result', () => {
            gameState.playerHand = [];
            gameState.computerHand = [new Card('5', '♠', 'Artist')];

            const result1 = engine.checkWinCondition();
            const result2 = engine.checkWinCondition();
            const result3 = engine.checkWinCondition();

            expect(result1.winner).toBe('player');
            expect(result2.winner).toBe('player');
            expect(result3.winner).toBe('player');
        });

        it('should track gamesPlayed consistently across multiple checks', () => {
            gameState.playerHand = [];
            gameState.computerHand = [new Card('5', '♠', 'Artist')];
            gameState.gamesPlayed = 5;

            engine.checkWinCondition();
            // First check increments
            expect(gameState.gamesPlayed).toBe(6);

            // Subsequent checks on same game state should keep incrementing
            // (this is expected behavior - game controller should only call once)
            engine.checkWinCondition();
            expect(gameState.gamesPlayed).toBe(7);
        });
    });
});
