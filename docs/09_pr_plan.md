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
- Milestone 2 PRs must not include monetization code — no ad SDK, no billing SDK, no product IDs, no entitlement logic.
- Ads, billing, entitlements, and product IDs are deferred until release preparation (Milestone 9).
- Monetization strategy is documented in `docs/11_monetization_strategy.md`.

---

## 3. Milestone 5 Proposed PRs — Save / Progress (Active Game Resume)

Milestone 5 implements Category A save only: the player can resume an in-progress game after closing the app. Category B (Player Statistics) and Category C (App Settings) are deferred.

See `docs/16_save_progress_architecture.md` for the full architecture.

---

### M5-PR1 — Save/Progress Architecture Document

**Goal:** Document the full save/progress architecture before any implementation begins.

| Deliverable | Notes |
|---|---|
| `docs/16_save_progress_architecture.md` | Three data categories, storage keys, save triggers, JSON schema, layer responsibilities, StorageService interface, save/load flows |
| `docs/10_decision_log.md` updates | Four M5 architecture decisions |

**Constraints:** Documentation only. No code.

---

### M5-PR1A — Save Architecture Scope Cleanup

**Goal:** Narrow M5 implementation scope to "Active Game resume only". Add M5 PR plan to `docs/09_pr_plan.md`.

| Deliverable | Notes |
|---|---|
| `docs/16_save_progress_architecture.md` | Add §3 MVP scope section; mark Category B and C as Deferred |
| `docs/09_pr_plan.md` | Add Milestone 5 PR plan (this section) |
| `docs/10_decision_log.md` | Add M5-PR1A scope decision |

**Constraints:** Documentation only. No code.

---

### M5-PR1B — Save Architecture Final Cleanup

**Goal:** Fix section numbering error in `docs/16` (duplicate §4); reflect browser-first implementation order; add M5-PR1B to PR plan.

| Deliverable | Notes |
|---|---|
| `docs/16_save_progress_architecture.md` | Fix §4 duplicate → renumber §5–§15; update §3/§9/§10 for `BrowserLocalStorageStorageService` |
| `docs/09_pr_plan.md` | Add M5-PR1B entry; update M5-PR2 to include `BrowserLocalStorageStorageService` |
| `docs/10_decision_log.md` | Add browser-first decision |

**Constraints:** Documentation only. No code.

---

### M5-PR1C — Save Architecture Safety Finalization

**Goal:** Remove the stray Category B reference from the Active Game save triggers table; add clarifying notes for deferred triggers.

| Deliverable | Notes |
|---|---|
| `docs/16_save_progress_architecture.md` §6 | Active Game "Game ended" trigger: remove `, then update Category B`; add explanatory note that Category B update is in the separate deferred table |
| `docs/16_save_progress_architecture.md` §6 | "App paused / backgrounded" trigger: note that this requires Capacitor (M5-PR6); browser per-turn saves cover the browser phase |
| `docs/09_pr_plan.md` | Add M5-PR1C entry (this section) |
| `docs/10_decision_log.md` | Add M5-PR1C safety note decision |

**Constraints:** Documentation only. No code.

---

### M5-PR1D — Save Derived State Boundary

**Goal:** Document that `GameViewModel` and derived view state must not be persisted; document the restore flow where the UI always receives a freshly-derived `GameViewModel`, never a raw saved document.

| Deliverable | Notes |
|---|---|
| `docs/16_save_progress_architecture.md` §14 | Add "Do not persist derived view state" subsection: list prohibited items (`GameViewModel`, score strings, `legalCardIds`, etc.) |
| `docs/16_save_progress_architecture.md` §14 | Add "UI receives GameViewModel after restore, not raw GameState" subsection: 4-step restore flow, no resume mode in UI |
| `docs/09_pr_plan.md` | Add M5-PR1D entry (this section) |
| `docs/10_decision_log.md` | Add M5-PR1D derived state boundary decision |

**Constraints:** Documentation only. No code.

---

### M5-PR2 — `StorageService` Interface + `BrowserLocalStorageStorageService` + `InMemoryStorageService`

**Goal:** Define the storage contract and provide two implementations: browser localStorage for development validation, and in-memory for tests.

| Deliverable | Notes |
|---|---|
| `StorageService` interface | `read(key): Promise<string \| null>`, `write(key, value): Promise<void>`, `delete(key): Promise<void>` |
| `BrowserLocalStorageStorageService` | Wraps `window.localStorage`; no Capacitor dependency; works in browser / Vite dev server |
| `InMemoryStorageService` | Map-backed in-process implementation; no browser or Capacitor dependency |
| Tests for both implementations | Read null on missing key; write/read roundtrip; delete removes key |

**Where:** Interface in `src/application/` (dependency inversion); implementations in `src/platform/storage/`

**Constraints:** No Capacitor import. No Application Layer save logic yet.

---

### M5-PR3 — Application Layer Save/Load Module

**Goal:** Implement serialize, write, load, and validate for the Active Game document (Category A).

| Deliverable | Notes |
|---|---|
| `serializeActiveGame(session)` | Produces Category A JSON document from session state |
| `saveActiveGame(storage, session)` | Calls `StorageService.write` — fire-and-forget error handling |
| `loadActiveGame(storage)` | Reads and deserializes; returns `null` if missing or corrupted |
| `validateActiveGameDoc(doc)` | Checks `saveVersion`, `sessionPhase`, `gameState` shape |
| `deleteActiveGame(storage)` | Calls `StorageService.delete` |
| Tests | Roundtrip save/load; validation rejects malformed docs; load null on missing key |

**Dependency:** M5-PR2.

---

### M5-PR4 — Save Triggers in `GameSessionScreen`

**Goal:** Wire save calls into the existing dispatch flow so the active game is persisted after each turn.

| Deliverable | Notes |
|---|---|
| Save after human turn | Call `saveActiveGame` after `SUBMIT_HUMAN_ACTION` resolves |
| Save after AI turn | Call `saveActiveGame` after `ADVANCE_AI` resolves |
| Delete on game end | Call `deleteActiveGame` when `session.phase === 'ended'` |
| Delete on "다시 하기" | Call `deleteActiveGame` before `START_GAME` dispatch |
| Tests | Verify save is called at correct trigger points (using `InMemoryStorageService`) |

**Dependency:** M5-PR3.

---

### M5-PR5 — Resume UX ("게임 이어하기")

**Goal:** On app startup, if a valid active game exists, offer the player a resume option before the title screen.

| Deliverable | Notes |
|---|---|
| Startup load check | `GameSessionScreen` calls `loadActiveGame` on mount |
| "게임 이어하기" prompt | Shown on the idle screen when a valid active game is loaded |
| "새 게임 시작" behavior | Clears the active game, starts fresh |
| Resume behavior | Restores session state from the loaded document |
| Tests | Idle screen shows resume prompt when active game exists; no prompt when absent |

**Dependency:** M5-PR4.

---

### M5-PR6 — `CapacitorStorageService`

**Goal:** Provide the production Platform Layer implementation using Capacitor Storage.

| Deliverable | Notes |
|---|---|
| `CapacitorStorageService` | Wraps `@capacitor/preferences`; implements `StorageService` |
| `@capacitor/core` declared as direct dependency | `main.tsx` imports `Capacitor` directly — declared in M5-PR6A |
| Composition root platform detection | `Capacitor.isNativePlatform()` selects adapter in `main.tsx` |

**Dependency:** M5-PR5. Requires Capacitor to be installed in the project.

---

### M5-H1 — Save System Hardening Review

**Goal:** Verify the M5 save system is complete, tested, and consistent with the architecture document.

| Deliverable | Notes |
|---|---|
| Review document | `docs/17_m5_hardening_review.md` — full findings |
| Doc fix: §6 pause trigger | `docs/16` — corrected "wired in M5-PR6" → "deferred to M5-PR7" |
| Doc fix: M5-PR6 entry | `docs/09` — removed deprecated `@capacitor/storage` reference; added M5-PR6A deliverable |
| Follow-up PR logged | M5-H1A: `isStartingGame` never reset on ended→restart path |

**Constraints:** Documentation review + minor doc fixes. No code changes.

---

### M5-H1A — Fix `isStartingGame` Reset on Restart from Ended Screen

**Goal:** Fix a bug introduced in M5-PR5A where `isStartingGame` is set to `true` on `handleStartGame` but never reset when the handler is called from the `ended` phase (ResultPanel "다시 하기" button).

**Bug:** After the player plays a complete game to the end screen and clicks "다시 하기" once, `isStartingGame` remains `true`. On the second game ending, clicking "다시 하기" again silently no-ops because `if (isStartingGame) return;` fires immediately, blocking all subsequent restarts.

| Deliverable | Notes |
|---|---|
| Reset `isStartingGame` to `false` after `dispatch(START_GAME)` | OR restructure so the guard does not apply on the ended→restart path |

**Dependency:** M5-H1.

---

### M5-PR7 — App Pause / Background Save Trigger (Capacitor)

**Goal:** Wire the Capacitor app-pause event to call `saveActiveGame` so in-progress games are saved when the app is backgrounded or force-closed on Android/iOS.

| Deliverable | Notes |
|---|---|
| `@capacitor/app` dependency | Adds the App plugin for lifecycle events |
| Pause event listener | In `GameSessionScreen` (or a Capacitor lifecycle hook) — calls `saveActiveGame` on `appStateChange` → active=false |

**Dependency:** M5-PR6.

---

## 4. Milestone 2 Proposed PRs

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
| Go multiplier | Not applied in MVP — `goCount` tracked only (OD-5 resolved) |
| Game end detection | Stop declared or other terminal condition |
| `FinalResult` production | Winner, final scores, summary |
| `GAME_ENDED` event | Emitted with final result data |
| Post-end action rejection | All actions rejected after game ends |
| Game end tests | Stop → correct result; further actions rejected |

**Dependency:** Requires M2-PR6. OD-5 resolved — no multiplier in MVP.

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

**Dependency:** Requires M2-PR8. OD-6 resolved — game ends on exhaustion; score comparison; tie = draw.

---

## 5. Open Decisions — All Resolved

All Open Decisions OD-1 through OD-6 are resolved in `docs/12_open_decision_resolution.md`.

| ID | Decision | Resolution | Required Before |
|---|---|---|---|
| OD-1 | Initial deal counts | 10 / 10 / 8 / 20 | M2-PR3 ✓ |
| OD-2 | Multiple same-month field card handling | `targetCardId` in `GameAction` | M2-PR5 ✓ |
| OD-3 | Basic score table | Gwang 3/4/15, Yeol/Tti 5+, Pi 10+ | M2-PR6 ✓ |
| OD-4 | Go/Stop score threshold | 7 points | M2-PR6 ✓ |
| OD-5 | Go multiplier | Not applied; `goCount` tracked | M2-PR7 ✓ |
| OD-6 | Draw pile exhaustion | Game ends; score comparison; tie = draw | M2-PR9 ✓ |

> Milestone 2 can begin. All PRs use the resolved defaults above.

---

## 6. Milestone 1 Completion Criteria

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

## 7. What Comes After Milestone 1

The next milestone is **Milestone 2 — Matgo Game Engine Implementation**.

**Before Milestone 2 begins:**
- Resolve OD-1 through OD-4 (required for PRs 3, 5, and 6).
- Review all Milestone 1 documents and confirm no outstanding questions.

**Milestone 2 sequence:**
M2-PR1 → M2-PR2 → M2-PR3 → M2-PR4 → M2-PR5 → M2-PR6 → M2-PR7 → M2-PR8 → M2-PR9

Each PR must pass tests before the next PR begins. No skipping. No merging a PR with failing tests.
