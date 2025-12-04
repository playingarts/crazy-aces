/**
 * Game rules and validation logic
 */

export class GameRules {
    /**
     * Check if a card can be played on the current card
     */
    static canPlayCard(card, currentCard, jokerWasPlayed = false) {
        if (!card || !currentCard) return false;

        // Joker and Ace are wild cards
        if (card.isJoker || card.isAce) return true;

        // After a Joker, any card can be played
        if (jokerWasPlayed) return true;

        // Must match suit or rank
        return card.suit === currentCard.suit || card.rank === currentCard.rank;
    }

    /**
     * Determine if player has a playable card
     */
    static hasPlayableCard(hand, currentCard, jokerWasPlayed = false) {
        return hand.some(card =>
            this.canPlayCard(card, currentCard, jokerWasPlayed)
        );
    }

    /**
     * Get all playable cards from hand
     */
    static getPlayableCards(hand, currentCard, jokerWasPlayed = false) {
        return hand.filter(card =>
            this.canPlayCard(card, currentCard, jokerWasPlayed)
        );
    }

    /**
     * Check if game is over
     */
    static isGameOver(playerHand, computerHand) {
        return playerHand.length === 0 || computerHand.length === 0;
    }

    /**
     * Determine winner
     */
    static getWinner(playerHand, computerHand) {
        if (playerHand.length === 0) return 'player';
        if (computerHand.length === 0) return 'computer';
        return null;
    }

    /**
     * Sort hand by priority (Jokers, Aces, Regular cards)
     */
    static sortHand(hand) {
        return [...hand].sort((a, b) => {
            if (a.isJoker && !b.isJoker) return -1;
            if (!a.isJoker && b.isJoker) return 1;
            if (a.isAce && !b.isAce) return -1;
            if (!a.isAce && b.isAce) return 1;

            // Sort by suit then rank for regular cards
            if (a.suit !== b.suit) {
                const suitOrder = ['♠️', '♥️', '♦️', '♣️'];
                return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
            }

            const rankOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
            return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
        });
    }

    /**
     * AI strategy: Select best card to play
     */
    static selectBestCard(playableCards) {
        if (playableCards.length === 0) return null;

        // Prioritize regular cards over special cards
        const sorted = [...playableCards].sort((a, b) => {
            if (a.isJoker) return 1;
            if (b.isJoker) return -1;
            if (a.isAce) return 1;
            if (b.isAce) return -1;

            // Play lowest value card first
            const rankOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
            return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
        });

        return sorted[0];
    }

    /**
     * AI strategy: Choose suit for Ace/Joker
     */
    static chooseBestSuit(hand, availableSuits) {
        // Count cards by suit in hand
        const suitCounts = {};
        availableSuits.forEach(suit => { suitCounts[suit] = 0; });

        hand.forEach(card => {
            if (!card.isJoker && !card.isAce && availableSuits.includes(card.suit)) {
                suitCounts[card.suit]++;
            }
        });

        // Choose suit with most cards
        let bestSuit = availableSuits[0];
        let maxCount = 0;

        for (const [suit, count] of Object.entries(suitCounts)) {
            if (count > maxCount) {
                maxCount = count;
                bestSuit = suit;
            }
        }

        return bestSuit;
    }
}
