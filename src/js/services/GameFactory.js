/**
 * GameFactory - Factory for creating Game instances
 * Centralizes dependency creation and injection
 * Provides different factory methods for production and testing
 */

import { Game } from './Game.js';
import { GameState } from './GameState.js';
import { GameEngine } from './GameEngine.js';
import { GameUI } from '../ui/GameUI.js';
import { UIStateManager } from '../ui/UIStateManager.js';
import { logger } from '../utils/Logger.js';
import { errorService } from './ErrorService.js';

export class GameFactory {
    /**
     * Create a game instance with full dependencies
     * @param {Object} config - Game configuration
     * @returns {Game} Fully configured game instance
     */
    static create(config) {
        const state = new GameState();
        const engine = new GameEngine(state);
        const ui = new GameUI(config);
        const uiState = new UIStateManager();

        return new Game(config, {
            state,
            engine,
            ui,
            uiState,
            logger,
            errorService
        });
    }

    /**
     * Create a game instance with custom dependencies (for testing)
     * @param {Object} config - Game configuration
     * @param {Object} mockDependencies - Mock dependencies
     * @returns {Game} Game instance with mocked dependencies
     */
    static createForTest(config = {}, mockDependencies = {}) {
        const defaultConfig = {
            GAME: { INITIAL_HAND_SIZE: 7, NUM_JOKERS: 2 },
            ANIMATION: {},
            TIMING: {},
            URLS: {}
        };

        const mergedConfig = { ...defaultConfig, ...config };

        // Create default dependencies
        const state = mockDependencies.state || new GameState();
        const engine = mockDependencies.engine || new GameEngine(state);

        // For tests, we can provide minimal or mock UI
        const ui = mockDependencies.ui || {
            clearAllTimeouts: () => {},
            updateStatus: () => {},
            preloadImage: () => Promise.resolve(),
            preloadHandImages: () => Promise.resolve(),
            render: () => {},
            hideGameOver: () => {}
        };

        const uiState = mockDependencies.uiState || {
            resetAllDisplays: () => {},
            hidePlayerHandOnEmpty: () => {},
            hideOpponentHand: () => {}
        };

        const testLogger = mockDependencies.logger || {
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {},
            setContext: () => {}
        };

        const testErrorService = mockDependencies.errorService || {
            handle: () => Promise.resolve(false)
        };

        return new Game(mergedConfig, {
            state,
            engine,
            ui,
            uiState,
            logger: testLogger,
            errorService: testErrorService
        });
    }

    /**
     * Create a game instance with partial dependencies
     * Useful for integration testing where you want real dependencies
     * but with some mocked parts
     * @param {Object} config - Game configuration
     * @param {Object} dependencies - Partial dependencies
     * @returns {Game} Game instance
     */
    static createWithPartialDependencies(config, dependencies = {}) {
        const state = dependencies.state || new GameState();
        const engine = dependencies.engine || new GameEngine(state);
        const ui = dependencies.ui || new GameUI(config);
        const uiState = dependencies.uiState || new UIStateManager();
        const gameLogger = dependencies.logger || logger;
        const gameErrorService = dependencies.errorService || errorService;

        return new Game(config, {
            state,
            engine,
            ui,
            uiState,
            logger: gameLogger,
            errorService: gameErrorService
        });
    }
}
