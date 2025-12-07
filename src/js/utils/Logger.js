/**
 * Logger - Structured logging utility with configurable levels
 * Provides consistent, environment-aware logging throughout the application
 *
 * Usage:
 *   import { logger } from './utils/Logger.js';
 *   logger.debug('Debug message', { data });
 *   logger.info('Info message');
 *   logger.warn('Warning message');
 *   logger.error('Error message', error);
 */

/**
 * Log level enumeration
 * Lower number = more verbose
 */
export const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

/**
 * Logger class with configurable levels and formatting
 */
export class Logger {
    /**
     * @param {number} level - Minimum log level to display
     * @param {boolean} includeTimestamp - Whether to include timestamps
     * @param {boolean} includeContext - Whether to include context in logs
     */
    constructor(level = LogLevel.INFO, includeTimestamp = true, includeContext = true) {
        this.level = level;
        this.includeTimestamp = includeTimestamp;
        this.includeContext = includeContext;
        this.context = {};
    }

    /**
     * Set global context that appears in all logs
     * @param {Object} context - Context data
     */
    setContext(context) {
        this.context = { ...this.context, ...context };
    }

    /**
     * Clear global context
     */
    clearContext() {
        this.context = {};
    }

    /**
     * Set the minimum log level
     * @param {number} level - Log level from LogLevel enum
     */
    setLevel(level) {
        this.level = level;
    }

    /**
     * Format timestamp for logs
     * @returns {string} Formatted timestamp
     */
    getTimestamp() {
        if (!this.includeTimestamp) return '';
        const now = new Date();
        return `[${now.toISOString()}]`;
    }

    /**
     * Format log message with metadata
     * @param {string} level - Log level name
     * @param {string} message - Log message
     * @param {Array} args - Additional arguments
     * @returns {Array} Formatted log parts
     */
    formatMessage(level, message, args) {
        const parts = [];

        if (this.includeTimestamp) {
            parts.push(this.getTimestamp());
        }

        parts.push(`[${level}]`);

        if (this.includeContext && Object.keys(this.context).length > 0) {
            parts.push(JSON.stringify(this.context));
        }

        parts.push(message);

        return [...parts, ...args];
    }

    /**
     * Log debug message (lowest priority)
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments
     */
    debug(message, ...args) {
        if (this.level <= LogLevel.DEBUG) {
            const formatted = this.formatMessage('DEBUG', message, args);
            console.debug(...formatted);
        }
    }

    /**
     * Log info message
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments
     */
    info(message, ...args) {
        if (this.level <= LogLevel.INFO) {
            const formatted = this.formatMessage('INFO', message, args);
            console.info(...formatted);
        }
    }

    /**
     * Log warning message
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments
     */
    warn(message, ...args) {
        if (this.level <= LogLevel.WARN) {
            const formatted = this.formatMessage('WARN', message, args);
            console.warn(...formatted);
        }
    }

    /**
     * Log error message (highest priority)
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments (typically Error objects)
     */
    error(message, ...args) {
        if (this.level <= LogLevel.ERROR) {
            const formatted = this.formatMessage('ERROR', message, args);
            console.error(...formatted);

            // Extract stack traces from Error objects
            args.forEach((arg) => {
                if (arg instanceof Error && arg.stack) {
                    console.error('Stack trace:', arg.stack);
                }
            });
        }
    }

    /**
     * Create a child logger with additional context
     * @param {Object} context - Additional context for child logger
     * @returns {Logger} New logger instance with combined context
     */
    child(context) {
        const childLogger = new Logger(this.level, this.includeTimestamp, this.includeContext);
        childLogger.setContext({ ...this.context, ...context });
        return childLogger;
    }

    /**
     * Log a group of related messages
     * @param {string} label - Group label
     * @param {Function} callback - Function that logs grouped messages
     */
    group(label, callback) {
        if (this.level <= LogLevel.INFO) {
            console.group(label);
            callback();
            console.groupEnd();
        }
    }
}

/**
 * Create logger instance based on environment
 * Production: ERROR only
 * Development: DEBUG for full visibility
 * @returns {Logger} Configured logger instance
 */
function createDefaultLogger() {
    const isDevelopment = import.meta.env.MODE === 'development';
    const level = isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR;

    return new Logger(level, true, isDevelopment);
}

/**
 * Default logger instance
 * Use this throughout the application for consistent logging
 */
export const logger = createDefaultLogger();

/**
 * Create a logger with custom configuration
 * @param {Object} options - Logger options
 * @returns {Logger} Configured logger instance
 */
export function createLogger(options = {}) {
    const { level = LogLevel.INFO, timestamp = true, context = true } = options;

    return new Logger(level, timestamp, context);
}
