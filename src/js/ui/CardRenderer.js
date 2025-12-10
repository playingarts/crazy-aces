/**
 * CardRenderer - Handles all card rendering logic
 * Renders table card, player hand, computer hand, and card stack
 */

import { GAME_CONFIG } from '../config/constants.js';
import { CARD_IMAGE_FILENAMES, CARD_ARTISTS, ARTIST_URL_SLUGS } from '../config/cardData.js';

export class CardRenderer {
    constructor(config, elements) {
        this.config = config;
        this.elements = elements;
    }

    /**
     * Get the image URL for an Ace of a specific suit
     * @param {string} suit - Suit symbol
     * @returns {string} Image URL for the Ace of that suit
     */
    getAceImageUrl(suit) {
        const key = `A${suit}`;
        const filename = CARD_IMAGE_FILENAMES[key];
        return filename ? `${GAME_CONFIG.URLS.BASE_IMAGE}${filename}` : '';
    }

    /**
     * Render the table card (discard pile top card)
     * @param {Card} card - Card to display
     * @param {boolean} animate - Whether to animate the card
     * @param {string} animateFrom - Direction to animate from ('top' or 'bottom')
     * @param {Array} discardPile - Full discard pile for stack rendering
     * @param {boolean} suitWasChanged - Whether suit was changed by wild card
     * @param {string} currentSuit - Current active suit
     */
    renderTableCard(
        card,
        animate = false,
        animateFrom = 'bottom',
        discardPile = [],
        suitWasChanged = false,
        currentSuit = null
    ) {
        if (!this.elements.tableCard || !card) {
            return;
        }

        // For Aces with changed suit, render the Ace of the chosen suit (not original)
        let imageUrl = card.imageUrl;
        if (card.isAce && suitWasChanged && currentSuit && currentSuit !== card.suit) {
            // Construct image URL for Ace of the chosen suit
            imageUrl = this.getAceImageUrl(currentSuit);
        }

        if (!imageUrl) {
            console.error('Card has no imageUrl:', card);
            return;
        }

        const artistUrl = card.artistUrl;

        // Calculate rotation (first card is straight, others have slight rotation)
        const isFirstCard = discardPile.length <= 1;
        const rotation = isFirstCard ? 0 : (Math.random() - 0.5) * 6;

        // Set animation class if needed
        const animationClass = animate ? `card card-animating-from-${animateFrom}` : 'card';
        this.elements.tableCard.className = animationClass;
        this.elements.tableCard.style.backgroundImage = `url('${imageUrl}')`;
        this.elements.tableCard.style.setProperty('--rotation', `${rotation}deg`);
        this.elements.tableCard.style.transform = `rotate(${rotation}deg)`;

        // Remove animation class after animation completes
        if (animate) {
            setTimeout(() => {
                this.elements.tableCard.classList.remove(`card-animating-from-${animateFrom}`);
            }, this.config.ANIMATION.CARD_DROP_DURATION);
        }

        // Render card info overlay (rank, suit, artist)
        if (suitWasChanged && currentSuit) {
            // After suit is changed, show rank + new suit (or just suit for Joker)
            if (card.isJoker) {
                // Joker: show only the new suit + artist
                this.elements.tableCard.innerHTML = `
                    <div class="card-info">
                        <span class="info-suit">${currentSuit}</span>
                    </div>
                    <div class="card-artist"><a href="${artistUrl}" target="_blank">${card.artist}</a></div>
                `;
            } else if (card.isAce) {
                // Ace: show rank + new suit + artist for the NEW suit
                const newAceKey = `A${currentSuit}`;
                const newArtist = CARD_ARTISTS[newAceKey] || card.artist;
                const newArtistSlug = ARTIST_URL_SLUGS[newArtist];
                const newArtistUrl = newArtistSlug
                    ? `${GAME_CONFIG.URLS.CARD_INFO_BASE}${newArtistSlug}`
                    : GAME_CONFIG.URLS.CARD_INFO_BASE;

                this.elements.tableCard.innerHTML = `
                    <div class="card-info">
                        <span class="info-rank">${card.rank}</span>
                        <span class="info-suit">${currentSuit}</span>
                    </div>
                    <div class="card-artist"><a href="${newArtistUrl}" target="_blank">${newArtist}</a></div>
                `;
            } else {
                // Regular card played after Joker (suit was changed)
                this.elements.tableCard.innerHTML = `
                    <div class="card-info">
                        <span class="info-rank">${card.rank}</span>
                        <span class="info-suit">${card.suit}</span>
                    </div>
                    <div class="card-artist"><a href="${artistUrl}" target="_blank">${card.artist}</a></div>
                `;
            }
        } else if (card.isJoker) {
            // Show JOKER text before suit is chosen
            this.elements.tableCard.innerHTML = `
                <div class="card-info">
                    <span class="info-joker">JOKER</span>
                </div>
                <div class="card-artist"><a href="${artistUrl}" target="_blank">${card.artist}</a></div>
            `;
            // Add wild card animation
            this.elements.tableCard.classList.add('wild-card-played');
            setTimeout(() => {
                this.elements.tableCard.classList.remove('wild-card-played');
            }, 1000);
        } else if (card.isAce) {
            // Show Ace rank and suit before suit is chosen
            this.elements.tableCard.innerHTML = `
                <div class="card-info">
                    <span class="info-rank">${card.rank}</span>
                    <span class="info-suit">${card.suit}</span>
                </div>
                <div class="card-artist"><a href="${artistUrl}" target="_blank">${card.artist}</a></div>
            `;
            // Add wild card animation
            this.elements.tableCard.classList.add('wild-card-played');
            setTimeout(() => {
                this.elements.tableCard.classList.remove('wild-card-played');
            }, 1000);
        } else {
            // Show rank and suit for regular cards
            this.elements.tableCard.innerHTML = `
                <div class="card-info">
                    <span class="info-rank">${card.rank}</span>
                    <span class="info-suit">${card.suit}</span>
                </div>
                <div class="card-artist"><a href="${artistUrl}" target="_blank">${card.artist}</a></div>
            `;
        }

        // Render card stack (last 3 cards before current)
        this.renderCardStack(discardPile);
    }

    /**
     * Render the card stack in discard pile
     * @param {Array} discardPile - Full discard pile
     */
    renderCardStack(discardPile) {
        const stackEl = document.getElementById('cardStack');
        if (!stackEl) return;

        stackEl.innerHTML = '';

        const stackCount = Math.min(3, discardPile.length - 1);
        for (let i = 1; i <= stackCount; i++) {
            const prevCard = discardPile[discardPile.length - 1 - i];
            if (!prevCard) continue;

            const prevImageUrl = prevCard.imageUrl;
            const stackCard = document.createElement('div');
            stackCard.className = 'card';
            stackCard.style.backgroundImage = `url('${prevImageUrl}')`;
            stackCard.style.position = 'absolute';
            stackCard.style.zIndex = -i;

            // Slight offset and rotation for stacked cards
            const stackRotation = (Math.random() - 0.5) * 6;
            stackCard.style.transform = `translate(${i * -3}px, ${i * 2}px) rotate(${stackRotation}deg)`;
            stackCard.style.opacity = 0.3;

            stackEl.appendChild(stackCard);
        }
    }

    /**
     * Render player's hand
     * @param {Card[]} hand - Player's cards
     * @param {Function} setupCardHandlers - Callback to setup event handlers for each card
     * @returns {HTMLElement[]} Array of card elements
     */
    renderPlayerHand(hand, setupCardHandlers) {
        if (!this.elements.playerHand) return [];

        // Separate cards: Jokers first, then Aces, then regular cards
        const jokers = hand.filter((card) => card.isJoker);
        const aces = hand.filter((card) => card.isAce && !card.isJoker);
        const regularCards = hand.filter((card) => !card.isAce && !card.isJoker);

        const allSortedCards = [...jokers, ...aces, ...regularCards];

        const htmlContent = allSortedCards
            .map((card) => {
                const actualIndex = hand.indexOf(card);
                let className = 'hand-card';
                let content = '';

                if (card.isJoker) {
                    className += ' joker-card';
                    content = '<div class="card-rank joker-text">JOKER</div>';
                } else if (card.isAce) {
                    className += ' ace-card';
                    content = `<div class="card-rank">${card.rank}</div>`;
                } else {
                    content = `
                    <div class="card-rank">${card.rank}</div>
                    <div class="card-suit">${card.suit}</div>
                `;
                }

                return `<div class="${className}" data-card-index="${actualIndex}">${content}</div>`;
            })
            .join('');

        this.elements.playerHand.innerHTML = htmlContent;

        // Get all card elements for setup
        const cardElements = this.elements.playerHand.querySelectorAll('.hand-card');

        // Call setupCardHandlers for each card element
        if (setupCardHandlers) {
            cardElements.forEach((cardEl) => {
                const cardIndex = parseInt(cardEl.dataset.cardIndex, 10);
                setupCardHandlers(cardEl, cardIndex);
            });
        }

        return Array.from(cardElements);
    }

    /**
     * Render computer's hand (card backs)
     * @param {number} count - Number of cards in computer's hand
     */
    renderComputerHand(count) {
        if (!this.elements.opponentHand) return;

        this.elements.opponentHand.innerHTML = Array(count)
            .fill(null)
            .map(
                (_, index) => `
            <div class="card-back-small" data-card-index="${index}"></div>
        `
            )
            .join('');
    }
}
