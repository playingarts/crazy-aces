import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from './GameEngine.js';
import { GameState } from './GameState.js';
import { Card } from '../models/Card.js';

describe('GameEngine', () => {
    let engine;
    let gameState;

    beforeEach(() => {
        gameState = new GameState();
        engine = new GameEngine(gameState);
    });

    describe('canPlayCard', () => {
        beforeEach(() => {
            gameState.currentSuit = '♠';
            gameState.currentRank = '5';
            gameState.jokerWasPlayed = false;
        });

        it('should allow Jokers to be played', () => {
            const joker = new Card('JOKER', 'joker', 'Mike Friedrich');

            expect(engine.canPlayCard(joker)).toBe(true);
        });

        it('should allow Aces to be played', () => {
            const ace = new Card('A', '♥', 'Mr. Kone');

            expect(engine.canPlayCard(ace)).toBe(true);
        });

        it('should allow cards matching the current suit', () => {
            const card = new Card('K', '♠', 'Yulia Brodskaya');

            expect(engine.canPlayCard(card)).toBe(true);
        });

        it('should allow cards matching the current rank', () => {
            const card = new Card('5', '♥', 'Aitch');

            expect(engine.canPlayCard(card)).toBe(true);
        });

        it('should not allow cards with different suit and rank', () => {
            const card = new Card('K', '♥', 'Sara Blake');

            expect(engine.canPlayCard(card)).toBe(false);
        });

        it('should allow any card after Joker was played', () => {
            gameState.jokerWasPlayed = true;
            const card = new Card('10', '♦', 'Lei Melendres');

            expect(engine.canPlayCard(card)).toBe(true);
        });
    });

    describe('checkWinCondition', () => {
        it('should detect player win', () => {
            gameState.playerHand = [];
            gameState.computerHand = [new Card('5', '♠', 'Artist')];

            const result = engine.checkWinCondition();

            expect(result).toBeDefined();
            expect(result.winner).toBe('player');
            expect(gameState.gameOver).toBe(true);
        });

        it('should increment win streak on player win', () => {
            gameState.playerHand = [];
            gameState.winStreak = 2;

            const result = engine.checkWinCondition();

            expect(result.winStreak).toBe(3);
            expect(gameState.winStreak).toBe(3);
        });

        it('should detect computer win', () => {
            gameState.playerHand = [new Card('5', '♠', 'Artist')];
            gameState.computerHand = [];

            const result = engine.checkWinCondition();

            expect(result).toBeDefined();
            expect(result.winner).toBe('computer');
            expect(gameState.gameOver).toBe(true);
        });

        it('should reset win streak on computer win', () => {
            gameState.playerHand = [new Card('5', '♠', 'Artist')];
            gameState.computerHand = [];
            gameState.winStreak = 5;

            engine.checkWinCondition();

            expect(gameState.winStreak).toBe(0);
        });

        it('should return null when game continues', () => {
            gameState.playerHand = [new Card('5', '♠', 'Artist')];
            gameState.computerHand = [new Card('K', '♥', 'Artist')];

            const result = engine.checkWinCondition();

            expect(result).toBeNull();
            expect(gameState.gameOver).toBe(false);
        });
    });

    describe('findComputerPlayableCard', () => {
        beforeEach(() => {
            gameState.currentSuit = '♠';
            gameState.currentRank = '5';
        });

        it('should find a playable card', () => {
            gameState.computerHand = [
                new Card('3', '♥', 'Artist'),
                new Card('K', '♠', 'Artist'), // Playable
                new Card('7', '♦', 'Artist')
            ];

            const index = engine.findComputerPlayableCard();

            expect(index).toBe(1);
        });

        it('should prefer non-special cards over Aces', () => {
            gameState.computerHand = [
                new Card('5', '♦', 'Artist'), // Playable regular card
                new Card('A', '♥', 'Artist'), // Ace
                new Card('7', '♣', 'Artist')
            ];

            const index = engine.findComputerPlayableCard();

            expect(index).toBe(0);
        });

        it('should prefer Aces over Jokers', () => {
            gameState.computerHand = [
                new Card('A', '♥', 'Artist'), // Ace
                new Card('JOKER', 'joker', 'Mike Friedrich'), // Joker
                new Card('3', '♣', 'Artist')
            ];

            const index = engine.findComputerPlayableCard();

            expect(index).toBe(0);
        });

        it('should return -1 when no playable cards', () => {
            gameState.computerHand = [new Card('3', '♥', 'Artist'), new Card('7', '♦', 'Artist')];

            const index = engine.findComputerPlayableCard();

            expect(index).toBe(-1);
        });
    });
});
