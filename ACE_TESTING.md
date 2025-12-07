# Ace Card Testing Plan

## Fixes Applied
1. **No Card Mutation**: Cards are never mutated - they retain their original suit and rank
2. **State-Only Updates**: Only game state (`currentSuit`, `currentRank`) is updated
3. **Correct Image Rendering**: Table shows Ace of the CHOSEN suit, not original suit
4. **Suit Uniqueness**: Discard pile is checked BEFORE adding card to prevent duplicate Aces
5. **Player Suit Selector**: Disables suits whose Aces are already in discard pile
6. **Computer AI**: Excludes suits whose Aces are already in discard pile

## Test Scenarios

### Scenario 1: Player Plays First Ace
**Steps:**
1. Start new game
2. Wait until you get an Ace in your hand
3. Play the Ace

**Expected Results:**
- ✓ Suit selector modal appears
- ✓ All 4 suits (♠ ♥ ♦ ♣) are available (not grayed out)
- ✓ Can click any suit

**What to Check:**
- No suits should be disabled
- Console should show: `[getPlayedAceSuits] Aces in discard pile: []`

### Scenario 2: Player Chooses Suit
**Steps:**
1. After playing Ace, choose a suit (e.g., Clubs ♣)

**Expected Results:**
- ✓ Table shows Ace of CHOSEN suit (Ace of Clubs image), NOT original Ace suit
- ✓ Can play any Clubs card on top
- ✓ Can play any rank that matches 'A'
- ✓ Can play another Ace
- ✓ Can play a Joker

**What to Check:**
- Console should show: `[Computer Ace] State updated:` with correct `currentSuit`
- Image on table should match chosen suit

### Scenario 3: Player Plays Second Ace
**Steps:**
1. After first Ace is played (e.g., Ace of Spades)
2. Get another Ace in hand
3. Play the second Ace

**Expected Results:**
- ✓ Suit selector modal appears
- ✓ First Ace's suit is DISABLED (grayed out, unclickable)
- ✓ Other 3 suits are still available

**What to Check:**
- Console should show: `[getPlayedAceSuits] Aces in discard pile: ['♠']` (or whichever suit)
- First Ace's suit button should have `opacity: 0.3` and `pointer-events: none`

### Scenario 4: Player Plays All Four Aces
**Steps:**
1. Play all 4 Aces one by one (may need to restart game multiple times)
2. Choose different suits each time

**Expected Results:**
- ✓ After 1st Ace: 3 suits available
- ✓ After 2nd Ace: 2 suits available
- ✓ After 3rd Ace: 1 suit available
- ✓ After 4th Ace: Can't play another Ace (deck only has 4 Aces)

### Scenario 5: Computer Plays Ace
**Steps:**
1. Play game until computer has an Ace
2. Let computer play the Ace

**Expected Results:**
- ✓ Computer automatically chooses a suit (the suit it has most cards in)
- ✓ Table shows Ace of the CHOSEN suit
- ✓ Console shows: `[Computer Ace] Played:` with card details
- ✓ Console shows: `[Computer Ace] State updated:` with chosen suit
- ✓ Card object still shows `cardIsAce: true` and `cardStillOriginalSuit: [original]`

**What to Check:**
- Computer should NOT choose a suit whose Ace is already in discard pile
- Console should show: `[chooseBestSuitForComputer] Available suits:` (excluding played Ace suits)

### Scenario 6: Computer Plays Second Ace
**Steps:**
1. Let computer play first Ace (e.g., chooses Spades)
2. Let computer play second Ace

**Expected Results:**
- ✓ Computer doesn't choose Spades again
- ✓ Console shows: `[chooseBestSuitForComputer] Available suits: ['♥', '♦', '♣']` (or similar, excluding ♠)
- ✓ Computer chooses from remaining suits only

### Scenario 7: Visual Regression
**Steps:**
1. Play an Ace of Hearts
2. Choose Diamonds suit
3. Observe table card

**Expected Results:**
- ✓ Table shows: Ace of DIAMONDS (not Ace of Hearts)
- ✓ Can play Diamond cards on top
- ✓ Cannot play Hearts cards (unless they match rank 'A')

### Scenario 8: Joker Then Ace
**Steps:**
1. Play a Joker (any card can follow)
2. Play an Ace as the next card

**Expected Results:**
- ✓ Ace is playable (Aces are always wild)
- ✓ Suit selector appears
- ✓ Choose suit works correctly
- ✓ Table shows Ace of chosen suit

### Scenario 9: Card Validation After Ace
**Steps:**
1. Play Ace of Spades
2. Choose Clubs suit
3. Try to play a Spades card (non-Ace)

**Expected Results:**
- ✓ Spades card is NOT playable (should show error or be unclickable)
- ✓ Clubs card IS playable
- ✓ Any Ace IS playable
- ✓ Joker IS playable

## Debug Console Logs to Verify

### Player Plays Ace:
```
[getPlayedAceSuits] Aces in discard pile: []  (or ['♠'] if one already played)
```

### Computer Plays Ace:
```
[Computer Ace] Played: {cardRank: 'A', cardSuit: '♥', cardIsAce: true, chosenSuit: '♣'}
[Computer Ace] State updated: {currentSuit: '♣', currentRank: 'A', cardStillAce: true, cardStillOriginalSuit: '♥'}
```

### Computer Chooses Suit:
```
[chooseBestSuitForComputer] Available suits: ['♥', '♦', '♣']  (excludes played Ace suits)
[chooseBestSuitForComputer] Chose: ♣
```

### Card Validation:
```
[canPlayCard] {cardToPlay: '5♣', cardIsAce: false, currentSuit: '♣', currentRank: 'A', suitMatches: true, rankMatches: false, result: true}
```

## Known Issues to Watch For
- ❌ Card mutation (card.isAce becoming false)
- ❌ Wrong image on table (original suit instead of chosen suit)
- ❌ Duplicate Aces in discard pile
- ❌ Computer choosing already-played Ace suit
- ❌ Suit selector showing wrong disabled suits

## Success Criteria
All test scenarios pass without errors, and debug console logs show:
1. Cards are never mutated (isAce stays true)
2. Correct suits are disabled in selector
3. Computer AI excludes played Ace suits
4. Table shows correct Ace image (chosen suit, not original)
5. Card validation works correctly after Ace is played
