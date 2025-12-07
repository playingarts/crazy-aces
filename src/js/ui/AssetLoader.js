/**
 * AssetLoader - Handles image preloading for cards
 * Manages image caching and preloading to prevent blank cards
 */

export class AssetLoader {
    constructor() {
        // Image preloading cache
        this.preloadedImages = [];
        this.preloadedUrls = new Set();
        this.acesPreloaded = false; // Track if all Aces have been preloaded
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

            await Promise.all(urls.map((url) => this.preloadImage(url)));

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
        // Skip if already preloaded
        if (this.acesPreloaded) {
            console.log('✓ All Aces already preloaded, skipping');
            return;
        }

        try {
            console.log('🎴 Preloading all 4 Ace images (first time)...');
            const aceUrls = [
                'https://s3.amazonaws.com/img.playingarts.com/one-small-hd/ace-of-spades-iain-macarthur.jpg?2',
                'https://s3.amazonaws.com/img.playingarts.com/one-small-hd/ace-of-hearts-mr-kone.jpg?2',
                'https://s3.amazonaws.com/img.playingarts.com/one-small-hd/ace-of-diamonds-jordan-debney.jpg?2',
                'https://s3.amazonaws.com/img.playingarts.com/one-small-hd/ace-of-clubs-andreas-preis.jpg?2'
            ];
            await Promise.all(aceUrls.map((url) => this.preloadImage(url)));
            this.acesPreloaded = true; // Mark as preloaded
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
        try {
            if (card.imageUrl) {
                await this.preloadImage(card.imageUrl);
            }

            // If it's an Ace, preload all Aces
            if (card.isAce) {
                await this.preloadAllAces();
            }
        } catch (error) {
            // Continue anyway
        }
    }
}
