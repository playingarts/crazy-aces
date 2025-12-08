/**
 * Central Configuration Module
 * Single source of truth for all application configuration
 *
 * Usage:
 *   import { config } from './config/index.js';
 *   const handSize = config.GAME.INITIAL_HAND_SIZE;
 */

import { GAME_CONFIG, SUITS, RANKS, SUIT_NAMES, RANK_NAMES } from './constants.js';
import { EMAIL_CONFIG } from './email.config.js';

/**
 * Game-specific configuration
 */
export const GAME = {
    INITIAL_HAND_SIZE: 7,
    NUM_JOKERS: 2
};

/**
 * Animation durations (milliseconds)
 */
export const ANIMATION = {
    CARD_DROP_DURATION: 400,
    CARD_FLY_DURATION: 250,
    CARD_SHRINK_DURATION: 250,
    HINT_SHAKE_DURATION: 600,
    HAND_RESIZE_DURATION: 500
};

/**
 * Timing delays (milliseconds)
 */
export const TIMING = {
    COMPUTER_TURN_DELAY: 800,
    HINT_INITIAL_DELAY: 5000,
    HINT_REPEAT_DELAY: 5000,
    STATUS_MESSAGE_SHORT: 1500,
    STATUS_MESSAGE_LONG: 2000,
    DRAW_MESSAGE_DELAY: 1200,
    ANIMATION_DELAY: 400,
    GAME_END_DELAY: 300
};

/**
 * External URLs and endpoints
 */
export const URLS = {
    BASE_IMAGE: 'https://s3.amazonaws.com/img.playingarts.com/one-small-hd/',
    CARD_INFO_BASE: 'https://playingarts.com/one/',
    BACKSIDE_IMAGE:
        'https://s3.amazonaws.com/img.playingarts.com/one-small-hd/_backside-evgeny-kiselev.jpg?2'
};

/**
 * Unified configuration object
 * Combines all configuration sources
 */
export const config = {
    GAME,
    ANIMATION,
    TIMING,
    URLS,
    EMAIL: EMAIL_CONFIG,

    // Re-export from constants for convenience
    GAME_CONFIG,
    SUITS,
    RANKS,
    SUIT_NAMES,
    RANK_NAMES
};

/**
 * Export individual sections for targeted imports
 */
export { GAME_CONFIG, SUITS, RANKS, SUIT_NAMES, RANK_NAMES, EMAIL_CONFIG };

/**
 * Configuration validation
 * @returns {Object} Validation result
 */
export function validateConfig() {
    const errors = [];
    const warnings = [];

    // Validate required sections
    if (!config.GAME) errors.push('GAME configuration missing');
    if (!config.URLS) errors.push('URLS configuration missing');

    // Validate game settings
    if (config.GAME.INITIAL_HAND_SIZE < 1 || config.GAME.INITIAL_HAND_SIZE > 13) {
        errors.push('INITIAL_HAND_SIZE must be between 1 and 13');
    }

    // Validate timing values
    Object.entries(config.TIMING).forEach(([key, value]) => {
        if (typeof value !== 'number' || value < 0) {
            errors.push(`TIMING.${key} must be a positive number`);
        }
    });

    // Validate URLs
    Object.entries(config.URLS).forEach(([key, value]) => {
        if (typeof value !== 'string' || !value.startsWith('http')) {
            warnings.push(`URLS.${key} should be a valid HTTP(S) URL`);
        }
    });

    // Validate email config
    try {
        if (!config.EMAIL.SERVICE_ID) {
            warnings.push('EMAIL.SERVICE_ID not configured');
        }
        if (!config.EMAIL.PUBLIC_KEY) {
            warnings.push('EMAIL.PUBLIC_KEY not configured');
        }
    } catch (error) {
        warnings.push('Email configuration incomplete');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Get configuration summary for debugging
 * @returns {Object} Configuration summary
 */
export function getConfigSummary() {
    return {
        game: {
            handSize: config.GAME.INITIAL_HAND_SIZE,
            jokers: config.GAME.NUM_JOKERS
        },
        timing: {
            computerTurn: config.TIMING.COMPUTER_TURN_DELAY,
            hintDelay: config.TIMING.HINT_INITIAL_DELAY
        },
        email: {
            configured: !!config.EMAIL.SERVICE_ID
        },
        environment: import.meta.env.MODE || 'production'
    };
}
