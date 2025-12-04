/**
 * Game configuration constants
 */

export const GAME_CONFIG = {
    // Game rules
    INITIAL_HAND_SIZE: 7,
    NUM_JOKERS: 2,

    // Animation durations (ms)
    ANIMATION_DURATION: {
        CARD_DROP: 400,
        CARD_FLY_OUT: 250,
        CARD_SHRINK: 250,
        HINT_SHAKE: 600,
        HAND_RESIZE: 500
    },

    // Timing delays (ms)
    TIMEOUTS: {
        COMPUTER_TURN: 800,
        HINT_INITIAL: 5000,
        HINT_REPEAT: 5000,
        STATUS_MESSAGE: 1500,
        STATUS_MESSAGE_LONG: 2000,
        DRAW_MESSAGE: 1200,
        ANIMATION_DELAY: 400,
        GAME_END_DELAY: 500
    },

    // URLs
    URLS: {
        BASE_IMAGE: 'https://s3.amazonaws.com/img.playingarts.com/one-small-hd/',
        CARD_INFO_BASE: 'https://playingarts.com/one/',
        BACKSIDE_IMAGE: 'https://s3.amazonaws.com/img.playingarts.com/one-small-hd/_backside-evgeny-kiselev.jpg?2'
    },

    // Card dimensions
    CARD_SIZE: {
        MOBILE: { width: 168, height: 240 },
        TABLET: { width: 225, height: 322 },
        DESKTOP: { width: 255, height: 365 }
    },

    // Breakpoints
    BREAKPOINTS: {
        MOBILE: 480,
        TABLET: 768,
        DESKTOP: 1200
    },

    // Animation settings
    ANIMATION: {
        CARD_DROP_FROM_TOP: -100,
        CARD_DROP_FROM_BOTTOM: 100,
        EASING: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        CARD_ROTATION_RANGE: 6
    }
};

export const SUITS = {
    SPADES: '♠️',
    HEARTS: '♥️',
    DIAMONDS: '♦️',
    CLUBS: '♣️',
    JOKER: 'joker'
};

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const SUIT_NAMES = {
    [SUITS.SPADES]: 'spades',
    [SUITS.HEARTS]: 'hearts',
    [SUITS.DIAMONDS]: 'diamonds',
    [SUITS.CLUBS]: 'clubs',
    [SUITS.JOKER]: 'joker'
};

export const RANK_NAMES = {
    'A': 'ace',
    '2': 'two',
    '3': 'three',
    '4': 'four',
    '5': 'five',
    '6': 'six',
    '7': 'seven',
    '8': 'eight',
    '9': 'nine',
    '10': 'ten',
    'J': 'jack',
    'Q': 'queen',
    'K': 'king'
};
