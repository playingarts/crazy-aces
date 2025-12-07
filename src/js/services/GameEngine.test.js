import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from './GameEngine.js';
import { GameState } from './GameState.js';
import { Card } from '../models/Card.js';
import { Deck } from '../models/Deck.js';

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

    describe('chooseBestSuitForComputer', () => {
        it('should choose suit with most cards in computer hand', () => {
            gameState.computerHand = [
                new Card('5', '♠', 'Artist'),
                new Card('7', '♠', 'Artist'),
                new Card('K', '♠', 'Artist'), // 3 spades
                new Card('3', '♥', 'Artist'),
                new Card('9', '♦', 'Artist')
            ];
            gameState.chosenAceSuits = [];

            const suit = engine.chooseBestSuitForComputer();

            expect(suit).toBe('♠');
        });

        it('should exclude already chosen suits', () => {
            gameState.computerHand = [
                new Card('5', '♠', 'Artist'),
                new Card('7', '♠', 'Artist'),
                new Card('K', '♠', 'Artist'), // 3 spades
                new Card('3', '♥', 'Artist'),
                new Card('9', '♥', 'Artist') // 2 hearts
            ];
            gameState.chosenAceSuits = ['♠']; // Spades already chosen

            const suit = engine.chooseBestSuitForComputer();

            expect(suit).toBe('♥');
        });

        it('should ignore jokers when counting suits', () => {
            gameState.computerHand = [
                new Card('JOKER', 'joker', 'Mike Friedrich'),
                new Card('5', '♦', 'Artist'),
                new Card('7', '♦', 'Artist')
            ];
            gameState.chosenAceSuits = [];

            const suit = engine.chooseBestSuitForComputer();

            expect(suit).toBe('♦');
        });
    });

    describe('hasPlayableCards', () => {
        beforeEach(() => {
            gameState.currentSuit = '♠';
            gameState.currentRank = '5';
        });

        it('should return true if player has playable cards', () => {
            gameState.playerHand = [
                new Card('3', '♥', 'Artist'),
                new Card('K', '♠', 'Artist') // Playable
            ];

            expect(engine.hasPlayableCards(false)).toBe(true);
        });

        it('should return false if player has no playable cards', () => {
            gameState.playerHand = [new Card('3', '♥', 'Artist'), new Card('7', '♦', 'Artist')];

            expect(engine.hasPlayableCards(false)).toBe(false);
        });

        it('should check computer hand when isComputer=true', () => {
            gameState.computerHand = [
                new Card('3', '♥', 'Artist'),
                new Card('K', '♠', 'Artist') // Playable
            ];

            expect(engine.hasPlayableCards(true)).toBe(true);
        });
    });

    describe('processCardEffect', () => {
        it('should set jokerWasPlayed flag for Joker cards', () => {
            const joker = new Card('JOKER', 'joker', 'Mike Friedrich');

            const effect = engine.processCardEffect(joker);

            expect(effect.needsSuitSelection).toBe(true);
            expect(gameState.jokerWasPlayed).toBe(true);
        });

        it('should not need suit selection for computer-played Joker', () => {
            const joker = new Card('JOKER', 'joker', 'Mike Friedrich');

            const effect = engine.processCardEffect(joker, true);

            expect(effect.needsSuitSelection).toBe(false);
            expect(gameState.jokerWasPlayed).toBe(true);
        });

        it('should need suit selection for Ace cards', () => {
            const ace = new Card('A', '♥', 'Mr. Kone');

            const effect = engine.processCardEffect(ace);

            expect(effect.needsSuitSelection).toBe(true);
        });

        it('should set drawTwo effect for 2 cards', () => {
            const two = new Card('2', '♠', 'Artist');

            const effect = engine.processCardEffect(two);

            expect(effect.drawTwo).toBe(true);
        });

        it('should update current card for regular cards', () => {
            const card = new Card('K', '♠', 'Artist');

            engine.processCardEffect(card);

            expect(gameState.currentSuit).toBe('♠');
            expect(gameState.currentRank).toBe('K');
        });

        it('should reset jokerWasPlayed flag', () => {
            gameState.jokerWasPlayed = true;
            const card = new Card('K', '♠', 'Artist');

            engine.processCardEffect(card);

            expect(gameState.jokerWasPlayed).toBe(false);
        });
    });

    describe('executeDrawTwo', () => {
        beforeEach(() => {
            // Initialize deck for draw tests
            gameState.deck = new Deck();
        });

        it('should draw two cards for computer', () => {
            const drawnCards = engine.executeDrawTwo(true);

            expect(drawnCards).toHaveLength(2);
            expect(gameState.computerHand).toHaveLength(2);
        });

        it('should draw two cards for player', () => {
            const drawnCards = engine.executeDrawTwo(false);

            expect(drawnCards).toHaveLength(2);
            expect(gameState.playerHand).toHaveLength(2);
        });

        it('should handle empty deck gracefully', () => {
            gameState.deck.cards = [new Card('5', '♠', 'Artist')]; // Only 1 card left

            const drawnCards = engine.executeDrawTwo(true);

            expect(drawnCards).toHaveLength(1);
        });
    });

    describe('validatePlayerMove', () => {
        beforeEach(() => {
            gameState.currentSuit = '♠';
            gameState.currentRank = '5';
            gameState.playerHand = [
                new Card('K', '♠', 'Artist'), // Playable
                new Card('3', '♥', 'Artist') // Not playable
            ];
        });

        it('should validate playable card', () => {
            const result = engine.validatePlayerMove(0);

            expect(result.valid).toBe(true);
        });

        it('should reject unplayable card', () => {
            const result = engine.validatePlayerMove(1);

            expect(result.valid).toBe(false);
            expect(result.reason).toBe('Card cannot be played on current card');
        });

        it('should reject move when drawing', () => {
            gameState.isDrawing = true;

            const result = engine.validatePlayerMove(0);

            expect(result.valid).toBe(false);
            expect(result.reason).toBe('Wait for draw to complete');
        });

        it('should reject move when game is over', () => {
            gameState.gameOver = true;

            const result = engine.validatePlayerMove(0);

            expect(result.valid).toBe(false);
            expect(result.reason).toBe('Game is over');
        });

        it('should reject invalid card index', () => {
            const result = engine.validatePlayerMove(999);

            expect(result.valid).toBe(false);
            expect(result.reason).toBe('Invalid card');
        });
    });
});
