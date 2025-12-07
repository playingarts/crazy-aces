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
});
