/**
 * ErrorService - Centralized error handling and recovery
 * Provides consistent error handling, logging, user notifications, and recovery strategies
 *
 * Features:
 * - Structured error logging
 * - User-friendly error messages
 * - Recovery strategies
 * - Error tracking and analytics
 */

import { logger } from '../utils/Logger.js';

/**
 * Error context types for categorization
 */
export const ErrorContext = {
    IMAGE_LOAD: 'image-load',
    NETWORK: 'network',
    STATE: 'state',
    GAME_LOGIC: 'game-logic',
    UI_RENDER: 'ui-render',
    EMAIL_SEND: 'email-send',
    INITIALIZATION: 'initialization',
    UNKNOWN: 'unknown'
};

/**
 * Error severity levels
 */
export const ErrorSeverity = {
    LOW: 'low', // Doesn't affect gameplay
    MEDIUM: 'medium', // Affects non-critical features
    HIGH: 'high', // Affects gameplay
    CRITICAL: 'critical' // Game cannot continue
};

export class ErrorService {
    constructor() {
        this.errors = [];
        this.maxErrors = 100; // Keep last 100 errors
        this.userNotifications = new Set(); // Track shown notifications
    }

    /**
     * Handle an error with optional recovery
     * @param {Error} error - The error object
     * @param {string} context - Error context from ErrorContext
     * @param {Object} options - Additional options
     * @param {Function} options.recovery - Recovery function
     * @param {string} options.severity - Error severity
     * @param {Object} options.metadata - Additional metadata
     * @returns {Promise<boolean>} True if recovered successfully
     */
    async handle(error, context = ErrorContext.UNKNOWN, options = {}) {
        const { recovery = null, severity = ErrorSeverity.MEDIUM, metadata = {} } = options;

        // Create structured error data
        const errorData = {
            message: error.message || String(error),
            stack: error.stack,
            context,
            severity,
            metadata,
            timestamp: Date.now(),
            userAgent: navigator.userAgent
        };

        // Store error
        this.storeError(errorData);

        // Log error
        this.logError(errorData);

        // Show user notification (if not already shown for this context)
        this.showUserNotification(errorData);

        // Attempt recovery if provided
        if (recovery) {
            try {
                await recovery();
                logger.info(`Recovery successful for ${context}`, metadata);
                return true;
            } catch (recoveryError) {
                logger.error(`Recovery failed for ${context}`, recoveryError, metadata);
                this.handle(recoveryError, `${context}-recovery-failed`, {
                    severity: ErrorSeverity.HIGH
                });
                return false;
            }
        }

        return false;
    }

    /**
     * Store error in history
     * @param {Object} errorData - Structured error data
     */
    storeError(errorData) {
        this.errors.push(errorData);

        // Keep only last maxErrors
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }
    }

    /**
     * Log error using Logger
     * @param {Object} errorData - Structured error data
     */
    logError(errorData) {
        const { message, context, severity, metadata } = errorData;

        logger.error(`[${context}] [${severity}] ${message}`, {
            metadata,
            timestamp: new Date(errorData.timestamp).toISOString()
        });
    }

    /**
     * Show user-friendly notification
     * @param {Object} errorData - Structured error data
     */
    showUserNotification(errorData) {
        const { context, severity } = errorData;

        // Don't show duplicate notifications for same context
        if (this.userNotifications.has(context)) {
            return;
        }

        // Only show notifications for medium+ severity
        if (severity === ErrorSeverity.LOW) {
            return;
        }

        const message = this.getUserMessage(context, severity);

        // Mark as shown
        this.userNotifications.add(context);

        // Clear notification after 30 seconds
        setTimeout(() => {
            this.userNotifications.delete(context);
        }, 30000);

        // Show based on severity
        if (severity === ErrorSeverity.CRITICAL) {
            alert(message);
        } else {
            // Could integrate with a toast notification system
            logger.warn(`User notification: ${message}`);
        }
    }

    /**
     * Get user-friendly error message
     * @param {string} context - Error context
     * @param {string} severity - Error severity
     * @returns {string} User-friendly message
     */
    getUserMessage(context, severity) {
        const messages = {
            [ErrorContext.IMAGE_LOAD]:
                'Some card images failed to load. The game will continue with placeholders.',
            [ErrorContext.NETWORK]: 'Network error. Please check your internet connection.',
            [ErrorContext.STATE]:
                'A game state error occurred. The game has been reset to recover.',
            [ErrorContext.GAME_LOGIC]:
                'An unexpected game error occurred. Please try again or refresh the page.',
            [ErrorContext.UI_RENDER]: 'Display error. Please refresh the page if issues persist.',
            [ErrorContext.EMAIL_SEND]: 'Failed to send email. Please try again or contact support.',
            [ErrorContext.INITIALIZATION]:
                'Failed to initialize the game. Please refresh the page.',
            [ErrorContext.UNKNOWN]: 'An unexpected error occurred. Please refresh the page.'
        };

        const baseMessage = messages[context] || messages[ErrorContext.UNKNOWN];

        if (severity === ErrorSeverity.CRITICAL) {
            return `${baseMessage}\n\nPlease refresh the page to continue.`;
        }

        return baseMessage;
    }

    /**
     * Get recent errors
     * @param {number} count - Number of recent errors to return
     * @returns {Array} Recent error data
     */
    getRecentErrors(count = 10) {
        return this.errors.slice(-count);
    }

    /**
     * Get errors by context
     * @param {string} context - Error context to filter by
     * @returns {Array} Filtered errors
     */
    getErrorsByContext(context) {
        return this.errors.filter((err) => err.context === context);
    }

    /**
     * Get error statistics
     * @returns {Object} Error statistics
     */
    getStatistics() {
        const byContext = {};
        const bySeverity = {};

        this.errors.forEach((err) => {
            // Count by context
            byContext[err.context] = (byContext[err.context] || 0) + 1;

            // Count by severity
            bySeverity[err.severity] = (bySeverity[err.severity] || 0) + 1;
        });

        return {
            total: this.errors.length,
            byContext,
            bySeverity,
            mostRecent: this.errors[this.errors.length - 1] || null
        };
    }

    /**
     * Clear error history
     */
    clearErrors() {
        this.errors = [];
        this.userNotifications.clear();
        logger.info('Error history cleared');
    }

    /**
     * Export errors for debugging or analytics
     * @returns {string} JSON string of errors
     */
    exportErrors() {
        return JSON.stringify(
            {
                exported: new Date().toISOString(),
                errors: this.errors,
                statistics: this.getStatistics()
            },
            null,
            2
        );
    }
}

/**
 * Create singleton ErrorService instance
 */
export const errorService = new ErrorService();

/**
 * Convenience function for handling errors
 * @param {Error} error - Error to handle
 * @param {string} context - Error context
 * @param {Object} options - Additional options
 * @returns {Promise<boolean>} True if recovered
 */
export async function handleError(error, context, options = {}) {
    return errorService.handle(error, context, options);
}
