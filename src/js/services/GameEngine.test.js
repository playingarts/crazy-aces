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

    // === EDGE CASE TESTS ===

    describe('canPlayCard - edge cases', () => {
        beforeEach(() => {
            gameState.currentSuit = '♠';
            gameState.currentRank = '5';
            gameState.jokerWasPlayed = false;
        });

        it('should return false for null card', () => {
            expect(engine.canPlayCard(null)).toBe(false);
        });

        it('should return false for undefined card', () => {
            expect(engine.canPlayCard(undefined)).toBe(false);
        });

        it('should allow card matching suit but not rank', () => {
            const card = new Card('K', '♠', 'Artist');
            expect(engine.canPlayCard(card)).toBe(true);
        });

        it('should allow card matching rank but not suit', () => {
            const card = new Card('5', '♥', 'Artist');
            expect(engine.canPlayCard(card)).toBe(true);
        });

        it('should allow card matching both suit and rank', () => {
            const card = new Card('5', '♠', 'Artist');
            expect(engine.canPlayCard(card)).toBe(true);
        });

        it('should allow multiple Jokers in sequence', () => {
            const joker1 = new Card('JOKER', 'joker', 'Mike Friedrich');
            expect(engine.canPlayCard(joker1)).toBe(true);

            gameState.jokerWasPlayed = true;
            const joker2 = new Card('JOKER', 'joker', 'Joshua Davis');
            expect(engine.canPlayCard(joker2)).toBe(true);
        });

        it('should allow Ace after Ace (Ace is always wild)', () => {
            const ace1 = new Card('A', '♠', 'Artist');
            expect(engine.canPlayCard(ace1)).toBe(true);

            gameState.currentSuit = '♥'; // Ace changed suit
            gameState.currentRank = 'A';
            const ace2 = new Card('A', '♦', 'Artist');
            expect(engine.canPlayCard(ace2)).toBe(true);
        });

        it('should allow non-matching card after Joker was played', () => {
            gameState.jokerWasPlayed = true;
            const card = new Card('3', '♣', 'Artist'); // Doesn't match ♠ or 5

            expect(engine.canPlayCard(card)).toBe(true);
        });

        it('should handle card with empty string suit', () => {
            const card = new Card('5', '', 'Artist');
            // Should only match rank
            expect(engine.canPlayCard(card)).toBe(true); // Matches rank 5
        });

        it('should handle 2 card (draw two) as regular matching card', () => {
            gameState.currentRank = '2';
            const two = new Card('2', '♥', 'Artist');

            expect(engine.canPlayCard(two)).toBe(true); // Matches rank
        });
    });

    describe('checkWinCondition - edge cases', () => {
        it('should be idempotent - multiple calls with same state return same result', () => {
            gameState.playerHand = [];
            gameState.computerHand = [new Card('5', '♠', 'Artist')];

            const result1 = engine.checkWinCondition();
            const result2 = engine.checkWinCondition();

            expect(result1.winner).toBe('player');
            expect(result2.winner).toBe('player');
        });

        it('should handle win with exactly 1 card in discard pile', () => {
            gameState.playerHand = [];
            gameState.computerHand = [new Card('5', '♠', 'Artist')];
            gameState.discardPile = [new Card('K', '♥', 'Artist')];

            const result = engine.checkWinCondition();
            expect(result.winner).toBe('player');
        });

        it('should handle win while jokerWasPlayed is true', () => {
            gameState.playerHand = [];
            gameState.computerHand = [new Card('5', '♠', 'Artist')];
            gameState.jokerWasPlayed = true;

            const result = engine.checkWinCondition();
            expect(result.winner).toBe('player');
        });

        it('should handle win streak boundary at 0', () => {
            gameState.playerHand = [];
            gameState.computerHand = [new Card('5', '♠', 'Artist')];
            gameState.winStreak = 0;

            const result = engine.checkWinCondition();
            expect(result.winStreak).toBe(1);
        });

        it('should handle very high win streak', () => {
            gameState.playerHand = [];
            gameState.computerHand = [new Card('5', '♠', 'Artist')];
            gameState.winStreak = 9999;

            const result = engine.checkWinCondition();
            expect(result.winStreak).toBe(10000);
        });

        it('should reset high win streak to 0 on computer win', () => {
            gameState.playerHand = [new Card('5', '♠', 'Artist')];
            gameState.computerHand = [];
            gameState.winStreak = 100;

            const result = engine.checkWinCondition();
            expect(result.winner).toBe('computer');
            expect(gameState.winStreak).toBe(0);
        });

        it('should track gamesPlayed on player win', () => {
            gameState.playerHand = [];
            gameState.computerHand = [new Card('5', '♠', 'Artist')];
            gameState.gamesPlayed = 5;

            const result = engine.checkWinCondition();
            expect(result.gamesPlayed).toBe(6);
        });

        it('should track gamesPlayed on computer win', () => {
            gameState.playerHand = [new Card('5', '♠', 'Artist')];
            gameState.computerHand = [];
            gameState.gamesPlayed = 5;

            const result = engine.checkWinCondition();
            expect(result.gamesPlayed).toBe(6);
        });
    });

    describe('chooseBestSuitForComputer - edge cases', () => {
        it('should handle tie between suits by returning first encountered', () => {
            gameState.computerHand = [
                new Card('5', '♠', 'Artist'),
                new Card('7', '♥', 'Artist')
            ];
            gameState.chosenAceSuits = [];

            const suit = engine.chooseBestSuitForComputer();
            // With equal counts, should return one of them consistently
            expect(['♠', '♥']).toContain(suit);
        });

        it('should handle all 4 suits already chosen', () => {
            gameState.computerHand = [
                new Card('5', '♠', 'Artist'),
                new Card('7', '♠', 'Artist')
            ];
            gameState.chosenAceSuits = ['♠', '♥', '♦', '♣'];

            const suit = engine.chooseBestSuitForComputer();
            // Should still return a suit (default fallback is ♠)
            expect(suit).toBe('♠');
        });

        it('should handle empty computer hand', () => {
            gameState.computerHand = [];
            gameState.chosenAceSuits = [];

            const suit = engine.chooseBestSuitForComputer();
            // Should return default suit
            expect(suit).toBeDefined();
        });

        it('should handle hand with only Jokers', () => {
            gameState.computerHand = [
                new Card('JOKER', 'joker', 'Mike Friedrich'),
                new Card('JOKER', 'joker', 'Joshua Davis')
            ];
            gameState.chosenAceSuits = [];

            const suit = engine.chooseBestSuitForComputer();
            // Should return default suit since Jokers don't have valid suits
            expect(suit).toBeDefined();
        });

        it('should exclude only chosen suit and choose from rest', () => {
            gameState.computerHand = [
                new Card('5', '♠', 'Artist'),
                new Card('7', '♠', 'Artist'),
                new Card('K', '♠', 'Artist'), // 3 spades
                new Card('3', '♦', 'Artist') // 1 diamond
            ];
            gameState.chosenAceSuits = ['♠'];

            const suit = engine.chooseBestSuitForComputer();
            expect(suit).toBe('♦'); // Only non-chosen suit
        });

        it('should handle 3 suits chosen, choose the remaining one', () => {
            gameState.computerHand = [
                new Card('5', '♣', 'Artist')
            ];
            gameState.chosenAceSuits = ['♠', '♥', '♦'];

            const suit = engine.chooseBestSuitForComputer();
            expect(suit).toBe('♣');
        });
    });

    describe('findComputerPlayableCard - edge cases', () => {
        beforeEach(() => {
            gameState.currentSuit = '♠';
            gameState.currentRank = '5';
        });

        it('should return -1 for empty hand', () => {
            gameState.computerHand = [];

            const index = engine.findComputerPlayableCard();
            expect(index).toBe(-1);
        });

        it('should find only playable card at end of hand', () => {
            gameState.computerHand = [
                new Card('3', '♥', 'Artist'),
                new Card('7', '♦', 'Artist'),
                new Card('K', '♠', 'Artist') // Playable at index 2
            ];

            const index = engine.findComputerPlayableCard();
            expect(index).toBe(2);
        });

        it('should prefer 2 (draw two) over special cards', () => {
            gameState.computerHand = [
                new Card('2', '♠', 'Artist'), // Draw two - playable regular card
                new Card('A', '♥', 'Artist') // Ace
            ];

            const index = engine.findComputerPlayableCard();
            expect(index).toBe(0); // Prefers regular card (2)
        });
    });

    describe('validatePlayerMove - edge cases', () => {
        beforeEach(() => {
            gameState.currentSuit = '♠';
            gameState.currentRank = '5';
            gameState.playerHand = [
                new Card('K', '♠', 'Artist'),
                new Card('3', '♥', 'Artist')
            ];
        });

        it('should reject negative card index', () => {
            const result = engine.validatePlayerMove(-1);

            expect(result.valid).toBe(false);
            expect(result.reason).toBe('Invalid card');
        });

        it('should reject card index equal to hand size', () => {
            const result = engine.validatePlayerMove(2); // Hand has 2 cards, index 2 is out of bounds

            expect(result.valid).toBe(false);
            expect(result.reason).toBe('Invalid card');
        });

        it('should reject when isDrawing flag is set', () => {
            gameState.isDrawing = true;

            const result = engine.validatePlayerMove(0);

            expect(result.valid).toBe(false);
            expect(result.reason).toBe('Wait for draw to complete');
        });

        it('should allow play when jokerWasPlayed is true', () => {
            gameState.jokerWasPlayed = true;
            // Card at index 1 normally wouldn't be playable (3♥ doesn't match ♠ or 5)
            const result = engine.validatePlayerMove(1);

            expect(result.valid).toBe(true);
        });

        it('should validate Ace regardless of current suit/rank', () => {
            gameState.playerHand = [new Card('A', '♣', 'Artist')];
            gameState.currentSuit = '♦';
            gameState.currentRank = 'K';

            const result = engine.validatePlayerMove(0);

            expect(result.valid).toBe(true);
        });

        it('should validate Joker regardless of current suit/rank', () => {
            gameState.playerHand = [new Card('JOKER', 'joker', 'Mike Friedrich')];
            gameState.currentSuit = '♦';
            gameState.currentRank = 'K';

            const result = engine.validatePlayerMove(0);

            expect(result.valid).toBe(true);
        });
    });

    describe('executeDrawTwo - edge cases', () => {
        beforeEach(() => {
            gameState.deck = new Deck();
            gameState.playerHand = [];
            gameState.computerHand = [];
        });

        it('should draw 0 cards when deck is empty', () => {
            gameState.deck.cards = [];

            const drawnCards = engine.executeDrawTwo(true);

            expect(drawnCards).toHaveLength(0);
        });

        it('should draw 1 card when deck has exactly 1 card', () => {
            gameState.deck.cards = [new Card('5', '♠', 'Artist')];

            const drawnCards = engine.executeDrawTwo(true);

            expect(drawnCards).toHaveLength(1);
        });

        it('should add cards to correct hand (computer)', () => {
            const drawnCards = engine.executeDrawTwo(true);

            expect(gameState.computerHand).toHaveLength(2);
            expect(gameState.playerHand).toHaveLength(0);
        });

        it('should add cards to correct hand (player)', () => {
            const drawnCards = engine.executeDrawTwo(false);

            expect(gameState.playerHand).toHaveLength(2);
            expect(gameState.computerHand).toHaveLength(0);
        });
    });

    describe('hasPlayableCards - edge cases', () => {
        beforeEach(() => {
            gameState.currentSuit = '♠';
            gameState.currentRank = '5';
        });

        it('should return false for empty hand', () => {
            gameState.playerHand = [];

            expect(engine.hasPlayableCards(false)).toBe(false);
        });

        it('should return true if hand has only an Ace', () => {
            gameState.playerHand = [new Card('A', '♣', 'Artist')];

            expect(engine.hasPlayableCards(false)).toBe(true);
        });

        it('should return true if hand has only a Joker', () => {
            gameState.playerHand = [new Card('JOKER', 'joker', 'Mike Friedrich')];

            expect(engine.hasPlayableCards(false)).toBe(true);
        });

        it('should check correct hand based on isComputer parameter', () => {
            gameState.playerHand = [];
            gameState.computerHand = [new Card('K', '♠', 'Artist')];

            expect(engine.hasPlayableCards(false)).toBe(false); // Empty player hand
            expect(engine.hasPlayableCards(true)).toBe(true); // Computer has playable
        });
    });

    describe('processCardEffect - edge cases', () => {
        it('should reset jokerWasPlayed when playing regular card', () => {
            gameState.jokerWasPlayed = true;
            const card = new Card('5', '♠', 'Artist');

            engine.processCardEffect(card);

            expect(gameState.jokerWasPlayed).toBe(false);
        });

        it('should not need suit selection for computer-played Ace', () => {
            const ace = new Card('A', '♥', 'Artist');

            const effect = engine.processCardEffect(ace, true);

            expect(effect.needsSuitSelection).toBe(false);
        });

        it('should update current card for 2 (draw two)', () => {
            const two = new Card('2', '♥', 'Artist');

            engine.processCardEffect(two);

            expect(gameState.currentSuit).toBe('♥');
            expect(gameState.currentRank).toBe('2');
        });

        it('should set needsSuitSelection for player Joker', () => {
            const joker = new Card('JOKER', 'joker', 'Mike Friedrich');

            const effect = engine.processCardEffect(joker, false);

            expect(effect.needsSuitSelection).toBe(true);
        });

        it('should set needsSuitSelection for player Ace', () => {
            const ace = new Card('A', '♥', 'Artist');

            const effect = engine.processCardEffect(ace, false);

            expect(effect.needsSuitSelection).toBe(true);
        });
    });
});
