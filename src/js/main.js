/**
 * Crazy Aces - Main Application Entry Point
 * Refactored to use modular architecture
 */

import { Game } from './services/Game.js';
import { EventController } from './services/EventController.js';
import { EMAIL_CONFIG } from './config/email.config.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    GAME: {
        INITIAL_HAND_SIZE: 7,
        NUM_JOKERS: 2
    },
    ANIMATION: {
        CARD_DROP_DURATION: 400,
        CARD_FLY_DURATION: 250,
        CARD_SHRINK_DURATION: 250,
        HINT_SHAKE_DURATION: 600,
        HAND_RESIZE_DURATION: 500
    },
    TIMING: {
        COMPUTER_TURN_DELAY: 800,
        HINT_INITIAL_DELAY: 5000,
        HINT_REPEAT_DELAY: 5000,
        STATUS_MESSAGE_SHORT: 1500,
        STATUS_MESSAGE_LONG: 2000,
        DRAW_MESSAGE_DELAY: 1200,
        ANIMATION_DELAY: 400,
        GAME_END_DELAY: 500
    },
    URLS: {
        BASE_IMAGE: 'https://s3.amazonaws.com/img.playingarts.com/one-small-hd/',
        CARD_INFO_BASE: 'https://playingarts.com/one/',
        BACKSIDE_IMAGE:
            'https://s3.amazonaws.com/img.playingarts.com/one-small-hd/_backside-evgeny-kiselev.jpg?2'
    }
};

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
        // Initialize EmailJS
        if (typeof emailjs !== 'undefined') {
            emailjs.init(EMAIL_CONFIG.PUBLIC_KEY);
        }

        // Create game instance
        game = new Game(CONFIG);

        // Create event controller and setup listeners
        eventController = new EventController(game);
        eventController.setupEventListeners();

        // Initialize game
        await game.init();

        // Show game container by adding .loaded class
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            gameContainer.classList.add('loaded');
        }

        // Hide loading screen
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 300);
        }
    } catch (error) {
        console.error('Error initializing application:', error);
        alert('Error loading game. Please refresh the page.');
    }
}

// Start the game when DOM is loaded
initialize();

// Note: No global function exports needed
// EventController handles all events via delegation
