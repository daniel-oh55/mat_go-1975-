# PR Plan

## 1. Purpose

This document defines how Milestone 2 implementation work is divided into small, reviewable PRs.

Each PR must do one thing. Engine PRs must be small, testable, and reviewable independently. No PR should mix UI work with engine work, or content work with rule implementation.

---

## 2. PR Principles

- One PR does one thing.
- Engine implementation PRs must be small.
- Tests are added with the feature in the same PR where possible.
- UI work must not begin before the core engine game loop is testable.
- Content work must not begin before engine validation is complete.
- PRs that violate the dependency direction in `docs/01_architecture.md` must be rejected.
- PRs that introduce out-of-scope features (story, NPC, ads, platform) during Milestone 2 must be rejected.

---

## 3. Milestone 2 Proposed PRs

### M2-PR1 — Engine Types and Card Model

**Goal:** Establish the shared vocabulary of the engine before any logic is written.

| Deliverable | Notes |
|---|---|
| Card type definition | `cardId`, `month`, `type`, `name`, `scoreRole` — no image paths or story data |
| `PlayerId` type | Identifies a player without carrying UI or content data |
| `CardZone` concept | Defines the zones a card can occupy: hand, field, draw pile, captured |
| `Ruleset` base type | Configuration object with default values; extended later |
| `GameEvent` name constants | Based on names in `docs/03_engine_boundary.md` |
| `GameAction` name constants | Based on names in `docs/03_engine_boundary.md` |

**Constraints:** Minimal rule logic. Types and constants only.

---

### M2-PR2 — Deck Creation and Shuffle

**Goal:** Build and verify the 48-card deck and fair shuffle.

| Deliverable | Notes |
|---|---|
| 48-card deck builder | All 12 months × 4 cards; no duplicates |
| Deck integrity validation | Assert exactly 48 unique cards |
| `RandomProvider` interface | Injectable RNG; production + seeded test implementations |
| Shuffle implementation | Uses `RandomProvider`; Fisher-Yates or equivalent |
| Shuffle integrity tests | No duplicates, no missing cards, deterministic with seed |

**Dependency:** Requires M2-PR1 card types.

---

### M2-PR3 — Initial Game State and Distribution

**Goal:** Create a valid starting `GameState` from a shuffled deck.

| Deliverable | Notes |
|---|---|
| `newGame()` function | Accepts game config and `Ruleset`; returns initial `GameState` |
| Hand / field / draw pile distribution | Based on counts confirmed in OD-1 |
| Total card invariant validation | Hand + field + draw pile must equal 48 |
| Initial `GameState` structure | All required fields present; no story or UI data |
| Distribution tests | Correct counts, no card appears in two zones |

**Dependency:** Requires M2-PR2. **Requires OD-1 to be resolved first.**

---

### M2-PR4 — Legal Actions and Turn State

**Goal:** Determine what actions are legal in the current game state.

| Deliverable | Notes |
|---|---|
| `currentTurn` management | Track whose turn it is |
| Turn `phase` | What part of the turn is active (play card, reveal, decision, etc.) |
| Legal action calculation | Returns valid `GameAction[]` for the current state |
| Invalid action rejection | Rejects actions before state mutation |
| Turn validation tests | Only current player can act; invalid actions rejected |

**Dependency:** Requires M2-PR3.

---

### M2-PR5 — Card Play and Capture Resolution

**Goal:** Implement the core turn mechanic.

| Deliverable | Notes |
|---|---|
| `PLAY_CARD` action application | Player selects card from hand; engine processes it |
| Field matching (played card) | Match by month; 0 / 1 / 2+ field card cases |
| Deck reveal and matching | Reveal top draw pile card; match against field |
| Capture resolution | Move matched cards to captured zone |
| Captured card grouping | Organize into 광 / 열 / 띠 / 피 categories |
| Card zone invariant tests | Total = 48; no card in two zones |

**Dependency:** Requires M2-PR4. **Requires OD-2 to be resolved first.**

---

### M2-PR6 — Basic Scoring and Go/Stop Trigger

**Goal:** Calculate score from captured cards and detect when Go/Stop is required.

| Deliverable | Notes |
|---|---|
| Score calculation from captured groups | Based on score table confirmed in OD-3 |
| `SCORE_CHANGED` event emission | After each capture that changes score |
| Go/Stop threshold detection | Trigger when score reaches threshold from OD-4 |
| `GO_STOP_DECISION_REQUIRED` event | Emitted when decision is needed |
| `pendingDecision` state | Blocks normal card play until resolved |
| Scoring tests | Correct score for known captured card sets |

**Dependency:** Requires M2-PR5. **Requires OD-3 and OD-4 to be resolved first.**

---

### M2-PR7 — Go/Stop Handling and Game End

**Goal:** Handle the Go/Stop decision and detect game end.

| Deliverable | Notes |
|---|---|
| `CHOOSE_GO` action handling | Game continues; Go count increments |
| `CHOOSE_STOP` action handling | Game ends; final result calculated |
| Go multiplier (if applicable) | Based on OD-5 |
| Game end detection | Stop declared or other terminal condition |
| `FinalResult` production | Winner, final scores, summary |
| `GAME_ENDED` event | Emitted with final result data |
| Post-end action rejection | All actions rejected after game ends |
| Game end tests | Stop → correct result; further actions rejected |

**Dependency:** Requires M2-PR6. **Requires OD-5 to be resolved first.**

---

### M2-PR8 — Basic AI Legal Action Strategy

**Goal:** Implement an AI opponent that can complete a valid game.

| Deliverable | Notes |
|---|---|
| Random legal action AI | Selects uniformly from legal action set |
| AI cannot bypass validation | All AI actions go through standard engine validation |
| AI Go/Stop decision | Default: Stop if winning, Stop if uncertain |
| AI information access | Only what is legally visible per `GameState` |
| AI tests | Always legal, never out-of-turn, handles Go/Stop |

**Dependency:** Requires M2-PR7. Follows `docs/07_ai_design.md`.

---

### M2-PR9 — Headless Full Game Simulation

**Goal:** Prove the complete engine loop works end-to-end without any UI.

| Deliverable | Notes |
|---|---|
| Headless game runner | AI vs. player game from start to finish; no UI required |
| Repeated deterministic simulation | Same seed → same result |
| No infinite loop validation | Game terminates within bounded turn count |
| No invalid AI action across simulations | AI always legal across many games |
| Final state consistency | Total cards = 48; game ended state correct |
| Simulation test suite | Passes as part of CI / test run |

**Dependency:** Requires M2-PR8. **Requires OD-6 to be resolved first.**

---

## 4. Open Decisions To Resolve Before Milestone 2

These are the Open Decisions from `docs/04_game_rule_spec.md`, with the required resolution deadline for each.

| ID | Decision | Must be resolved before | Priority |
|---|---|---|---|
| OD-1 | Exact initial deal counts (hand / field / draw pile) | M2-PR3 | High |
| OD-2 | Multiple same-month field card handling | M2-PR5 | High |
| OD-3 | Basic score table (thresholds and values) | M2-PR6 | High |
| OD-4 | Go/Stop score threshold | M2-PR6 | High |
| OD-5 | Whether MVP includes a Go multiplier | M2-PR7 | Medium |
| OD-6 | Draw pile exhaustion end condition | M2-PR9 | Medium |

> OD-1 through OD-4 must be resolved before Milestone 2 implementation PRs begin. OD-5 and OD-6 can be resolved just before the PR that requires them.

---

## 5. Milestone 1 Completion Criteria

Milestone 1 is complete when all of the following documents exist and are reviewed:

- [x] `docs/00_project_vision.md` — Project vision and philosophy
- [x] `docs/01_architecture.md` — Layer boundaries and dependency direction
- [x] `docs/02_mvp_scope.md` — MVP scope, exclusions, and anti-scope-creep rules
- [x] `docs/03_engine_boundary.md` — Engine responsibilities and PR review checklist
- [x] `docs/04_game_rule_spec.md` — MVP rule spec with Open Decisions
- [x] `docs/05_data_flow.md` — Game flow and event direction
- [x] `docs/07_ai_design.md` — MVP AI goal, boundary, and test requirements
- [x] `docs/08_testing_strategy.md` — Engine testing layers and Milestone 2 gate
- [x] `docs/09_pr_plan.md` — This document — Milestone 2 PR breakdown

---

## 6. What Comes After Milestone 1

The next milestone is **Milestone 2 — Matgo Game Engine Implementation**.

**Before Milestone 2 begins:**
- Resolve OD-1 through OD-4 (required for PRs 3, 5, and 6).
- Review all Milestone 1 documents and confirm no outstanding questions.

**Milestone 2 sequence:**
M2-PR1 → M2-PR2 → M2-PR3 → M2-PR4 → M2-PR5 → M2-PR6 → M2-PR7 → M2-PR8 → M2-PR9

Each PR must pass tests before the next PR begins. No skipping. No merging a PR with failing tests.
