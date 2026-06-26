# Engine Boundary

## 1. Purpose

This document defines what the Game Engine Layer is and is not responsible for.

The engine must be:

- **World-agnostic** — no knowledge of story, NPC, or regional context
- **UI-agnostic** — no React imports, no DOM access, no animation timing
- **Platform-agnostic** — no Capacitor, no LocalStorage, no Android APIs
- **Deterministic where possible** — same inputs produce same outputs
- **Testable in isolation** — runnable without React, browser, Android, storage, ads, or content data

---

## 2. Engine Responsibilities

| Area | Responsibility | Notes |
|---|---|---|
| Cards | Card identity and rule-relevant metadata | Only data needed to apply rules; no image paths or story text |
| Cards | Deck creation | Builds the canonical 48-card deck from card definitions |
| Cards | Fair shuffle via injected `RandomProvider` | RNG is injected, not hardcoded, for testability |
| Cards | Initial hand and field distribution | Distributes cards according to `Ruleset` configuration |
| State | `GameState` creation | Produces the initial complete game snapshot |
| State | Turn state | Tracks whose turn it is and what phase the turn is in |
| Actions | Legal action calculation | Computes the set of valid `GameAction`s for the current state |
| Actions | Action validation | Rejects invalid actions before any state mutation |
| Actions | Action application | Mutates or produces a new `GameState` from a valid action |
| Capture | Card matching and capture resolution | Resolves which cards are captured based on month matching |
| Capture | Captured card grouping | Organizes captured cards into scoring categories (광, 열, 띠, 피) |
| Scoring | Score calculation | Computes score from captured card groups |
| Go/Stop | Go/Stop decision state | Detects threshold and enters pending-decision phase |
| End | Game end detection | Detects terminal conditions (Stop declared, etc.) |
| End | Final result calculation | Produces winner and final score summary |
| Events | `GameEvent[]` generation | Emits structured events after each action for UI and logging |
| Errors | Engine-level error result | Returns explicit rejection when an action is invalid |
| State | Serialization-friendly state shape | `GameState` contains only plain, serializable data |
| AI interface | AI-facing legal information | Exposes only what is legally visible to the AI |
| Rules | `Ruleset` option interpretation | Reads configuration options to apply variant rules |

---

## 3. Engine Non-Responsibilities

| Area | Not Responsible For | Owner Layer |
|---|---|---|
| UI | React rendering | UI Layer |
| UI | Animation timing and sequencing | UI Layer |
| UI | Sound and BGM playback | Platform Layer / UI Layer |
| UI | Background art | UI Layer / Content Layer |
| Content | NPC name, personality, story | Content Layer |
| Content | Region progression | Content Layer |
| Content | Dialogue | Content Layer |
| Content | Fortune and horoscope result | Content Layer |
| Content | Rewards and unlock conditions | Content Layer / Application Layer |
| Platform | Ads | Platform Layer |
| Platform | Analytics | Platform Layer |
| Platform | Capacitor and Android APIs | Platform Layer |
| Platform | LocalStorage and storage implementation | Platform Layer |
| Platform | Cloud save and account | Platform Layer |
| App | App navigation | Application Layer / UI Layer |
| App | App settings UI | UI Layer |
| App | App store release assets | Release pipeline |

---

## 4. Engine Inputs

The engine accepts the following inputs:

| Input | Description |
|---|---|
| Initial game config | Player count, game mode, and other startup parameters |
| `Ruleset` | Configuration object controlling which rules and thresholds are active |
| `RandomProvider` | Injected RNG source — allows fair randomness in production and deterministic testing |
| `GameAction` | A player's or AI's intent submitted by the Application Layer |
| Existing `GameState` | The current game snapshot when continuing from a prior state |
| Optional seed | For test and debug use only — never used to affect player outcomes |

**Important constraints:**
- RNG may be injected externally, but must never be used to manipulate win/loss outcomes.
- Seeds are for test reproducibility and replay only — not for production gameplay tuning.

---

## 5. Engine Outputs

| Output | Description |
|---|---|
| `NextGameState` | The complete updated game snapshot after action application |
| `GameEvent[]` | Structured list of events describing what happened during the action |
| `EngineError` / invalid action result | Explicit rejection returned when an action is invalid |
| `FinalResult` | Winner, final scores, and summary — emitted when the game ends |

The engine never directly modifies UI state. All UI updates are derived from `GameEvent[]` and `NextGameState` by the Application Layer.

---

## 6. GameState Boundary

### May be included in GameState

- Player list and player identifiers
- `currentTurn` — whose turn it is
- `phase` — what phase of the turn is active
- `deck` / `drawPile` — remaining cards
- `fieldCards` — cards currently on the field
- `playerHands` — each player's hand (hidden from opponent)
- `capturedCards` — each player's captured card collection
- `scoreState` — current scores per player
- `goStopState` — Go/Stop status and Go count
- `pendingDecision` — whether a Go/Stop choice is awaiting resolution
- Turn count or action history reference (if deterministic replay is needed later)
- `Ruleset` snapshot or ruleset ID
- Random state (only if deterministic replay is a requirement)

### Must not be included in GameState

- NPC story text or NPC identity
- Region name or region story
- BGM track key
- Background image path
- Ad state
- UI animation state
- React component state
- LocalStorage keys
- Analytics data

---

## 7. GameAction Boundary

Proposed `GameAction` types *(names only — no code)*:

```
START_GAME
PLAY_CARD
CHOOSE_GO
CHOOSE_STOP
AI_PLAY_CARD
RESOLVE_PENDING_DECISION    (if needed for multi-step decisions)
```

**Important distinctions:**
- A UI click event is **not** a `GameAction`.
- The Application Layer converts UI events into `GameAction`s before passing them to the engine.
- AI actions must go through the same validation path as player actions — there is no bypass.

---

## 8. GameEvent Boundary

Proposed `GameEvent` types *(names only — no code)*:

```
GAME_STARTED
CARD_PLAYED
CARD_MATCHED
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

**Important distinctions:**
- `GameEvent` is **not** an animation command.
- `GameEvent` expresses **facts about what happened in the game**, not instructions to the UI.
- The UI layer observes `GameEvent[]` and decides how to animate or react to each event.
- This design supports replay, logging, debugging, and automated testing independently of the UI.

---

## 9. Ruleset Boundary

`Ruleset` may express:

- Score threshold for Go/Stop decision trigger
- Which advanced rules are enabled or disabled
- Scoring multipliers
- Optional regional rule variants (after MVP)
- Optional match configuration (e.g., player count, deck variant)

In the MVP, only the default `Ruleset` with standard values is used. The `Ruleset` type is defined early even if only defaults are exercised.

**Forbidden:**
- `Ruleset` must not depend on a specific NPC name.
- `Ruleset` must not depend on story-specific conditions.
- `Ruleset` must not use favorable card distribution as a difficulty mechanism.

---

## 10. Randomness Boundary

- Shuffle uses fair, unbiased randomness.
- `RandomProvider` may be injected for testability.
- Seeded randomness is allowed only for tests, replays, debugging, and deterministic simulation.
- Production gameplay must not use RNG to favor or punish the player.
- Difficulty is controlled through AI strategy — never through card distribution.

---

## 11. AI Boundary

- In the MVP, the AI may live inside the engine module or an engine-adjacent module.
- AI receives only information that is legally visible under the current game state.
- AI selects from the set of legal actions returned by the engine.
- AI cannot bypass engine validation — all AI actions go through the same path as player actions.
- AI difficulty is strategy-based (heuristic or selection logic), not card-manipulation-based.
- AI must not read hidden player hand data unless the rules explicitly permit it.
- NPC personality AI and story-driven AI behavior are not part of the MVP.

---

## 12. Save/Load Boundary

- Engine state must be fully serializable (plain data, no class instances with private state).
- Engine does not perform persistence — it has no knowledge of storage APIs.
- The Application Layer decides when to trigger a save.
- The Platform Layer performs the actual read/write to storage.
- Save, unlock, and reward logic are not part of the MVP.

---

## 13. Boundary Violation Examples

### Bad — violations to reject in PR review

| Violation | Problem |
|---|---|
| `engine/scoring` imports NPC profile | Engine must not know about content |
| React component calculates score | Rules belong in the engine, not the UI |
| Engine calls `localStorage` directly | Storage is the Platform Layer's responsibility |
| Fortune result changes shuffle seed | Content must not affect engine randomness |
| Region-specific rule hardcoded inside capture logic | Rules must come from `Ruleset`, not from content identity |

### Good — correct patterns

| Pattern | Why it is correct |
|---|---|
| Application Layer maps NPC match config into a generic `Ruleset` | Engine receives only rule configuration, not content identity |
| Engine calculates score from captured card state only | Engine is self-contained |
| Platform Layer saves serialized `GameState` | Persistence is isolated from game logic |
| UI animates based on `GameEvent[]` | UI does not need to understand game rules to render feedback |

---

## 14. PR Review Checklist

Before merging any engine implementation PR, verify:

- [ ] Engine imports no UI modules.
- [ ] Engine imports no content data.
- [ ] Engine imports no platform APIs (Capacitor, LocalStorage, Ads).
- [ ] UI does not calculate rules or score.
- [ ] Application Layer orchestrates but does not duplicate engine rules.
- [ ] Randomness is fair and testable via `RandomProvider`.
- [ ] AI uses legal actions only and goes through standard validation.
- [ ] `GameState` contains no story, UI, or platform data.
- [ ] New content or story features do not require engine code changes to support.
