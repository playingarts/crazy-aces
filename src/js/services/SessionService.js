/**
 * Session Service
 *
 * Manages secure game sessions with the backend API.
 * Prevents win streak manipulation by tracking game state server-side.
 */

import { logger } from '../utils/Logger.js';

export class SessionService {
    constructor() {
        this.sessionToken = null;
        this.winStreak = 0;
    }

    /**
     * Get API base URL based on environment
     */
    getApiUrl() {
        if (window.location.hostname === 'localhost') {
            return 'http://localhost:3000';
        }
        return '';
    }

    /**
     * Start a new game session (or reuse existing one to preserve win streak)
     * @returns {Promise<boolean>} Success status
     */
    async startSession() {
        try {
            // If we have an existing session, reuse it to preserve win streak
            // Only create a new session if we don't have one
            const body = this.sessionToken
                ? { sessionToken: this.sessionToken, newGame: true }
                : {};

            const response = await fetch(`${this.getApiUrl()}/api/start-game`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error('Failed to start session');
            }

            const data = await response.json();

            if (data.success) {
                this.sessionToken = data.sessionToken;
                this.winStreak = data.winStreak || 0;
                logger.info('Game session started', { winStreak: this.winStreak });
                return true;
            }

            return false;
        } catch (error) {
            logger.error('Failed to start session:', error);
            return false;
        }
    }

    /**
     * Update session with game result
     * @param {boolean} won - Whether the player won
     * @returns {Promise<number|null>} New win streak or null on error
     */
    async updateSession(won) {
        if (!this.sessionToken) {
            logger.warn('No active session to update');
            return null;
        }

        try {
            const response = await fetch(`${this.getApiUrl()}/api/start-game`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionToken: this.sessionToken,
                    won: won
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update session');
            }

            const data = await response.json();

            if (data.success) {
                this.sessionToken = data.sessionToken; // Update with new token
                this.winStreak = data.winStreak;
                logger.info(`Session updated: ${won ? 'WIN' : 'LOSS'}`, { winStreak: this.winStreak });
                return this.winStreak;
            }

            return null;
        } catch (error) {
            logger.error('Failed to update session:', error);
            return null;
        }
    }

    /**
     * Get current session token
     * @returns {string|null} Session token
     */
    getSessionToken() {
        return this.sessionToken;
    }

    /**
     * Get current win streak
     * @returns {number} Win streak
     */
    getWinStreak() {
        return this.winStreak;
    }

    /**
     * Clear current session
     */
    clearSession() {
        this.sessionToken = null;
        this.winStreak = 0;
        logger.info('Session cleared');
    }
}
