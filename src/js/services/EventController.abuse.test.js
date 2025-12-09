/**
 * EventController Abuse Tests
 * Tests for user interaction abuse, localStorage manipulation, and weird behavior
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventController } from './EventController.js';

describe('EventController - Abuse Cases', () => {
    let controller;
    let mockGame;
    let localStorageMock;

    beforeEach(() => {
        // Setup mock game
        mockGame = {
            state: {
                winStreak: 3,
                pendingEightCard: null,
                claimDiscount: vi.fn(),
                resetWinStreak: vi.fn()
            },
            sessionService: {
                getSessionToken: vi.fn(() => 'valid-token-123')
            },
            handleDrawCard: vi.fn().mockResolvedValue(undefined),
            handleSuitSelection: vi.fn(),
            reset: vi.fn().mockResolvedValue(undefined)
        };

        controller = new EventController(mockGame);

        // Mock localStorage
        localStorageMock = {
            store: {},
            getItem: vi.fn((key) => localStorageMock.store[key] || null),
            setItem: vi.fn((key, value) => { localStorageMock.store[key] = value; }),
            removeItem: vi.fn((key) => { delete localStorageMock.store[key]; }),
            clear: vi.fn(() => { localStorageMock.store = {}; })
        };
        vi.stubGlobal('localStorage', localStorageMock);

        // Mock DOM elements
        document.body.innerHTML = `
            <input id="emailInput" />
            <div id="emailError" class=""></div>
            <button id="sendDiscountBtn">Send</button>
            <div id="emailFormInline"></div>
            <div id="discountButtonsContainer"></div>
            <div id="suitSelectorOverlay"></div>
            <div id="suitSelector"></div>
            <div class="rules-box"></div>
        `;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    describe('Email validation abuse', () => {
        it('should reject XSS attempt in email field', async () => {
            // XSS payloads that fail regex validation
            const emailInput = document.getElementById('emailInput');
            emailInput.value = '<script>@email.com'; // Invalid chars before @

            await controller.handleSendDiscount();

            const emailError = document.getElementById('emailError');
            // Email with invalid characters should fail format validation
            expect(emailError.textContent.length).toBeGreaterThan(0);
        });

        it('should reject another XSS variant', async () => {
            const emailInput = document.getElementById('emailInput');
            emailInput.value = '"><img@test.com'; // Invalid chars

            await controller.handleSendDiscount();

            const emailError = document.getElementById('emailError');
            expect(emailError.textContent.length).toBeGreaterThan(0);
        });

        it('should reject SQL injection attempts', async () => {
            const emailInput = document.getElementById('emailInput');
            emailInput.value = "test'--@email.com"; // Single quote invalid

            await controller.handleSendDiscount();

            const emailError = document.getElementById('emailError');
            expect(emailError.textContent.length).toBeGreaterThan(0);
        });

        it('should handle empty email', async () => {
            const emailInput = document.getElementById('emailInput');
            emailInput.value = '';

            await controller.handleSendDiscount();

            const emailError = document.getElementById('emailError');
            expect(emailError.textContent).toContain('enter your email');
        });

        it('should handle whitespace-only email', async () => {
            const emailInput = document.getElementById('emailInput');
            emailInput.value = '   ';

            await controller.handleSendDiscount();

            const emailError = document.getElementById('emailError');
            expect(emailError.textContent).toContain('enter your email');
        });

        it('should handle extremely long email addresses', async () => {
            const emailInput = document.getElementById('emailInput');
            emailInput.value = 'a'.repeat(500) + '@' + 'b'.repeat(500) + '.com';

            await controller.handleSendDiscount();

            // Should fail validation gracefully
            const emailError = document.getElementById('emailError');
            expect(emailError.textContent.length).toBeGreaterThan(0);
        });

        it('should reject email without @ symbol', async () => {
            const emailInput = document.getElementById('emailInput');
            emailInput.value = 'notanemail.com';

            await controller.handleSendDiscount();

            const emailError = document.getElementById('emailError');
            expect(emailError.textContent).toContain('valid email');
        });

        it('should reject email without domain', async () => {
            const emailInput = document.getElementById('emailInput');
            emailInput.value = 'test@';

            await controller.handleSendDiscount();

            const emailError = document.getElementById('emailError');
            expect(emailError.textContent).toContain('valid email');
        });
    });

    describe('localStorage manipulation', () => {
        it('should handle corrupted claimedEmails JSON', () => {
            localStorageMock.store['claimedEmails'] = 'not-valid-json{{{';

            const result = controller.hasEmailClaimed('test@test.com');

            // Should handle gracefully and return false
            expect(result).toBe(false);
        });

        it('should handle claimedEmails as string instead of array', () => {
            localStorageMock.store['claimedEmails'] = '"just-a-string"';

            const result = controller.hasEmailClaimed('test@test.com');

            // Should not throw
            expect(typeof result).toBe('boolean');
        });

        it('should handle claimedEmails as number', () => {
            localStorageMock.store['claimedEmails'] = '123';

            const result = controller.hasEmailClaimed('test@test.com');

            // Should not throw
            expect(typeof result).toBe('boolean');
        });

        it('should handle claimedEmails as null JSON', () => {
            localStorageMock.store['claimedEmails'] = 'null';

            const result = controller.hasEmailClaimed('test@test.com');

            expect(result).toBe(false);
        });

        it('should handle claimedEmails as object instead of array', () => {
            localStorageMock.store['claimedEmails'] = '{"email": "test@test.com"}';

            expect(() => controller.hasEmailClaimed('test@test.com')).not.toThrow();
        });

        it('should detect claimed emails case-insensitively', () => {
            // Note: The code lowercases the email in hasEmailClaimed
            localStorageMock.store['claimedEmails'] = JSON.stringify(['test@email.com']);

            expect(controller.hasEmailClaimed('test@email.com')).toBe(true);
            expect(controller.hasEmailClaimed('TEST@EMAIL.COM')).toBe(true);
            expect(controller.hasEmailClaimed('Test@Email.Com')).toBe(true);
        });

        it('should handle localStorage.getItem returning undefined', () => {
            localStorageMock.getItem = vi.fn(() => undefined);

            const result = controller.hasEmailClaimed('test@test.com');

            expect(result).toBe(false);
        });

        it('should handle localStorage.setItem throwing error', () => {
            localStorageMock.setItem = vi.fn(() => {
                throw new Error('QuotaExceededError');
            });

            // Should not throw when marking email as claimed
            expect(() => controller.markEmailAsClaimed('test@test.com')).not.toThrow();
        });
    });

    describe('Button spam protection', () => {
        it('should handle rapid draw card button clicks', async () => {
            // Simulate 20 rapid clicks
            const clickPromises = Array(20).fill(null).map(() =>
                controller.handleDrawCard()
            );

            await Promise.allSettled(clickPromises);

            // handleDrawCard should have been called on mock
            expect(mockGame.handleDrawCard).toHaveBeenCalled();
        });

        it('should handle rapid play again button clicks', async () => {
            const clickPromises = Array(20).fill(null).map(() =>
                controller.handlePlayAgain()
            );

            await Promise.allSettled(clickPromises);

            // reset should have been called
            expect(mockGame.reset).toHaveBeenCalled();
        });

        it('should handle rapid show/hide email form', () => {
            for (let i = 0; i < 50; i++) {
                controller.handleShowEmailForm();
                controller.handleHideEmailForm();
            }

            // Should not throw
            expect(true).toBe(true);
        });
    });

    describe('Missing game state handling', () => {
        it('should handle null game reference for handleDrawCard', async () => {
            const controllerNoGame = new EventController(null);

            // Should not throw
            await expect(controllerNoGame.handleDrawCard()).resolves.not.toThrow();
        });

        it('should handle null game reference for handlePlayAgain', async () => {
            const controllerNoGame = new EventController(null);

            // Should not throw
            await expect(controllerNoGame.handlePlayAgain()).resolves.not.toThrow();
        });

        it('should handle null game reference for getDiscount', () => {
            const controllerNoGame = new EventController(null);

            const discount = controllerNoGame.getDiscount();

            expect(discount).toBe(0);
        });

        it('should handle game with missing sessionService', async () => {
            mockGame.sessionService = null;

            // Mock fetch to prevent actual network call
            vi.stubGlobal('fetch', vi.fn());

            const emailInput = document.getElementById('emailInput');
            emailInput.value = 'test@example.com';

            await controller.handleSendDiscount();

            // Should show an error (either about session or generic failure)
            const emailError = document.getElementById('emailError');
            expect(emailError.textContent.length).toBeGreaterThan(0);
        });

        it('should handle pendingEightCard being null for suit selection', () => {
            mockGame.state.pendingEightCard = null;

            // Should not throw or call handleSuitSelection
            controller.handleChooseSuit('♠');

            expect(mockGame.handleSuitSelection).not.toHaveBeenCalled();
        });
    });

    describe('DOM element missing handling', () => {
        it('should handle missing emailInput element', async () => {
            document.body.innerHTML = ''; // Remove all DOM elements

            // Should not throw
            await expect(controller.handleSendDiscount()).resolves.not.toThrow();
        });

        it('should handle missing emailError element', async () => {
            document.getElementById('emailError').remove();

            const emailInput = document.getElementById('emailInput');
            emailInput.value = 'test@test.com';

            // Should not throw
            await expect(controller.handleSendDiscount()).resolves.not.toThrow();
        });

        it('should handle missing rules box', () => {
            document.querySelector('.rules-box').remove();

            // Should not throw
            expect(() => controller.handleHideRules()).not.toThrow();
        });

        it('should handle missing suit selector elements', () => {
            document.getElementById('suitSelectorOverlay').remove();
            document.getElementById('suitSelector').remove();

            mockGame.state.pendingEightCard = { isAce: true };

            // Should not throw
            expect(() => controller.handleChooseSuit('♠')).not.toThrow();
        });
    });

    describe('Discount calculation edge cases', () => {
        it('should return 0 discount for win streak 0', () => {
            mockGame.state.winStreak = 0;

            const discount = controller.getDiscount();

            expect(discount).toBe(0);
        });

        it('should return 5% for win streak 1', () => {
            mockGame.state.winStreak = 1;

            const discount = controller.getDiscount();

            expect(discount).toBe(5);
        });

        it('should return 10% for win streak 2', () => {
            mockGame.state.winStreak = 2;

            const discount = controller.getDiscount();

            expect(discount).toBe(10);
        });

        it('should return 15% for win streak 3 or higher', () => {
            mockGame.state.winStreak = 3;
            expect(controller.getDiscount()).toBe(15);

            mockGame.state.winStreak = 10;
            expect(controller.getDiscount()).toBe(15);

            mockGame.state.winStreak = 100;
            expect(controller.getDiscount()).toBe(15);
        });

        it('should handle negative win streak', () => {
            mockGame.state.winStreak = -5;

            const discount = controller.getDiscount();

            expect(discount).toBe(0);
        });

        it('should handle NaN win streak', () => {
            mockGame.state.winStreak = NaN;

            // Should not throw
            expect(() => controller.getDiscount()).not.toThrow();
        });
    });

    describe('Event handling edge cases', () => {
        it('should handle click on element without data-action', () => {
            const event = {
                target: document.createElement('div'),
                preventDefault: vi.fn()
            };

            // Should not throw
            expect(() => controller.handleClick(event)).not.toThrow();
        });

        it('should handle click with unknown action', () => {
            const button = document.createElement('button');
            button.dataset.action = 'unknown-action';
            const event = {
                target: button,
                preventDefault: vi.fn()
            };

            // Should not throw
            expect(() => controller.handleClick(event)).not.toThrow();
        });

        it('should handle form submit without email-form action', () => {
            const form = document.createElement('form');
            const event = {
                target: form,
                preventDefault: vi.fn()
            };

            // Should not throw
            expect(() => controller.handleSubmit(event)).not.toThrow();
            expect(event.preventDefault).not.toHaveBeenCalled();
        });
    });

    describe('Network error handling', () => {
        it('should handle fetch throwing error', async () => {
            vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

            const emailInput = document.getElementById('emailInput');
            emailInput.value = 'test@example.com';

            await controller.handleSendDiscount();

            const emailError = document.getElementById('emailError');
            expect(emailError.textContent).toContain('Failed');
        });

        it('should handle fetch returning non-ok response', async () => {
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
                ok: false,
                json: () => Promise.resolve({ error: 'Server error' })
            }));

            const emailInput = document.getElementById('emailInput');
            emailInput.value = 'test@example.com';

            await controller.handleSendDiscount();

            const emailError = document.getElementById('emailError');
            expect(emailError.classList.contains('show')).toBe(true);
        });

        it('should handle fetch returning malformed JSON', async () => {
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.reject(new Error('Invalid JSON'))
            }));

            const emailInput = document.getElementById('emailInput');
            emailInput.value = 'test@example.com';

            await controller.handleSendDiscount();

            const emailError = document.getElementById('emailError');
            expect(emailError.textContent).toContain('Failed');
        });
    });
});
