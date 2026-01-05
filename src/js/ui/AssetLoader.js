/**
 * AssetLoader - Handles image preloading for cards
 * Manages image caching and preloading to prevent blank cards
 */

import { getCurrentEdition } from '../config/editions.js';

export class AssetLoader {
    constructor() {
        // Image preloading cache
        this.preloadedImages = [];
        this.preloadedUrls = new Set();
        this.acesPreloadedForEdition = null; // Track which edition's Aces have been preloaded
        this.currentEditionId = null; // Track current edition for cache invalidation
    }

    /**
     * Clear the preload cache (called when edition changes)
     * NOTE: We keep preloadedImages to prevent garbage collection of loaded images
     * Only clear the URL tracking so new edition URLs get preloaded
     */
    clearCache() {
        // DON'T clear preloadedImages - they keep images in browser memory
        // this.preloadedImages = [];
        this.preloadedUrls.clear();
        this.acesPreloadedForEdition = null;
    }

    /**
     * Check and clear cache if edition changed
     * @param {string} editionId - Current edition ID
     */
    checkEditionChange(editionId) {
        if (this.currentEditionId && this.currentEditionId !== editionId) {
            console.log('🔄 Edition changed, clearing preload cache');
            this.clearCache();
        }
        this.currentEditionId = editionId;
    }

    /**
     * Preload an image
     * @param {string} url - Image URL
     * @returns {Promise<void>}
     */
    preloadImage(url) {
        if (!url) {
            return Promise.resolve();
        }

        if (this.preloadedUrls.has(url)) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const img = new Image();
            // DON'T set crossOrigin - S3 bucket doesn't have CORS headers
            // Without crossOrigin, images cache normally and CSS can use them
            img.loading = 'eager';
            img.decoding = 'async';

            img.onload = () => {
                this.preloadedUrls.add(url);
                this.preloadedImages.push(img);
                resolve();
            };
            img.onerror = (err) => {
                console.warn('Image preload failed for:', url, err);
                this.preloadedUrls.add(url); // Mark as attempted
                resolve(); // Resolve anyway to not block
            };
            img.src = url;

            if (img.complete && img.naturalWidth > 0) {
                this.preloadedUrls.add(url);
                this.preloadedImages.push(img);
                resolve();
            }
        });
    }

    /**
     * Preload all images for a hand of cards
     * @param {Card[]} hand - Array of cards
     * @returns {Promise<void>}
     */
    async preloadHandImages(hand) {
        try {
            const urls = [];
            let hasAce = false;

            hand.forEach((card) => {
                if (card.imageUrl) urls.push(card.imageUrl);
                if (card.isAce) hasAce = true;
            });

            console.log('🎴 Preloading hand images:', urls.length, 'cards');
            await Promise.all(urls.map((url) => this.preloadImage(url)));
            console.log('✅ Hand preloading complete, cached URLs:', this.preloadedUrls.size);

            // If any card is an Ace, preload all 4 Aces (since Aces can change suit)
            if (hasAce) {
                await this.preloadAllAces();
            }
        } catch (error) {
            // Continue anyway - images will load on demand
        }
    }

    /**
     * Preload all four Aces (since Aces can change suit)
     * @returns {Promise<void>}
     */
    async preloadAllAces() {
        const edition = getCurrentEdition();

        // Skip if already preloaded for this edition
        if (this.acesPreloadedForEdition === edition.id) {
            console.log('✓ All Aces already preloaded for', edition.name);
            return;
        }

        try {
            console.log('🎴 Preloading all 4 Ace images for', edition.name);
            const suits = ['♠', '♥', '♦', '♣'];
            const aceUrls = suits.map((suit) => {
                const key = `A${suit}`;
                const filename = edition.cardFilenames[key];
                return `${edition.baseUrl}${filename}`;
            });
            await Promise.all(aceUrls.map((url) => this.preloadImage(url)));
            this.acesPreloadedForEdition = edition.id;
            console.log('✅ All 4 Ace images preloaded successfully');
        } catch (error) {
            console.error('❌ Failed to preload Ace images:', error);
        }
    }

    /**
     * Preload card when drawn from deck
     * @param {Card} card - Card to preload
     * @returns {Promise<void>}
     */
    async preloadCardOnDraw(card) {
        // Don't block on preloading - render immediately and load in background
        try {
            if (card.imageUrl) {
                this.preloadImage(card.imageUrl).catch(() => {});
            }

            // If it's an Ace, preload all Aces in background (don't block)
            if (card.isAce) {
                this.preloadAllAces().catch(() => {});
            }
        } catch (error) {
            // Continue anyway
        }
    }
}
