/**
 * Crazy Aces - Main Application Entry Point
 * Refactored to use modular architecture with dependency injection
 */

import { GameFactory } from './services/GameFactory.js';
import { EventController } from './services/EventController.js';
import { config, validateConfig, getConfigSummary } from './config/index.js';
import { logger } from './utils/Logger.js';
import { errorService, ErrorContext, ErrorSeverity } from './services/ErrorService.js';
import { VersionDisplay } from './utils/VersionDisplay.js';

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================

// Validate configuration on startup
const validation = validateConfig();
if (!validation.valid) {
    logger.error('Configuration validation failed:', validation.errors);
    throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
}

if (validation.warnings.length > 0) {
    logger.warn('Configuration warnings:', validation.warnings);
}

logger.info('Configuration loaded successfully', getConfigSummary());

// ============================================================================
// GLOBAL STATE
// ============================================================================

let game = null;
let eventController = null;

// ============================================================================
// IMMEDIATE INITIALIZATION (before DOM ready)
// ============================================================================

// Rules box will show on every page refresh (no localStorage persistence)
// Clear any old localStorage flag from previous version
localStorage.removeItem('rulesBoxDismissed');

// Note: All UI helper functions moved to EventController.js
// Event delegation is now used instead of global functions

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the application
 */
async function initialize() {
    try {
        logger.info('Starting application initialization...');

        // Initialize version display
        new VersionDisplay();

        // Email functionality now handled server-side via Vercel API
        // No client-side EmailJS initialization needed
        logger.info('Email features enabled via secure backend API');

        // Create game instance using factory
        game = GameFactory.create(config);
        logger.info('Game instance created');

        // Create event controller and setup listeners
        eventController = new EventController(game);
        eventController.setupEventListeners();
        logger.info('Event listeners configured');

        // Initialize game
        await game.init();
        logger.info('Game initialized successfully');

        // Show game container by adding .loaded class
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            gameContainer.classList.add('loaded');
            logger.debug('Game container shown');
        }

        // Hide loading screen
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                logger.debug('Loading screen hidden');
            }, 300);
        }

        // Setup debug buttons
        setupDebugButtons();

        logger.info('Application initialization complete');
    } catch (error) {
        // Use ErrorService for centralized error handling
        await errorService.handle(error, ErrorContext.INITIALIZATION, {
            severity: ErrorSeverity.CRITICAL,
            metadata: { phase: 'initialization' }
        });

        // Show user-friendly error message
        alert('Error loading game. Please refresh the page.');
    }
}

/**
 * Setup debug buttons for testing
 */
function setupDebugButtons() {
    const debugWinBtn = document.getElementById('debugWin');
    const debugLoseBtn = document.getElementById('debugLose');

    console.log('Setting up debug buttons...', { debugWinBtn, debugLoseBtn, game });

    if (debugWinBtn) {
        debugWinBtn.addEventListener('click', () => {
            console.log('WIN button clicked!', { game, gameOver: game?.state?.gameOver });

            if (!game) {
                console.error('Game instance not available!');
                return;
            }

            if (game.state.gameOver) {
                console.log('Game is already over, ignoring click');
                return;
            }

            console.log('Triggering instant win...');

            // Empty PLAYER's hand to trigger instant WIN (player hand empty = player wins)
            game.state.playerHand = [];

            // Update UI
            game.ui.renderPlayerHand(game.state.playerHand, game.handlePlayerCardClick.bind(game));
            game.ui.renderComputerHand(game.state.computerHand.length);

            // Trigger game end
            const winResult = game.engine.checkWinCondition();
            console.log('Win result:', winResult);

            if (winResult) {
                game.handleGameEnd(winResult);
            }
        });
        console.log('WIN button listener attached');
    } else {
        console.error('WIN button not found!');
    }

    if (debugLoseBtn) {
        debugLoseBtn.addEventListener('click', () => {
            console.log('LOSE button clicked!', { game, gameOver: game?.state?.gameOver });

            if (!game) {
                console.error('Game instance not available!');
                return;
            }

            if (game.state.gameOver) {
                console.log('Game is already over, ignoring click');
                return;
            }

            console.log('Triggering instant loss...');

            // Empty COMPUTER's hand to trigger instant LOSS (computer hand empty = computer wins = player loses)
            game.state.computerHand = [];

            // Update UI
            game.ui.renderPlayerHand(game.state.playerHand, game.handlePlayerCardClick.bind(game));
            game.ui.renderComputerHand(game.state.computerHand.length);

            // Trigger game end
            const winResult = game.engine.checkWinCondition();
            console.log('Lose result:', winResult);

            if (winResult) {
                game.handleGameEnd(winResult);
            }
        });
        console.log('LOSE button listener attached');
    } else {
        console.error('LOSE button not found!');
    }
}

// Start the game when DOM is loaded
initialize();

// Note: No global function exports needed
// EventController handles all events via delegation
