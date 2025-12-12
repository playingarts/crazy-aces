/**
 * Card model representing a playing card
 */

import { getCurrentEdition } from '../config/editions.js';

export class Card {
    constructor(rank, suit, artist) {
        this.rank = rank;
        this.suit = suit;
        this.artist = artist;
        this.isAce = rank === 'A';
        this.isJoker = rank === 'JOKER';
    }

    /**
     * Get the image URL for this card using current edition
     */
    get imageUrl() {
        const edition = getCurrentEdition();
        const key = this.isJoker
            ? this.jokerIndex === 1
                ? 'JOKER'
                : 'JOKER_2'
            : `${this.rank}${this.suit}`;

        const filename = edition.cardFilenames[key];
        return filename ? `${edition.baseUrl}${filename}` : '';
    }

    /**
     * Get the artist page URL using current edition
     */
    get artistUrl() {
        const edition = getCurrentEdition();
        const key = this.isJoker
            ? this.jokerIndex === 1
                ? 'JOKER'
                : 'JOKER_2'
            : `${this.rank}${this.suit}`;

        // Check for URL override first
        if (edition.cardArtistUrls && edition.cardArtistUrls[key]) {
            return `${edition.infoUrl}${edition.cardArtistUrls[key]}`;
        }

        // Fall back to deriving from filename
        const filename = edition.cardFilenames[key];
        if (!filename) return edition.infoUrl;

        const artistSlug = filename
            .replace(/\.(?:jpg|gif).*$/, '')
            .replace(/^(?:\d+|ace|jack|queen|king)-of-(?:spades|hearts|diamonds|dimonds|clubs)-/, '')
            .replace(/^joker-(?:\d-)?/, '');

        return artistSlug ? `${edition.infoUrl}${artistSlug}` : edition.infoUrl;
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
        const card = new Card(this.rank, this.suit, this.artist);
        card.jokerIndex = this.jokerIndex;
        return card;
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
            isJoker: this.isJoker,
            jokerIndex: this.jokerIndex
        };
    }

    /**
     * Create from JSON
     */
    static fromJSON(json) {
        const card = new Card(json.rank, json.suit, json.artist);
        card.jokerIndex = json.jokerIndex;
        return card;
    }

    /**
     * String representation
     */
    toString() {
        return this.isJoker ? `JOKER (${this.artist})` : `${this.rank}${this.suit}`;
    }
}
