import { describe, it, expect } from 'vitest';
import { Card } from './Card.js';

describe('Card', () => {
    describe('Regular cards', () => {
        it('should create a regular card with rank and suit', () => {
            const card = new Card('5', '♠', 'Artist Name');

            expect(card.rank).toBe('5');
            expect(card.suit).toBe('♠');
            expect(card.artist).toBe('Artist Name');
            expect(card.isJoker).toBe(false);
            expect(card.isAce).toBe(false);
        });

        it('should have correct imageUrl', () => {
            const card = new Card('K', '♥', 'Sara Blake');

            expect(card.imageUrl).toContain('king-of-hearts-sara-blake.jpg');
        });

        it('should convert to string', () => {
            const card = new Card('10', '♦', 'Lei Melendres');

            expect(card.toString()).toBe('10♦');
        });
    });

    describe('Aces', () => {
        it('should identify Aces', () => {
            const ace = new Card('A', '♣', 'Andreas Preis');

            expect(ace.isAce).toBe(true);
            expect(ace.isJoker).toBe(false);
        });

        it('should have correct imageUrl for Aces', () => {
            const ace = new Card('A', '♠', 'Iain Macarthur');

            expect(ace.imageUrl).toContain('ace-of-spades-iain-macarthur.jpg');
        });
    });

    describe('Jokers', () => {
        it('should create Joker cards', () => {
            const joker = new Card('JOKER', 'joker', 'Mike Friedrich');

            expect(joker.rank).toBe('JOKER');
            expect(joker.suit).toBe('joker');
            expect(joker.artist).toBe('Mike Friedrich');
            expect(joker.isJoker).toBe(true);
            expect(joker.isAce).toBe(false);
        });

        it('should have correct imageUrl for Jokers', () => {
            const joker1 = new Card('JOKER', 'joker', 'Mike Friedrich');
            const joker2 = new Card('JOKER', 'joker', 'Joshua Davis');

            expect(joker1.imageUrl).toContain('joker-mike-friedrich.jpg');
            expect(joker2.imageUrl).toContain('joker-joshua-davis.jpg');
        });

        it('should convert Joker to string', () => {
            const joker = new Card('JOKER', 'joker', 'Mike Friedrich');

            expect(joker.toString()).toContain('JOKER');
        });
    });
});
