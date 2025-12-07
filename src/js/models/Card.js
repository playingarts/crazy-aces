/**
 * Card model representing a playing card
 */

import { GAME_CONFIG } from '../config/constants.js';
import { ARTIST_URL_SLUGS, CARD_IMAGE_FILENAMES } from '../config/cardData.js';

export class Card {
    constructor(rank, suit, artist) {
        this.rank = rank;
        this.suit = suit;
        this.artist = artist;
        this.isAce = rank === 'A';
        this.isJoker = rank === 'JOKER';
    }

    /**
     * Get the image URL for this card
     */
    get imageUrl() {
        const key = this.isJoker
            ? this.artist === 'Mike Friedrich'
                ? 'JOKER'
                : 'JOKER_2'
            : `${this.rank}${this.suit}`;

        const filename = CARD_IMAGE_FILENAMES[key];
        return filename ? `${GAME_CONFIG.URLS.BASE_IMAGE}${filename}` : '';
    }

    /**
     * Get the artist page URL
     */
    get artistUrl() {
        const slug = ARTIST_URL_SLUGS[this.artist];
        return slug ? `${GAME_CONFIG.URLS.CARD_INFO_BASE}${slug}` : GAME_CONFIG.URLS.CARD_INFO_BASE;
    }

    /**
     * Check if this card can be played on another card
     */
    canPlayOn(otherCard, jokerWasPlayed = false) {
        if (!otherCard) return false;

        // Joker and Ace are wild
        if (this.isJoker || this.isAce) return true;

        // After a Joker, any card can be played
        if (jokerWasPlayed) return true;

        // Must match suit or rank
        return this.suit === otherCard.suit || this.rank === otherCard.rank;
    }

    /**
     * Create a copy of this card
     */
    clone() {
        return new Card(this.rank, this.suit, this.artist);
    }

    /**
     * Serialize to JSON
     */
    toJSON() {
        return {
            rank: this.rank,
            suit: this.suit,
            artist: this.artist,
            isAce: this.isAce,
            isJoker: this.isJoker
        };
    }

    /**
     * Create from JSON
     */
    static fromJSON(json) {
        return new Card(json.rank, json.suit, json.artist);
    }

    /**
     * String representation
     */
    toString() {
        return this.isJoker ? `JOKER (${this.artist})` : `${this.rank}${this.suit}`;
    }
}
