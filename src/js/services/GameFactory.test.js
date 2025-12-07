import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameFactory } from './GameFactory.js';
import { Game } from './Game.js';
import { GameState } from './GameState.js';
import { GameEngine } from './GameEngine.js';

describe('GameFactory', () => {
    const mockConfig = {
        GAME: { INITIAL_HAND_SIZE: 7, NUM_JOKERS: 2 },
        ANIMATION: {},
        TIMING: {},
        URLS: {}
    };

    describe('create', () => {
        it('should create a game instance with full dependencies', () => {
            const game = GameFactory.create(mockConfig);

            expect(game).toBeInstanceOf(Game);
            expect(game.config).toBe(mockConfig);
        });

        it('should create game with GameState dependency', () => {
            const game = GameFactory.create(mockConfig);

            expect(game.state).toBeInstanceOf(GameState);
        });

        it('should create game with GameEngine dependency', () => {
            const game = GameFactory.create(mockConfig);

            expect(game.engine).toBeInstanceOf(GameEngine);
        });

        it('should inject logger and errorService', () => {
            const game = GameFactory.create(mockConfig);

            expect(game.logger).toBeDefined();
            expect(game.errorService).toBeDefined();
        });
    });

    describe('createForTest', () => {
        it('should create a game instance with default config', () => {
            const game = GameFactory.createForTest();

            expect(game).toBeInstanceOf(Game);
            expect(game.config.GAME).toBeDefined();
            expect(game.config.GAME.INITIAL_HAND_SIZE).toBe(7);
        });

        it('should merge custom config with defaults', () => {
            const customConfig = {
                GAME: { INITIAL_HAND_SIZE: 5, NUM_JOKERS: 1 }
            };

            const game = GameFactory.createForTest(customConfig);

            expect(game.config.GAME.INITIAL_HAND_SIZE).toBe(5);
            expect(game.config.GAME.NUM_JOKERS).toBe(1);
        });

        it('should use mock dependencies when provided', () => {
            const mockState = { test: true };
            const mockEngine = { test: true };
            const mockDependencies = {
                state: mockState,
                engine: mockEngine
            };

            const game = GameFactory.createForTest({}, mockDependencies);

            expect(game.state).toBe(mockState);
            expect(game.engine).toBe(mockEngine);
        });

        it('should provide minimal mock UI by default', () => {
            const game = GameFactory.createForTest();

            expect(game.ui).toBeDefined();
            expect(typeof game.ui.clearAllTimeouts).toBe('function');
            expect(typeof game.ui.updateStatus).toBe('function');
        });

        it('should provide mock logger that does not throw', () => {
            const game = GameFactory.createForTest();

            // Should not throw
            expect(() => {
                game.logger.debug('test');
                game.logger.info('test');
                game.logger.warn('test');
                game.logger.error('test');
            }).not.toThrow();
        });

        it('should provide mock errorService', () => {
            const game = GameFactory.createForTest();

            expect(game.errorService).toBeDefined();
            expect(typeof game.errorService.handle).toBe('function');
        });
    });

    describe('createWithPartialDependencies', () => {
        it('should create game with partial mocked dependencies', () => {
            const mockState = new GameState();
            mockState.winStreak = 5;

            const game = GameFactory.createWithPartialDependencies(mockConfig, {
                state: mockState
            });

            expect(game.state).toBe(mockState);
            expect(game.state.winStreak).toBe(5);
        });

        it('should use real dependencies when not provided', () => {
            const game = GameFactory.createWithPartialDependencies(mockConfig, {});

            expect(game.state).toBeInstanceOf(GameState);
            expect(game.engine).toBeInstanceOf(GameEngine);
        });

        it('should allow mixing mock and real dependencies', () => {
            const mockLogger = {
                debug: vi.fn(),
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
                setContext: vi.fn()
            };

            const game = GameFactory.createWithPartialDependencies(mockConfig, {
                logger: mockLogger
            });

            expect(game.logger).toBe(mockLogger);
            expect(game.state).toBeInstanceOf(GameState);
        });
    });
});
