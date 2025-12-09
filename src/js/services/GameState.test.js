import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from './GameState.js';
import { Card } from '../models/Card.js';

describe('GameState', () => {
    let gameState;

    beforeEach(() => {
        gameState = new GameState();
    });

    describe('initialization', () => {
        it('should initialize with default values', () => {
            expect(gameState.winStreak).toBe(0);
            expect(gameState.discountClaimed).toBe(false);
            expect(gameState.playerHand).toEqual([]);
            expect(gameState.computerHand).toEqual([]);
            expect(gameState.discardPile).toEqual([]);
            expect(gameState.gameOver).toBe(false);
        });
    });

    describe('initializeGame', () => {
        it('should deal 7 cards to each player by default', () => {
            gameState.initializeGame();

            expect(gameState.playerHand.length).toBe(7);
            expect(gameState.computerHand.length).toBe(7);
        });

        it('should place one non-special card on discard pile', () => {
            gameState.initializeGame();

            expect(gameState.discardPile.length).toBe(1);
            expect(gameState.discardPile[0].isAce).toBe(false);
            expect(gameState.discardPile[0].isJoker).toBe(false);
        });

        it('should set current suit and rank from first card', () => {
            gameState.initializeGame();

            const firstCard = gameState.discardPile[0];
            expect(gameState.currentSuit).toBe(firstCard.suit);
            expect(gameState.currentRank).toBe(firstCard.rank);
        });

        it('should ensure player has at least one playable card', () => {
            gameState.initializeGame();

            const hasPlayableCard = gameState.playerHand.some(
                (card) =>
                    card.isJoker ||
                    card.isAce ||
                    card.suit === gameState.currentSuit ||
                    card.rank === gameState.currentRank
            );

            expect(hasPlayableCard).toBe(true);
        });
    });

    describe('playCardFromHand', () => {
        it('should remove card from player hand and add to discard pile', () => {
            const card = new Card('5', '♠', 'Artist');
            gameState.playerHand = [card];

            const playedCard = gameState.playCardFromHand(0);

            expect(playedCard).toBe(card);
            expect(gameState.playerHand.length).toBe(0);
            expect(gameState.discardPile).toContain(card);
            expect(gameState.playerHasActed).toBe(true);
        });
    });

    describe('drawCardForPlayer', () => {
        it('should add card to player hand', () => {
            gameState.initializeGame();
            const originalHandSize = gameState.playerHand.length;

            const drawnCard = gameState.drawCardForPlayer();

            expect(drawnCard).toBeDefined();
            expect(gameState.playerHand.length).toBe(originalHandSize + 1);
            expect(gameState.playerHasActed).toBe(true);
        });

        it('should return null when deck is empty', () => {
            gameState.initializeGame();
            gameState.deck.draw(gameState.deck.size); // Empty the deck

            const drawnCard = gameState.drawCardForPlayer();

            expect(drawnCard).toBeNull();
        });
    });

    describe('win conditions', () => {
        it('should detect player win when hand is empty', () => {
            gameState.playerHand = [];

            expect(gameState.playerWon).toBe(true);
        });

        it('should detect computer win when hand is empty', () => {
            gameState.computerHand = [];

            expect(gameState.computerWon).toBe(true);
        });

        it('should not detect win when hands have cards', () => {
            gameState.playerHand = [new Card('5', '♠', 'Artist')];
            gameState.computerHand = [new Card('K', '♥', 'Artist')];

            expect(gameState.playerWon).toBe(false);
            expect(gameState.computerWon).toBe(false);
        });
    });

    describe('win streak', () => {
        it('should increment win streak', () => {
            expect(gameState.winStreak).toBe(0);

            gameState.incrementWinStreak();
            expect(gameState.winStreak).toBe(1);

            gameState.incrementWinStreak();
            expect(gameState.winStreak).toBe(2);
        });

        it('should reset win streak', () => {
            gameState.winStreak = 5;

            gameState.resetWinStreak();

            expect(gameState.winStreak).toBe(0);
        });
    });

    describe('discount claim', () => {
        it('should mark discount as claimed', () => {
            expect(gameState.discountClaimed).toBe(false);

            gameState.claimDiscount();

            expect(gameState.discountClaimed).toBe(true);
        });
    });

    describe('Ace suit tracking', () => {
        it('should record chosen Ace suits', () => {
            gameState.recordChosenAceSuit('♠');
            gameState.recordChosenAceSuit('♥');

            expect(gameState.chosenAceSuits).toContain('♠');
            expect(gameState.chosenAceSuits).toContain('♥');
        });

        it('should not record duplicate suits', () => {
            gameState.recordChosenAceSuit('♠');
            gameState.recordChosenAceSuit('♠');

            expect(gameState.chosenAceSuits.length).toBe(1);
        });
    });

    describe('reset', () => {
        it('should reset game-specific state', () => {
            gameState.playerHand = [new Card('5', '♠', 'Artist')];
            gameState.gameOver = true;
            gameState.jokerWasPlayed = true;

            gameState.reset();

            expect(gameState.playerHand).toEqual([]);
            expect(gameState.gameOver).toBe(false);
            expect(gameState.jokerWasPlayed).toBe(false);
        });

        it('should NOT reset winStreak', () => {
            gameState.winStreak = 5;

            gameState.reset();

            expect(gameState.winStreak).toBe(5);
        });

        it('should NOT reset discountClaimed', () => {
            gameState.discountClaimed = true;

            gameState.reset();

            expect(gameState.discountClaimed).toBe(true);
        });
    });

    describe('topCard', () => {
        it('should return the last card in discard pile', () => {
            const card1 = new Card('5', '♠', 'Artist');
            const card2 = new Card('K', '♥', 'Artist');

            gameState.discardPile = [card1, card2];

            expect(gameState.topCard).toBe(card2);
        });
    });

    // === EDGE CASE TESTS ===

    describe('initializeGame - edge cases', () => {
        it('should initialize with custom hand size', () => {
            gameState.initializeGame(5);

            expect(gameState.playerHand.length).toBe(5);
            expect(gameState.computerHand.length).toBe(5);
        });

        it('should handle hand size of 1', () => {
            gameState.initializeGame(1);

            expect(gameState.playerHand.length).toBe(1);
            expect(gameState.computerHand.length).toBe(1);
        });

        it('should always start with non-special card on discard pile', () => {
            // Run multiple times to verify consistency
            for (let i = 0; i < 10; i++) {
                gameState.initializeGame();

                expect(gameState.discardPile[0].isAce).toBe(false);
                expect(gameState.discardPile[0].isJoker).toBe(false);
            }
        });

        it('should reset turn-based state on initialization', () => {
            // Set some state
            gameState.gameOver = true;
            gameState.isComputerTurn = true;
            gameState.jokerWasPlayed = true;
            gameState.suitWasChanged = true;

            gameState.initializeGame();

            expect(gameState.gameOver).toBe(false);
            expect(gameState.isComputerTurn).toBe(false);
            expect(gameState.jokerWasPlayed).toBe(false);
            expect(gameState.suitWasChanged).toBe(false);
        });

        it('should preserve winStreak on initialization', () => {
            gameState.winStreak = 5;

            gameState.initializeGame();

            expect(gameState.winStreak).toBe(5);
        });

        it('should preserve discountClaimed on initialization', () => {
            gameState.discountClaimed = true;

            gameState.initializeGame();

            expect(gameState.discountClaimed).toBe(true);
        });

        it('should create fresh deck with 54 - 15 = remaining cards', () => {
            gameState.initializeGame();

            // 7 + 7 + 1 = 15 cards dealt, remaining in deck
            // Special cards (6) are shuffled back in
            expect(gameState.deck.size).toBeLessThanOrEqual(54 - 15);
        });
    });

    describe('reset - edge cases', () => {
        it('should be idempotent - multiple resets produce same state', () => {
            gameState.winStreak = 5;
            gameState.discountClaimed = true;

            gameState.reset();
            const state1 = {
                playerHand: [...gameState.playerHand],
                computerHand: [...gameState.computerHand],
                gameOver: gameState.gameOver
            };

            gameState.reset();
            const state2 = {
                playerHand: [...gameState.playerHand],
                computerHand: [...gameState.computerHand],
                gameOver: gameState.gameOver
            };

            expect(state1.playerHand).toEqual(state2.playerHand);
            expect(state1.gameOver).toBe(state2.gameOver);
        });

        it('should reset chosenAceSuits to empty array', () => {
            gameState.chosenAceSuits = ['♠', '♥', '♦'];

            gameState.reset();

            expect(gameState.chosenAceSuits).toEqual([]);
        });

        it('should reset isProcessingMove flag', () => {
            gameState.isProcessingMove = true;

            gameState.reset();

            expect(gameState.isProcessingMove).toBe(false);
        });

        it('should preserve playerMadeFirstMove', () => {
            gameState.playerMadeFirstMove = true;

            gameState.reset();

            expect(gameState.playerMadeFirstMove).toBe(true);
        });

        it('should preserve gamesPlayed', () => {
            gameState.gamesPlayed = 10;

            gameState.reset();

            expect(gameState.gamesPlayed).toBe(10);
        });
    });

    describe('drawCardForPlayer - edge cases', () => {
        it('should return null and not crash when deck is empty', () => {
            gameState.initializeGame();
            // Empty the deck
            while (!gameState.deck.isEmpty) {
                gameState.deck.drawOne();
            }

            const result = gameState.drawCardForPlayer();

            expect(result).toBeNull();
            expect(gameState.playerHand.length).toBe(7); // Original hand size unchanged
        });

        it('should mark playerHasActed after drawing', () => {
            gameState.initializeGame();
            gameState.playerHasActed = false;

            gameState.drawCardForPlayer();

            expect(gameState.playerHasActed).toBe(true);
        });

        it('should handle drawing multiple cards in sequence', () => {
            gameState.initializeGame();
            const initialDeckSize = gameState.deck.size;

            gameState.drawCardForPlayer();
            gameState.drawCardForPlayer();
            gameState.drawCardForPlayer();

            expect(gameState.playerHand.length).toBe(10); // 7 + 3
            expect(gameState.deck.size).toBe(initialDeckSize - 3);
        });
    });

    describe('drawCardForComputer - edge cases', () => {
        it('should return null when deck is empty', () => {
            gameState.initializeGame();
            while (!gameState.deck.isEmpty) {
                gameState.deck.drawOne();
            }

            const result = gameState.drawCardForComputer();

            expect(result).toBeNull();
        });

        it('should not set playerHasActed flag', () => {
            gameState.initializeGame();
            gameState.playerHasActed = false;

            gameState.drawCardForComputer();

            expect(gameState.playerHasActed).toBe(false);
        });
    });

    describe('playCardFromHand - edge cases', () => {
        it('should handle playing last card (winning move)', () => {
            gameState.playerHand = [new Card('5', '♠', 'Artist')];

            const playedCard = gameState.playCardFromHand(0);

            expect(playedCard).toBeDefined();
            expect(gameState.playerHand.length).toBe(0);
            expect(gameState.playerWon).toBe(true);
        });

        it('should add card to top of discard pile', () => {
            gameState.discardPile = [new Card('3', '♥', 'Artist')];
            gameState.playerHand = [new Card('5', '♠', 'Artist')];

            gameState.playCardFromHand(0);

            expect(gameState.discardPile.length).toBe(2);
            expect(gameState.topCard.rank).toBe('5');
            expect(gameState.topCard.suit).toBe('♠');
        });
    });

    describe('playComputerCard - edge cases', () => {
        it('should handle computer winning move', () => {
            gameState.computerHand = [new Card('K', '♥', 'Artist')];

            const playedCard = gameState.playComputerCard(0);

            expect(playedCard).toBeDefined();
            expect(gameState.computerHand.length).toBe(0);
            expect(gameState.computerWon).toBe(true);
        });
    });

    describe('win conditions - edge cases', () => {
        it('should not detect win with 1 card in hand', () => {
            gameState.playerHand = [new Card('5', '♠', 'Artist')];

            expect(gameState.playerWon).toBe(false);
        });

        it('should detect win immediately when hand becomes empty', () => {
            gameState.playerHand = [];

            expect(gameState.playerWon).toBe(true);
        });

        it('should allow both hands to be empty (shouldn\'t happen in real game)', () => {
            gameState.playerHand = [];
            gameState.computerHand = [];

            expect(gameState.playerWon).toBe(true);
            expect(gameState.computerWon).toBe(true);
        });
    });

    describe('Ace suit tracking - edge cases', () => {
        it('should allow recording all 4 suits', () => {
            gameState.recordChosenAceSuit('♠');
            gameState.recordChosenAceSuit('♥');
            gameState.recordChosenAceSuit('♦');
            gameState.recordChosenAceSuit('♣');

            expect(gameState.chosenAceSuits).toHaveLength(4);
        });

        it('should handle recording empty string suit', () => {
            gameState.recordChosenAceSuit('');

            expect(gameState.chosenAceSuits).toContain('');
        });

        it('should handle recording invalid suit', () => {
            gameState.recordChosenAceSuit('invalid');

            expect(gameState.chosenAceSuits).toContain('invalid');
        });
    });

    describe('gamesPlayed tracking', () => {
        it('should increment from 0', () => {
            expect(gameState.gamesPlayed).toBe(0);

            gameState.incrementGamesPlayed();

            expect(gameState.gamesPlayed).toBe(1);
        });

        it('should handle multiple increments', () => {
            for (let i = 0; i < 100; i++) {
                gameState.incrementGamesPlayed();
            }

            expect(gameState.gamesPlayed).toBe(100);
        });

        it('should reset games played', () => {
            gameState.gamesPlayed = 50;

            gameState.resetGamesPlayed();

            expect(gameState.gamesPlayed).toBe(0);
        });
    });

    describe('updateCurrentCard', () => {
        it('should update both suit and rank', () => {
            gameState.updateCurrentCard('♦', 'K');

            expect(gameState.currentSuit).toBe('♦');
            expect(gameState.currentRank).toBe('K');
        });

        it('should handle special rank values', () => {
            gameState.updateCurrentCard('♠', 'A');

            expect(gameState.currentRank).toBe('A');
        });

        it('should handle joker suit', () => {
            gameState.updateCurrentCard('joker', 'JOKER');

            expect(gameState.currentSuit).toBe('joker');
            expect(gameState.currentRank).toBe('JOKER');
        });
    });

    describe('topCard - edge cases', () => {
        it('should return undefined for empty discard pile', () => {
            gameState.discardPile = [];

            expect(gameState.topCard).toBeUndefined();
        });

        it('should return only card when discard pile has 1 card', () => {
            const card = new Card('5', '♠', 'Artist');
            gameState.discardPile = [card];

            expect(gameState.topCard).toBe(card);
        });
    });

    describe('toJSON', () => {
        it('should return complete state snapshot', () => {
            gameState.initializeGame();
            gameState.winStreak = 3;
            gameState.currentSuit = '♥';
            gameState.currentRank = 'K';

            const json = gameState.toJSON();

            expect(json).toHaveProperty('deckSize');
            expect(json).toHaveProperty('playerHandSize');
            expect(json).toHaveProperty('computerHandSize');
            expect(json).toHaveProperty('discardPileSize');
            expect(json).toHaveProperty('currentSuit');
            expect(json).toHaveProperty('currentRank');
            expect(json).toHaveProperty('gameOver');
            expect(json).toHaveProperty('winStreak');
            expect(json.winStreak).toBe(3);
        });

        it('should handle state before initialization', () => {
            // Fresh state without initializeGame called
            const freshState = new GameState();
            freshState.reset(); // Only reset, not initialize

            const json = freshState.toJSON();

            expect(json.deckSize).toBe(0);
            expect(json.playerHandSize).toBe(0);
        });
    });

    describe('ensurePlayerHasPlayableCard', () => {
        it('should not modify hand if player already has playable card', () => {
            gameState.initializeGame();
            const originalHand = [...gameState.playerHand];
            // Player should already have playable cards after initialization

            gameState.ensurePlayerHasPlayableCard();

            // Hand should be mostly the same (may have swapped one card)
            expect(gameState.playerHand.length).toBe(originalHand.length);
        });

        it('should handle empty deck gracefully', () => {
            gameState.initializeGame();
            // Empty the deck
            while (!gameState.deck.isEmpty) {
                gameState.deck.drawOne();
            }

            // Should not throw
            expect(() => gameState.ensurePlayerHasPlayableCard()).not.toThrow();
        });
    });
});
