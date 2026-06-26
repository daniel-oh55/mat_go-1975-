# Data Flow

## 1. Purpose

This document defines how data moves through the system from the moment a user starts a game until the game ends. It covers the player turn, AI turn, Go/Stop decision, game end, save/load direction, and event-driven UI direction.

---

## 2. High-Level Flow

### Player action

```
User Input
→ UI Layer
→ Application Layer
→ Game Engine
→ NextGameState + GameEvent[]
→ Application Layer
→ UI View State
→ UI Render
```

### AI turn

```
GameState
→ Application Layer
→ AI Strategy
→ GameAction
→ Game Engine
→ NextGameState + GameEvent[]
→ Application Layer
→ UI View State
→ UI Render
```

---

## 3. New Game Flow

1. User selects **Start Game**.
2. UI requests a new game through the Application Layer.
3. Application Layer prepares MVP game configuration (ruleset, player count, AI difficulty).
4. Engine creates the initial deck from card definitions.
5. Engine shuffles the deck using fair randomness.
6. Engine deals hands and places field cards.
7. Engine returns initial `GameState` and `GameEvent[]` (e.g., `GAME_STARTED`).
8. Application Layer converts the result into UI view state.
9. UI renders: player hand, field cards, deck count, score indicators, and current turn marker.

---

## 4. Player Turn Flow

1. Application Layer derives the set of legal actions from `GameState`.
2. UI displays which cards the player can legally select.
3. User selects a card.
4. UI sends the player's intent to the Application Layer.
5. Application Layer converts intent into a `GameAction`.
6. Application Layer submits `GameAction` to the Engine.
7. Engine validates the action against current `GameState` and `Ruleset`.
8. Engine applies the action and resolves card capture.
9. Engine recalculates score.
10. Engine returns `NextGameState` and `GameEvent[]`.
11. Application Layer updates UI view state.
12. If a Go/Stop decision is required, UI displays the decision prompt (see Section 6).
13. If the turn passes to the AI, Application Layer starts the AI Turn Flow (see Section 5).

---

## 5. AI Turn Flow

**Principles:**

- AI receives only information that is legally visible in the current game state.
- AI selects only from the set of legal actions returned by the Engine.
- AI must never bypass engine validation — all AI actions go through the same validation path as player actions.
- AI difficulty is implemented through decision strategy, not through card manipulation or favorable randomness.
- MVP AI only needs to complete a valid full game. It does not need to play optimally.

**Flow:**

1. Application Layer detects that the current turn belongs to the AI.
2. Application Layer requests the set of legal actions from the Engine.
3. AI Strategy selects one action from the legal action set.
4. Application Layer submits the selected `GameAction` to the Engine.
5. Engine validates and applies the action.
6. Engine returns `NextGameState` and `GameEvent[]`.
7. Application Layer updates UI view state.
8. UI renders AI action result (card played, captures, score update).

---

## 6. Go/Stop Flow

1. Engine detects that the current player's score has reached the Go/Stop decision threshold.
2. Engine emits a decision-required event (e.g., `GO_STOP_DECISION_REQUIRED`).
3. Application Layer updates UI view state to reflect the pending decision.
4. UI displays the Go/Stop choice to the player (or triggers AI strategy if it is the AI's decision).
5. Player (or AI) selects Go or Stop.
6. Application Layer sends the decision back to the Engine as a `GameAction`.
7. Engine applies the decision:
   - **Go**: Game continues. Score multiplier may increase depending on ruleset.
   - **Stop**: Game ends. Engine finalizes scores and returns `GAME_ENDED`.

---

## 7. Game End Flow

1. Engine detects a game-ending condition (Stop declared, three-Go rule triggered, bust, or other terminal condition per ruleset).
2. Engine finalizes scores.
3. Engine emits `GAME_ENDED` event with final result data (winner, final scores, round summary).
4. Application Layer converts the final result into a UI result view state.
5. UI displays the result screen: winner, scores, and game summary.
6. Save, unlock, and reward handling are **deferred to later milestones** — they are not part of the MVP engine phase.

---

## 8. Save/Load Flow Direction

Save and load will not be implemented in the MVP. The direction is documented here so implementation follows the correct boundaries when the time comes.

**Direction:**

- Engine produces a fully serializable `GameState` at all times.
- The Application Layer decides when to trigger a save (e.g., after each turn, on app pause).
- The Platform Layer performs the actual persistence (e.g., Capacitor Storage, AsyncStorage).
- Engine never calls `localStorage`, `Capacitor.Plugins`, or any storage API directly.
- On load, the Platform Layer returns a serialized state, the Application Layer deserializes and validates it, and passes the restored `GameState` to the Engine.

---

## 9. Event-Driven UI Direction

**Principles:**

- The Engine returns `GameEvent[]` alongside `NextGameState` after every action.
- UI animations, sounds, and visual feedback are driven by `GameEvent[]`, not by diffing state.
- The Engine has no knowledge of how animations look or how long they take.
- This design supports future use cases: replay systems, debug logs, action history, and automated testing.

**Proposed event names** *(names only — no code in this document)*:

```
GAME_STARTED
CARD_PLAYED
DECK_CARD_REVEALED
CARD_CAPTURED
SCORE_CHANGED
GO_STOP_DECISION_REQUIRED
GO_DECLARED
STOP_DECLARED
TURN_CHANGED
GAME_ENDED
INVALID_ACTION_REJECTED
```

These names are subject to change during implementation. They are listed here to establish shared vocabulary across UI, Application, and Engine layers.

---

## 10. Failure Handling Direction

- Invalid actions are detected and rejected by the Engine before any state mutation occurs.
- The Engine returns an explicit rejection result (e.g., `INVALID_ACTION_REJECTED` event) rather than throwing silently.
- The Application Layer decides how to present the rejection to the player (e.g., show an error indicator, re-enable selection).
- UI must not assume an action is valid before the Engine confirms it. UI feedback for an action is always based on Engine response, not on optimistic assumptions.
- Engine errors must be explicit, typed, and independently testable without a UI or platform environment.
