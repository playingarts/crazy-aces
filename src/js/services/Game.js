/**
 * Game - Main game controller
 * Coordinates GameState, GameEngine, and GameUI
 *
 * Uses dependency injection for better testability and flexibility
 */

import { GameState } from './GameState.js';
import { GameEngine } from './GameEngine.js';
import { GameUI } from '../ui/GameUI.js';
import { UIStateManager } from '../ui/UIStateManager.js';
import { logger } from '../utils/Logger.js';
import { errorService, ErrorContext, ErrorSeverity } from './ErrorService.js';
import { analytics } from './Analytics.js';
import { getRandomEdition, setCurrentEdition, getCurrentEdition } from '../config/editions.js';

export class Game {
    /**
     * @param {Object} config - Game configuration
     * @param {Object} dependencies - Injectable dependencies for testability
     * @param {GameState} dependencies.state - Game state manager
     * @param {GameEngine} dependencies.engine - Game logic engine
     * @param {GameUI} dependencies.ui - UI controller
     * @param {UIStateManager} dependencies.uiState - UI state manager
     * @param {SessionService} dependencies.sessionService - Session tracking
     * @param {Logger} dependencies.logger - Logger instance
     * @param {ErrorService} dependencies.errorService - Error handler
     */
    constructor(config, dependencies = {}) {
        this.config = config;

        // Use injected dependencies or create defaults
        this.state = dependencies.state || new GameState();
        this.engine = dependencies.engine || new GameEngine(this.state);
        this.ui = dependencies.ui || new GameUI(config);
        this.uiState = dependencies.uiState || new UIStateManager();
        this.sessionService = dependencies.sessionService || null;
        this.logger = dependencies.logger || logger;
        this.errorService = dependencies.errorService || errorService;

        // Set logger context for all game logs
        this.logger.setContext({ component: 'Game' });
    }

    /**
     * Initialize and start a new game
     */
    async init() {
        try {
            this.ui.clearAllTimeouts();
            this.ui.updateStatus('Loading cards...');

            // Select a random edition for this game
            const edition = getRandomEdition();
            setCurrentEdition(edition);
            this.logger.debug('Selected edition:', edition.name);

            // Clear preload cache if edition changed
            this.ui.checkEditionChange(edition.id);

            // Update card-back CSS for current edition
            document.documentElement.style.setProperty(
                '--card-back-image',
                `url('${edition.baseUrl}${edition.backsideImage}')`
            );

            // Reset all UI elements to default state
            this.uiState.resetAllDisplays();

            // Initialize game state
            this.state.initializeGame(this.config.GAME.INITIAL_HAND_SIZE);
            this.state.ensurePlayerHasPlayableCard();

            // Preload images in parallel for faster loading
            this.ui.updateStatus('Loading images...');
            const topCard = this.state.topCard;
            const preloadPromises = [];

            // Collect all preload promises
            if (topCard?.imageUrl) {
                preloadPromises.push(this.ui.preloadImage(topCard.imageUrl).catch(() => {}));
            }
            preloadPromises.push(this.ui.preloadHandImages(this.state.playerHand).catch(() => {}));
            preloadPromises.push(this.ui.preloadHandImages(this.state.computerHand).catch(() => {}));

            // Start session in parallel (don't block on it)
            const sessionPromise = this.sessionService
                ? this.sessionService.startSession().catch(() => {})
                : Promise.resolve();

            // Wait for all images to load in parallel
            await Promise.all(preloadPromises);

            // Render initial state
            this.render();

            this.ui.hideGameOver();

            // Ensure session is ready (usually already done by now)
            await sessionPromise;

            // Track game started
            analytics.gameStarted();

            // Show different message for first game vs subsequent games
            if (!this.state.playerMadeFirstMove) {
                this.ui.updateStatus('Match the suit or rank to play');
            } else {
                this.ui.updateStatus('Your turn');
            }

            // Start hint timer on first game
            if (this.state.isFirstGame) {
                this.ui.startHintTimer(() => this.showHint());
            }
        } catch (error) {
            await this.errorService.handle(error, ErrorContext.INITIALIZATION, {
                severity: ErrorSeverity.CRITICAL,
                metadata: { phase: 'game-init' }
            });
            this.ui.updateStatus('Error starting game: ' + (error?.message || error));
        }
    }

    /**
     * Render the current game state
     * @param {boolean} animateTableCard - Whether to animate the table card
     * @param {string} animateFrom - Direction to animate from ('top' or 'bottom')
     */
    render(animateTableCard = false, animateFrom = 'bottom') {
        // Render table card with full state for visual effects
        this.ui.renderTableCard(
            this.state.topCard,
            animateTableCard,
            animateFrom,
            this.state.discardPile,
            this.state.suitWasChanged,
            this.state.currentSuit
        );

        // Render player hand
        this.ui.renderPlayerHand(this.state.playerHand, (index) => {
            this.handlePlayerCardClick(index);
        });

        // Render computer hand
        this.ui.renderComputerHand(this.state.computerHand.length);

        // Update counters
        this.ui.updateCounters(
            this.state.playerHand.length,
            this.state.computerHand.length,
            this.state.deck?.size || 0
        );
    }

    /**
     * Handle player clicking a card
     * @param {number} cardIndex - Index of card in hand
     */
    async handlePlayerCardClick(cardIndex) {
        try {
            // Prevent race conditions - check and set processing flag immediately
            if (this.state.isProcessingMove) return;
            if (this.state.gameOver || this.state.isComputerTurn || this.state.pendingEightCard)
                return;

            const card = this.state.playerHand[cardIndex];
            if (!card) return;

            // Lock processing and turn FIRST to prevent race conditions
            this.state.isProcessingMove = true;
            this.state.isComputerTurn = true;

            // Track first action (before validation to capture even failed attempts)
            analytics.firstAction();

            // Validate move
            const validation = this.engine.validatePlayerMove(cardIndex);
            if (!validation.valid) {
                // Track invalid card attempt
                analytics.invalidCard(card, validation.reason);

                // Unlock turn and processing if validation fails
                this.state.isComputerTurn = false;
                this.state.isProcessingMove = false;
                this.ui.updateStatus(validation.reason);

                // Apply shake animation to the invalid card
                const cardEl = this.ui.elements.playerHand.querySelector(`[data-card-index="${cardIndex}"]`);
                if (cardEl) {
                    cardEl.classList.remove('invalid-shake');
                    // Force reflow to restart animation
                    void cardEl.offsetWidth;
                    cardEl.classList.add('invalid-shake');
                    setTimeout(() => cardEl.classList.remove('invalid-shake'), 400);
                }
                return;
            }

            // Increment turn counter for analytics
            analytics.incrementTurn();

            // Clear hint timer and mark player has acted
            this.ui.clearHintTimer();
            this.ui.hideDeckHint(false); // Hide temporarily (they played instead of drawing)
            if (!this.state.playerHasActed) {
                this.state.playerHasActed = true;
                this.state.playerMadeFirstMove = true; // Mark first move permanently
                this.state.isFirstGame = false;
            }

            // Animate card flying out
            await this.ui.animateCardPlay(cardIndex);

            // Get suits that have already been CHOSEN by previous Aces
            // (we check before playing the current card)
            const playedAceSuits = this.getPlayedAceSuits();

            // Remove from hand and add to discard pile
            const playedCard = this.state.playCardFromHand(cardIndex);

            // Track card played
            analytics.cardPlayed(playedCard);

            // If player has no cards left, hide hand and status message instantly
            if (this.state.playerHand.length === 0) {
                this.uiState.hidePlayerHandOnEmpty();
            }

            // Handle Joker
            if (playedCard.isJoker) {
                this.logger.debug('Player played Joker', {
                    handSize: this.state.playerHand.length
                });

                // Check for win BEFORE setting jokerWasPlayed flag
                const winResult = this.engine.checkWinCondition();
                this.logger.debug('Win check result after Joker', { result: winResult });

                if (winResult) {
                    // Player won with Joker as last card - end game immediately
                    this.state.isProcessingMove = false;

                    // Preload Joker image before showing game over
                    if (playedCard.imageUrl) {
                        try {
                            await this.ui.preloadImage(playedCard.imageUrl);
                        } catch (err) {
                            this.logger.error(
                                'Failed to preload Joker image:',
                                playedCard.imageUrl,
                                err
                            );
                        }
                    }
                    this.render(true, 'bottom');

                    await this.delay(this.config.TIMING.GAME_END_DELAY);
                    await this.handleGameEnd(winResult);
                    return;
                }

                // Normal Joker handling - player has more cards
                this.state.jokerWasPlayed = true;
                this.state.isComputerTurn = false; // Keep turn unlocked
                this.state.isProcessingMove = false; // Unlock processing so player can play another card
                this.ui.updateStatus('Joker played — play any card');

                // Preload Joker image before rendering
                if (playedCard.imageUrl) {
                    try {
                        await this.ui.preloadImage(playedCard.imageUrl);
                    } catch (err) {
                        this.logger.error('Failed to preload Joker image:', playedCard.imageUrl, err);
                    }
                } else {
                    this.logger.error('Joker card has no imageUrl:', playedCard);
                }
                this.render(true, 'bottom');
                return;
            }

            // Check if this card was played after a Joker
            const wasAfterJoker = this.state.jokerWasPlayed;
            if (this.state.jokerWasPlayed) {
                this.state.jokerWasPlayed = false;
                this.state.suitWasChanged = true; // Show that suit was changed by joker
            } else {
                // Reset suit change flag only if not after Joker
                this.state.suitWasChanged = false;
            }

            // Handle Ace - show suit selector
            if (playedCard.isAce) {
                this.state.pendingEightCard = playedCard;
                this.state.isComputerTurn = false; // Unlock while waiting for suit selection
                this.state.isProcessingMove = false; // Unlock processing while waiting for suit selection
                this.ui.updateStatus('Ace played! Pick a suit');

                // Preload all 4 Ace images (user will select which one to display)
                this.logger.debug('🃏 Player played Ace - preloading all Ace images');
                await this.ui.preloadHandImages([playedCard]).catch(() => {});

                // Refresh player hand to remove the played Ace from DOM
                // (the card was animated out but element still exists with width=0)
                this.ui.refreshPlayerHand(this.state.playerHand);

                // Start suit selection timing
                analytics.startSuitSelection();

                // Show suit selector with already-chosen suits disabled
                // (these are the suits that were CHOSEN by previous Aces, not the original Ace suits)
                this.ui.showSuitSelector(
                    (suit) => this.handleSuitSelection(suit, playedCard),
                    () => this.handleSuitSelectionCancel(playedCard),
                    null,
                    playedAceSuits // Suits that have already been chosen
                );
                return;
            }

            // Regular card
            this.state.updateCurrentCard(playedCard.suit, playedCard.rank);

            if (wasAfterJoker) {
                this.ui.updateStatus(
                    `You played ${playedCard.rank}${playedCard.suit} - suit is now ${playedCard.suit}`
                );
            } else {
                this.ui.updateStatus(`You played ${playedCard.rank}${playedCard.suit}`);
            }

            // Preload card image before rendering to prevent blank cards
            if (playedCard.imageUrl) {
                try {
                    await this.ui.preloadImage(playedCard.imageUrl);
                } catch (err) {
                    this.logger.error('Failed to preload played card image:', playedCard.imageUrl, err);
                }
            } else {
                this.logger.error('Played card has no imageUrl:', playedCard);
            }

            // Render with animation
            this.render(true, 'bottom');

            // Check for win
            const winResult = this.engine.checkWinCondition();
            if (winResult) {
                this.state.isProcessingMove = false; // Unlock processing - game is over
                await this.delay(this.config.TIMING.GAME_END_DELAY);
                this.handleGameEnd(winResult);
                return;
            }

            await this.delay(this.config.TIMING.STATUS_MESSAGE_SHORT);

            // Computer's turn (processing will be unlocked after computer completes)
            await this.executeComputerTurn();
        } catch (error) {
            this.logger.error('Error in handlePlayerCardClick:', error);
            this.state.isComputerTurn = false;
            this.state.isProcessingMove = false; // Unlock processing on error
            this.ui.updateStatus('Something went wrong. Try again.');
        }
    }

    /**
     * Handle suit selection
     * @param {string} suit - Selected suit
     * @param {Card} card - Card that was played
     */
    async handleSuitSelection(suit, card) {
        try {
            // Lock processing to prevent multiple suit selections
            this.state.isProcessingMove = true;

            // Get the actual card from pending (should be same reference as parameter)
            const cardToTransform = this.state.pendingEightCard || card;

            // CRITICAL FIX: Check if we're in Joker continuation, not if current card is Joker
            const wasAfterJoker = this.state.jokerWasPlayed;
            const originalRank = cardToTransform.rank;

            // DON'T mutate the Ace - it remains an Ace with its original suit
            if (cardToTransform.isAce) {
                // If this Ace was played after a Joker, show suit change
                if (wasAfterJoker) {
                    this.state.jokerWasPlayed = false; // Reset Joker flag
                    this.state.suitWasChanged = true;
                } else {
                    this.state.suitWasChanged = true; // Show suit change indicator for Ace
                }
            } else {
                this.state.suitWasChanged = true; // Keep flag for Jokers
            }

            // Update game state to reflect chosen suit
            this.state.currentSuit = suit;
            this.state.currentRank = originalRank; // Use original rank (always 'A' for Aces)

            // Track suit selection with timing
            analytics.suitSelectedWithTiming(cardToTransform.isAce ? 'ace' : 'joker', suit);

            // Record the chosen suit (for Ace only)
            if (cardToTransform.isAce) {
                this.state.recordChosenAceSuit(suit);
            }

            this.state.pendingEightCard = null;

            this.ui.updateStatus(`You changed suit to ${suit}`);

            // Render with animation
            this.render(true, 'bottom');

            // Check for win
            const winResult = this.engine.checkWinCondition();
            if (winResult) {
                this.state.isProcessingMove = false; // Unlock processing - game is over
                await this.delay(this.config.TIMING.GAME_END_DELAY);
                this.handleGameEnd(winResult);
                return;
            }

            await this.delay(this.config.TIMING.STATUS_MESSAGE_LONG);

            // If this Ace was played after Joker, player keeps the turn
            if (!wasAfterJoker) {
                this.state.isComputerTurn = true;
                this.state.isProcessingMove = false; // Unlock processing - computer's turn
                await this.executeComputerTurn();
            } else {
                // Player keeps turn after Joker→Ace sequence
                this.state.isComputerTurn = false;
                this.state.isProcessingMove = false; // Unlock processing - player's turn
                this.ui.updateStatus('Your turn');
            }
        } catch (error) {
            this.logger.error('Error in handleSuitSelection:', error);
            this.state.isComputerTurn = false; // CRITICAL FIX: Unlock turn on error
            this.state.isProcessingMove = false; // Unlock processing on error
            this.state.pendingEightCard = null; // Clear pending state
            this.ui.updateStatus('Something went wrong. Try again.');
        }
    }

    /**
     * Handle suit selection being cancelled
     * @param {Card} card - Card that was played
     */
    async handleSuitSelectionCancel(card) {
        // Return the card to player's hand
        this.state.discardPile.pop(); // Remove from discard pile
        this.state.playerHand.push(card); // Add back to hand
        this.state.pendingEightCard = null;

        this.state.isComputerTurn = false; // Unlock turn for player
        this.state.isProcessingMove = false; // Unlock processing for player

        this.render(false);
        this.ui.updateStatus('Card returned to hand');

        await this.delay(this.config.TIMING.STATUS_MESSAGE_SHORT);
        this.ui.updateStatus('Your turn');
    }

    /**
     * Handle player drawing a card
     */
    async handleDrawCard() {
        try {
            if (
                this.state.isProcessingMove ||
                this.state.isDrawing ||
                this.state.isComputerTurn ||
                this.state.gameOver ||
                this.state.pendingEightCard
            ) {
                return;
            }

            this.state.isProcessingMove = true; // Lock processing
            this.state.isDrawing = true;
            this.state.isComputerTurn = true; // Lock turn
            this.ui.clearHintTimer();
            this.ui.hideDeckHint(true); // Hide and dismiss permanently (they learned to draw)

            // Track first action
            analytics.firstAction();

            // Mark that player has acted
            if (!this.state.playerHasActed) {
                this.state.playerHasActed = true;
                this.state.playerMadeFirstMove = true; // Mark first move permanently
                this.state.isFirstGame = false;
            }

            const card = this.state.drawCardForPlayer();

            if (!card) {
                this.ui.updateStatus('Deck empty - pass turn');
                this.state.isDrawing = false;
                await this.delay(this.config.TIMING.STATUS_MESSAGE_SHORT);
                await this.executeComputerTurn();
                return;
            }

            // Preload the drawn card
            await this.ui.preloadCardOnDraw(card);

            // Render immediately so card appears in hand
            this.render(false);

            this.ui.animateDeckDraw('bottom');
            this.ui.updateStatus('You drew a card');

            // Check if drawn card is playable
            const canPlayDrawnCard = this.engine.canPlayCard(card);

            // Track card drawn
            analytics.cardDrawn(canPlayDrawnCard);

            if (canPlayDrawnCard) {
                this.ui.updateStatus('You can play the card you drew!');
                this.state.isDrawing = false;
                this.state.isComputerTurn = false; // Unlock for player
                this.state.isProcessingMove = false; // Unlock processing for player
            } else {
                this.state.isDrawing = false;
                await this.executeComputerTurn();
            }
        } catch (error) {
            this.logger.error('Error in handleDrawCard:', error);
            this.state.isDrawing = false;
            this.state.isComputerTurn = false;
            this.state.isProcessingMove = false; // Unlock processing on error
            this.ui.updateStatus('Something went wrong. Try again.');
        }
    }

    /**
     * Execute computer's turn
     */
    async executeComputerTurn() {
        try {
            this.ui.updateStatus("Opponent's move");

            await this.delay(this.config.TIMING.COMPUTER_TURN_DELAY);

            const computerHandSizeBefore = this.state.computerHand.length;
            const result = await this.engine.executeComputerTurn();

            if (result.action === 'play') {
                // Animate computer card flying out
                await this.ui.animateComputerCardPlay(computerHandSizeBefore);

                // If computer has no cards left, hide hand and status message instantly
                if (this.state.computerHand.length === 0) {
                    this.uiState.hideOpponentHand();
                }

                const card = result.card;

                // Handle Joker - computer plays another card to define suit
                if (result.isJoker) {
                    this.ui.updateStatus('Opponent played Joker');

                    // Preload Joker image before rendering
                    if (card.imageUrl) {
                        try {
                            await this.ui.preloadImage(card.imageUrl);
                        } catch (err) {
                            this.logger.error(
                                'Failed to preload computer Joker image:',
                                card.imageUrl,
                                err
                            );
                        }
                    } else {
                        this.logger.error('Computer Joker card has no imageUrl:', card);
                    }
                    this.render(true, 'top');

                    // Check for win
                    const jokerWinResult = this.engine.checkWinCondition();
                    if (jokerWinResult) {
                        this.state.isProcessingMove = false; // Unlock processing - game is over
                        await this.delay(this.config.TIMING.GAME_END_DELAY);
                        await this.handleGameEnd(jokerWinResult); // CRITICAL FIX: Use captured result
                        return;
                    }

                    // Continue turn - play another card
                    await this.delay(this.config.TIMING.COMPUTER_TURN_DELAY);
                    await this.executeComputerTurn();
                    return;
                }

                // Handle Ace with suit change
                if (result.newSuit) {
                    // Preload all 4 Ace images before rendering
                    this.logger.debug('🤖 Computer played Ace - preloading all Ace images');
                    await this.ui.preloadHandImages([card]).catch(() => {});

                    const suitNames = {
                        '♠': 'Spades',
                        '♥': 'Hearts',
                        '♦': 'Diamonds',
                        '♣': 'Clubs'
                    };
                    this.ui.updateStatus(
                        `Opponent played Ace — changed to ${suitNames[result.newSuit]}`
                    );
                } else {
                    const cardName = `${card.rank}${card.suit}`;
                    this.ui.updateStatus(`Opponent played ${cardName}`);
                }
            } else if (result.action === 'draw') {
                // Preload the drawn card's image
                if (result.card && result.card.imageUrl) {
                    try {
                        await this.ui.preloadCardOnDraw(result.card);
                    } catch (err) {
                        this.logger.error(
                            'Failed to preload computer drawn card:',
                            result.card.imageUrl,
                            err
                        );
                    }
                } else if (result.card) {
                    this.logger.error('Computer drawn card has no imageUrl:', result.card);
                }

                this.ui.animateDeckDraw('top');
                this.ui.updateStatus('Opponent drew a card');
                this.render(false);

                // If drawn card is playable, computer plays it
                if (result.canPlayDrawnCard) {
                    await this.delay(this.config.TIMING.COMPUTER_TURN_DELAY);
                    await this.executeComputerTurn();
                    return; // Recursive call will handle turn unlock
                }
                // If drawn card is NOT playable, computer passes turn - continue to unlock below
            } else if (result.action === 'pass') {
                this.ui.updateStatus('Opponent passes — deck empty');
            }

            // Render with animation from top (computer's side) if card was played
            if (result.action === 'play') {
                // Preload computer's card image before rendering
                if (result.card && result.card.imageUrl) {
                    try {
                        await this.ui.preloadImage(result.card.imageUrl);
                    } catch (err) {
                        this.logger.error(
                            'Failed to preload computer card image:',
                            result.card.imageUrl,
                            err
                        );
                    }
                } else {
                    this.logger.error('Computer card has no imageUrl:', result.card);
                }
                this.render(true, 'top');
            }

            // Check for win
            const winResult = this.engine.checkWinCondition();
            if (winResult) {
                this.state.isProcessingMove = false; // Unlock processing - game is over
                await this.delay(this.config.TIMING.GAME_END_DELAY);
                this.handleGameEnd(winResult);
                return;
            }

            // Unlock player turn immediately - no delay
            this.state.isComputerTurn = false; // Unlock turn for player
            this.state.isProcessingMove = false; // Unlock processing for player
            this.ui.updateStatus('Your turn');

            // Restart hint timer (unless deck hint was dismissed)
            // For shake hints: only on first game before first move
            // For deck hints: anytime player has no playable cards (until dismissed)
            if (!this.ui.deckHintDismissed) {
                this.ui.startHintTimer(() => this.showHint());
            }
        } catch (error) {
            this.logger.error('Error in executeComputerTurn:', error);
            this.state.isComputerTurn = false;
            this.state.isProcessingMove = false; // Unlock processing on error
            this.ui.updateStatus('Something went wrong. Try again.');
        }
    }

    /**
     * Handle game end
     * @param {Object} winResult - Winner information
     */
    async handleGameEnd(winResult) {
        const playerWon = winResult.winner === 'player';

        // Track game ended
        analytics.gameEnded(winResult.winner, winResult.winStreak || 0);

        // Track discount offered if player won
        if (playerWon && winResult.winStreak > 0) {
            const discount = winResult.winStreak >= 2 ? 15 : 10;
            analytics.discountOffered(discount, winResult.winStreak);
        }

        // Note: hands and notification are already hidden when last card was played

        // BUG-026 FIX: Update server-side session BEFORE showing popup
        // This ensures the win streak is recorded in Redis before user can click "Claim Discount"
        // Previously this was called after showGameOver, causing a race condition where
        // fast-clicking users would claim with stale win streak data
        if (this.sessionService) {
            await this.sessionService.updateSession(playerWon);
        }

        // Show popup AFTER session is updated (so discount tier is correct if user claims immediately)
        this.ui.showGameOver(
            playerWon,
            winResult.winStreak || 0,
            winResult.gamesPlayed || 0,
            this.state.discountClaimed
        );

        if (playerWon) {
            this.ui.updateStatus(
                `You win!${winResult.winStreak > 1 ? ` ${winResult.winStreak} in a row` : ''}`
            );
        } else {
            this.ui.updateStatus('Opponent wins!');
        }
    }

    /**
     * Show hint for playable cards
     */
    showHint() {
        if (this.state.gameOver || this.state.isComputerTurn) {
            return;
        }

        // Check if player has any playable cards
        const hasPlayableCard = this.state.playerHand.some((card, index) =>
            this.engine.canPlayCard(card)
        );

        if (hasPlayableCard) {
            // Only show shake hints before first move
            if (!this.state.playerMadeFirstMove) {
                // Track hint shown
                analytics.hintShown('playable_card');
                this.ui.showPlayableCardHint((index) => {
                    const card = this.state.playerHand[index];
                    return this.engine.canPlayCard(card);
                });
            }
        } else {
            // Player has no playable cards - show deck hint (works even after first move)
            analytics.hintShown('draw_card');
            this.ui.showDeckHint();
        }

        // Repeat hint
        this.ui.hintTimeout = setTimeout(
            () => this.showHint(),
            this.config.TIMING.HINT_REPEAT_DELAY
        );
    }

    /**
     * Get suits that have been CHOSEN when Aces were played
     * @returns {Array<string>} Array of suits that cannot be chosen again
     */
    getPlayedAceSuits() {
        // Return the suits that were CHOSEN, not the original suits of Ace cards
        return this.state.chosenAceSuits;
    }

    /**
     * Delay helper
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise}
     */
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Reset and start new game
     */
    async reset() {
        // Track game abandoned if game was in progress
        if (this.state.gameStarted && !this.state.gameOver && analytics.currentTurn > 0) {
            analytics.gameAbandoned();
        }

        this.state.reset();
        await this.init();
    }
}
