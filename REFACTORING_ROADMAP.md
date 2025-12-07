# Crazy Aces - Refactoring Roadmap

## Completed

### Week 1: Initial Development
- ✅ Core game mechanics implemented
- ✅ Basic UI and animations
- ✅ Win streak and discount system
- ✅ EmailJS integration

### Week 2: Modular Architecture Refactoring
- ✅ Converted monolithic code to ES6 modules
- ✅ Created GameState, GameEngine, GameUI, Game classes
- ✅ Separated models (Card, Deck) from logic
- ✅ Organized into folders: models/, services/, ui/, config/
- ✅ Fixed all bugs from refactoring (8 critical logic errors)
- ✅ Fixed duplicate Ace images bug
- ✅ Fixed turn locking issues

---

## To Do

### Week 3: Remove Global Functions + Split GameUI
**Priority: CRITICAL**

#### 1. Implement Event Delegation Pattern
- ✅ Create EventController or extend GameUI with event delegation
- ✅ Replace all `window.*` global functions with event listeners
- ✅ Update HTML to use `data-action` attributes instead of `onclick`
- ✅ Remove all 10 global function exports from main.js

**Files to modify:**
- `src/js/main.js` - Remove window.* exports
- `src/js/ui/GameUI.js` - Add event delegation
- `index.html` - Replace onclick with data-action

#### 2. Split GameUI into Smaller Classes (1015 lines → 366 lines)
- ✅ Create `CardRenderer.js` - Handle card rendering logic (228 lines)
- ✅ Create `AnimationController.js` - Manage all animations (177 lines)
- ✅ Create `DragDropHandler.js` - Handle drag & drop interactions (246 lines)
- ✅ Create `AssetLoader.js` - Image preloading (116 lines)
- ✅ Create `GameOverView.js` - Game over screen (127 lines)
- ✅ Refactor GameUI to orchestrate these classes (366 lines - 64% reduction!)

**New file structure:**
```
ui/
  ├── GameUI.js           (366 lines) - Orchestrator ✅
  ├── CardRenderer.js     (228 lines) - Render cards ✅
  ├── AnimationController.js (177 lines) - Animations ✅
  ├── DragDropHandler.js  (246 lines) - Drag & drop ✅
  ├── AssetLoader.js      (116 lines) - Image loading ✅
  └── GameOverView.js     (127 lines) - Game over UI ✅
```

---

### Week 4: Fix State Mutations + Add Error Handling
**Priority: HIGH**

#### 1. Implement Immutable Card Transformation
- [ ] Create `TransformedCard` class extending Card
- [ ] Replace direct card mutation with `card.transform(suit)`
- [ ] Remove `_originalSuit` runtime property additions
- [ ] Update GameEngine and Game to use TransformedCard

**Files to modify:**
- `src/js/models/Card.js` - Add TransformedCard class
- `src/js/services/GameEngine.js` - Use transform() method
- `src/js/services/Game.js` - Use transform() method

#### 2. Implement Error Handling System
- [ ] Create `ErrorHandler` class
- [ ] Add user-friendly error messages
- [ ] Add error logging/monitoring
- [ ] Update all try-catch blocks to use ErrorHandler

**New files:**
- `src/js/services/ErrorHandler.js`

#### 3. Move DOM Manipulation from Game to GameUI
- [ ] Create `resetHandOpacity()` method in GameUI
- [ ] Remove all `document.querySelector()` from Game.js
- [ ] Ensure Game.js only calls UI methods, never touches DOM

---

### Week 5: Add Testing Infrastructure
**Priority: MEDIUM**

#### 1. Setup Testing Framework
- [ ] Install Vitest: `npm install --save-dev vitest`
- [ ] Install Testing Library: `npm install --save-dev @testing-library/dom`
- [ ] Add test script to package.json
- [ ] Create test directory structure

#### 2. Write Unit Tests (Target: 80% coverage)
- [ ] Test GameEngine.canPlayCard() logic
- [ ] Test GameState state mutations
- [ ] Test Card model methods
- [ ] Test Deck shuffle, draw, etc.
- [ ] Test GameEngine.chooseBestSuitForComputer() AI
- [ ] Test win condition logic

**New file structure:**
```
tests/
  ├── models/
  │   ├── Card.test.js
  │   └── Deck.test.js
  ├── services/
  │   ├── GameEngine.test.js
  │   ├── GameState.test.js
  │   └── Game.test.js
  └── ui/
      └── CardRenderer.test.js
```

---

### Week 6: State Machine + Dependency Injection
**Priority: MEDIUM**

#### 1. Implement Turn State Machine
- [ ] Create `TurnStateMachine` class
- [ ] Define states: PLAYER_TURN, COMPUTER_TURN, WAITING_SUIT_SELECTION, DRAWING, GAME_OVER
- [ ] Replace boolean flags with state machine transitions
- [ ] Add state transition validation

**New files:**
- `src/js/services/TurnStateMachine.js`

**Files to modify:**
- `src/js/services/GameState.js` - Use state machine
- `src/js/services/Game.js` - Use state machine

#### 2. Add Dependency Injection
- [ ] Refactor Game constructor to accept dependencies
- [ ] Refactor GameEngine constructor to accept dependencies
- [ ] Refactor GameUI constructor to accept dependencies
- [ ] Update main.js to inject dependencies
- [ ] Makes testing much easier

---

## Future Enhancements (Week 7+)

### TypeScript Migration
- [ ] Add TypeScript to project
- [ ] Convert JavaScript files to TypeScript
- [ ] Add type definitions for all classes
- [ ] Add strict type checking

### Event Bus Pattern
- [ ] Create EventBus class
- [ ] Replace tight coupling with event emission
- [ ] Subscribe to events instead of direct method calls

### Command Pattern (Undo/Replay)
- [ ] Implement Command pattern for actions
- [ ] Store command history
- [ ] Add undo/redo functionality
- [ ] Add game replay feature

### Performance Optimizations
- [ ] Use requestAnimationFrame for animations
- [ ] Debounce rapid clicks
- [ ] Lazy load card images
- [ ] Virtual scrolling for large lists

---

## Code Quality Metrics

| Metric | Current | Week 3 Target | Week 6 Target |
|--------|---------|---------------|---------------|
| Largest file | 955 lines | <300 lines | <250 lines |
| Global functions | 10 | 0 | 0 |
| Test coverage | 0% | 40% | 80% |
| Code duplication | High | Medium | Low |
| Cyclomatic complexity | High | Medium | <10 per function |

---

## Current Architecture

```
src/js/
├── config/
│   ├── constants.js
│   ├── cardData.js
│   └── gameRules.js
├── models/
│   ├── Card.js
│   └── Deck.js
├── services/
│   ├── Game.js (526 lines)
│   ├── GameEngine.js (296 lines)
│   └── GameState.js (213 lines)
├── ui/
│   └── GameUI.js (955 lines) ⚠️ TOO LARGE
└── main.js (394 lines) ⚠️ Global pollution
```

---

## Target Architecture (Week 6)

```
src/js/
├── config/
│   ├── constants.js
│   ├── cardData.js
│   └── gameRules.js
├── models/
│   ├── Card.js
│   ├── TransformedCard.js ⭐ NEW
│   └── Deck.js
├── services/
│   ├── Game.js (~400 lines)
│   ├── GameEngine.js (~250 lines)
│   ├── GameState.js (~200 lines)
│   ├── TurnStateMachine.js ⭐ NEW
│   ├── ErrorHandler.js ⭐ NEW
│   └── EventController.js ⭐ NEW
├── ui/
│   ├── GameUI.js (~200 lines)
│   ├── CardRenderer.js ⭐ NEW
│   ├── AnimationController.js ⭐ NEW
│   ├── DragDropHandler.js ⭐ NEW
│   ├── AssetLoader.js ⭐ NEW
│   └── GameOverView.js ⭐ NEW
├── main.js (~200 lines, no globals)
└── tests/ ⭐ NEW
    ├── models/
    ├── services/
    └── ui/
```

---

## Critical Issues Summary

1. ❌ **10 global functions polluting window object** → Week 3
2. ❌ **GameUI.js too large (955 lines)** → Week 3
3. ❌ **Direct DOM manipulation in Game controller** → Week 4
4. ❌ **Card state mutation antipattern** → Week 4
5. ❌ **No unit tests (0% coverage)** → Week 5
6. ❌ **Boolean flags instead of state machine** → Week 6
7. ❌ **No dependency injection** → Week 6

---

## Notes

- Each week builds on the previous week's improvements
- All bugs are currently fixed - focus on structural quality
- Code works correctly but needs better architecture for maintainability
- Current grade: **B-**
- Target grade: **A** (production-ready)
