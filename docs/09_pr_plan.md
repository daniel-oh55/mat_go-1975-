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

## 3.5. Milestone 5.5 Proposed PRs — One Full Game Playability

Milestone 5.5 is a validation milestone between M5 (Save / Progress Foundation) and M6 (Story System). Its only goal is to confirm that a real player can complete one full game of 맞고 — launch to result, resume to restart — without getting stuck or confused.

There are no new features in this milestone. PRs are documentation and targeted UX fixes only.

See `docs/18_m5_5_one_full_game_playability_review.md` for the primary review findings.

---

### M5.5-PR1 — One Full Game Playability Review

**Goal:** Review and document whether a player can complete one full game without blockers. Produce `docs/18_m5_5_one_full_game_playability_review.md`.

| Deliverable | Notes |
|---|---|
| `docs/18_m5_5_one_full_game_playability_review.md` | Full flow verification, save/resume integration check, findings table, follow-up items |
| `docs/13_mvp_playtest_checklist.md` §12 | Updated stale test count: 422+ → 485+ |

**Constraints:** Documentation only. No code.

---

### M5.5-PR1A — Playability Review Doc Alignment

**Goal:** Add M5.5 PR plan to `docs/09_pr_plan.md`; add the Milestone 5.5 decision to `docs/10_decision_log.md`; enhance `docs/18` with player emotion/experience perspective.

| Deliverable | Notes |
|---|---|
| `docs/09_pr_plan.md` | Add §3.5 Milestone 5.5 PR plan (this section) |
| `docs/10_decision_log.md` | Add M5.5 decision: one full game playability before Story System |
| `docs/18_m5_5_one_full_game_playability_review.md` | Add §6 player emotion assessment and expand follow-up table |

**Constraints:** Documentation only. No code.

---

### M5.5-PR2 — GoStopPanel / ResultPanel Viewport Fix

**Goal:** Fix finding 4-A from the playability review: `GoStopPanel` and `ResultPanel` appear below the fold on small mobile viewports when the hand area is fully populated.

| Deliverable | Notes |
|---|---|
| UI layout change | Evaluate options: scroll-into-view on trigger, panel hoisted above hand area, or sticky-bottom overlay |
| `docs/18` §4-A status | Mark finding 4-A as resolved |

**Dependency:** M5.5-PR1A.

---

### M5.5-H1 — Final Pre-Story Playability Sign-off

**Goal:** Verify that all M5.5 findings are resolved or deliberately deferred, confirm that one full game is playable without UX blockers, and sign off that the codebase is ready to enter Milestone 6 (Story System).

| Deliverable | Notes |
|---|---|
| `docs/18` §5 stale entries | Updated — 5-B, 5-D, 5-F, 5-G now reflect M5.5-PR2 fix |
| `docs/18` §6 UX Risk Summary | UX-1 confirmed resolved; UX-6, UX-7, UX-8 added |
| `docs/18` §9 Final Pre-Story Sign-off | New section — milestone completion checklist, risk assessment, player capability, formal sign-off |
| `docs/10_decision_log.md` | M5.5 completion decision added — M6 Story System may begin |

**Result:**
- Final playability sign-off completed.
- UX-1 resolved by M5.5-PR2 (GoStopPanel / ResultPanel hoisted above hand area).
- No remaining Blocker or High severity UX risks.
- M6 Story System may begin.

**Constraints:** Documentation only. No code.

**Dependency:** M5.5-PR2.

---

### M5.5-PR3 — Captured Card Display Grouped by Category

**Goal:** Improve the captured card area in `GameSessionScreen` so that each player's captured pile is shown split into the four scoring groups (광/열/띠/피) instead of a single flat list.

| Deliverable | Notes |
|---|---|
| `src/application/gameSession/capturedCardGroups.ts` | Pure `groupCapturedCards()` helper; `CapturedGroup` type; `CAPTURED_GROUP_LABEL` map |
| `src/application/gameSession/capturedCardGroups.test.ts` | 8 tests: empty input, category order, group omission, card order, Korean labels |
| `src/components/game/CapturedCardGroups.tsx` | Presentational component — renders one section per non-empty group |
| `src/components/game/GameSessionScreen.tsx` | Replace flat `CardRow` + `DisplayCard` captured rendering with `CapturedCardGroups` |

**Constraints:** UI information structure improvement only. No engine, scoring, AI, or save logic changes.

---

### M5.5-PR3A — Captured Card Empty Groups Always Visible + UX-9 Docs

**Goal:** Two corrections to M5.5-PR3: (1) all four scoring groups (광/열/띠/피) always visible even when empty — players see the full structure from turn 1; (2) document M5.5-PR3 result and UX-9 in the playability review.

| Deliverable | Notes |
|---|---|
| `src/application/gameSession/capturedCardGroups.ts` | Remove `.filter()` — all 4 groups always returned |
| `src/application/gameSession/capturedCardGroups.test.ts` | 8 tests updated: empty input returns 4 groups, includes zero-count groups |
| `src/components/game/CapturedCardGroups.tsx` | Remove `groups.length === 0` branch; all 4 groups always render |
| `docs/18_m5_5_one_full_game_playability_review.md` | UX-9 added to §6 UX Risk Summary (resolved); §9 checklist updated |

**Constraints:** UI information structure only. No engine, scoring, AI, or save logic changes. `GameSessionScreen.tsx` not modified.

---

## 3.6 Milestone 6 — Story System Foundation

Milestone 6 builds the Story System foundation: schema, progression logic, and a minimal sample definition for validation. No full content is written. Engine code is not touched.

See `docs/19_story_system_architecture.md` for the full architecture.

---

### M6-PR1 — Story System Architecture Document

**Goal:** Document the Story System architecture before any code is written. Establishes layer boundaries, core concepts, data schema, match-result-to-progression flow, proposed directory structure, and boundary invariants.

| Deliverable | Notes |
|---|---|
| `docs/19_story_system_architecture.md` | §1 Purpose, §2 MVP Scope, §3 Layer Boundary, §4 Core Concepts, §5 Data-Driven Content Model, §6 Match Result Flow, §7 Story Progress State, §8 Directory Structure, §9 Boundary Invariants, §10 Non-Goals |
| `docs/09_pr_plan.md` | M6 section header + M6-PR1 entry added |
| `docs/10_decision_log.md` | M6 architecture decision entry added |

**Constraints:** Documentation only. No `src/` files created or modified.

---

### M6-PR1A — Story Serialization Fix + Plan Alignment

**Goal:** Correct `StoryProgress.visitedNodeIds` from `ReadonlySet<string>` to `ReadonlyArray<string>` in `docs/19` (two locations); add §11 Final Pre-Implementation Decision to `docs/19`; add M6-PR2/PR3/H1 entries to this document.

| Deliverable | Notes |
|---|---|
| `docs/19_story_system_architecture.md` | `visitedNodeIds` fixed in §5 and §7; §9 invariant updated; §11 added |
| `docs/09_pr_plan.md` | M6-PR2, M6-PR3, M6-H1 entries added |
| `docs/10_decision_log.md` | Serialization constraint note added to existing M6 decision |

**Constraints:** Documentation only. No `src/` files created or modified.

---

### M6-PR2 — Story Types Schema

**Goal:** Create the Application Layer boundary for the Story System — types only, no progression logic.

| Deliverable | Notes |
|---|---|
| `src/application/storySession/storyTypes.ts` | `StoryDefinition`, `StoryNode`, `StoryProgress`, `MatchOutcome`, `MatchContext`, `UnlockCondition`, `DialogueLine`, `RegionId`, `NpcId` |
| `src/application/storySession/index.ts` | Public boundary — re-exports types used by UI and Content layers |
| `src/content/stories/sample/sampleStory.ts` | Minimal 2–3 node sample story definition for schema validation |

**Constraints:** Types and sample data only. No progression logic. No engine imports. No UI changes.

**Result (PR #75, merged):** Schema and sample story added. `StoryNode` implemented as a single loose interface — type-specific required fields not yet enforced. PR2A and PR2B follow to strengthen the schema.

---

### M6-PR2A — StoryNode Discriminated Union (side branch, superseded)

**Goal:** Strengthen `StoryNode` to a discriminated union with per-type required fields. Branched from `milestone6/pr2-story-types-schema`, not from `main`.

**Result (PR #76, closed — not merged to main):** Discriminated union implemented and tested, but PR base was `milestone6/pr2-story-types-schema` instead of `main`. Changes did not reach `main`. Superseded by M6-PR2B.

---

### M6-PR2B — Apply Discriminated Schema to Main

**Goal:** Re-apply the M6-PR2A discriminated union changes onto `main`, with additional cleanup: `StoryId`/`StoryNodeId` opaque types, `StoryChoice`/`BaseStoryNode` types, `sample-` prefix on all sample node IDs, updated tests (10 tests including JSON roundtrip and `sample-` prefix guard).

| Deliverable | Notes |
|---|---|
| `src/content/schemas/storySchema.ts` | `StoryId`, `StoryNodeId`, `BaseStoryNode`, `DialogueStoryNode`, `MatchStoryNode`, `ChoiceStoryNode`, `EndStoryNode`, `StoryChoice`, `StoryNode` discriminated union |
| `src/application/storySession/storyTypes.ts` | Full re-export including all discriminated union types |
| `src/application/storySession/index.ts` | Public boundary updated to export all new types |
| `src/content/stories/sample/sampleStory.ts` | Node IDs prefixed with `sample-`; nodes declared as explicit typed constants |
| `src/content/stories/sample/sampleStory.test.ts` | 10 tests: discriminated union guards, JSON roundtrip, `sample-` prefix check |
| `docs/09_pr_plan.md` | PR2 Result, PR2A note, PR2B entry |
| `docs/19_story_system_architecture.md` | §5 updated to discriminated union schema |

**Constraints:** Types and sample data only. No progression logic. No engine imports. No UI changes.

---

### M6-PR3 — Story Progression Logic + Tests

**Goal:** Implement `evaluateUnlockCondition()` and `advanceStory()` — the pure Application Layer functions that advance story state after a node transition.

| Deliverable | Notes |
|---|---|
| `src/application/storySession/storyProgression.ts` | `evaluateUnlockCondition(condition, progress, outcome)` → `boolean`; `advanceStory(progress, outcome, definition, choiceId?)` → `StoryProgress` |
| `src/application/storySession/storyProgression.test.ts` | 24 tests: all four `UnlockCondition` types; all four node type transitions; no-op cases (end node, unknown node, no eligible next, wrong choiceId); deduplication invariant; `matchesPlayed` counts current match |
| `src/application/storySession/index.ts` | Exports `evaluateUnlockCondition` and `advanceStory` from the public boundary |

**Note on `buildMatchOutcome`:** Deferred. Translating engine `FinalResult` → `MatchOutcome` requires importing from `src/engine/` which is forbidden in this PR. `buildMatchOutcome` will be added when the match-to-story integration is wired in M6-H1 or later.

**Constraints:** Pure functions only. No engine imports. No UI changes. No platform calls.

---

### M6-PR3A — Story Progression补完: ViewModel, Helpers, No-Advance Fix

**Goal:** Four targeted fixes to M6-PR3 before M6-H1 sign-off.

| # | Problem | Fix |
|---|---|---|
| 1 | `advanceStory()` silently drops match outcome when no eligible next node exists | Stay on match node but record outcome in `matchHistory` |
| 2 | No lookup / traversal helpers | Add `findStoryNode()`, `getCandidateNextNodeIds()` |
| 3 | No view model for UI consumption | Add `StoryViewModel` interface + `buildStoryViewModel()` |
| 4 | `evaluateUnlockCondition()` requires explicit `UnlockCondition` — callers cannot pass `node.unlockCondition` directly when it may be `undefined` | Accept `UnlockCondition \| undefined`; treat `undefined` as `'always'` |

| Deliverable | Notes |
|---|---|
| `src/application/storySession/storyProgression.ts` | `findStoryNode`, `getCandidateNextNodeIds`, `StoryViewModel`, `buildStoryViewModel`; `evaluateUnlockCondition` accepts `undefined`; `advanceStory` records match outcome on no-advance |
| `src/application/storySession/storyProgression.test.ts` | 38 tests (adds `findStoryNode`, `getCandidateNextNodeIds`, `buildStoryViewModel`, `evaluateUnlockCondition(undefined)`, no-advance-records-outcome) |
| `src/application/storySession/index.ts` | Exports `StoryViewModel`, `findStoryNode`, `getCandidateNextNodeIds`, `buildStoryViewModel` from public boundary |
| `docs/09_pr_plan.md` | PR3 Result block + PR3A entry |
| `docs/19_story_system_architecture.md` | §9 rejection criteria: loose `StoryNode` interface prohibited |

**Constraints:** Pure functions only. No engine imports. No UI changes. No platform calls.

---

### M6-PR3B — StoryViewModel Shape Alignment

**Goal:** Align `StoryViewModel` with the Application Layer boundary so the UI does not need to interpret raw `StoryNode` traversal data.

| # | Change | Detail |
|---|---|---|
| 1 | `currentNodeId` added to `StoryViewModel` | UI can reference current node ID without inspecting `currentNode.nodeId` |
| 2 | `availableNextNodeIds` added to `StoryViewModel` | UI receives pre-computed candidate next-node IDs |
| 3 | `buildStoryViewModel` derives `availableNextNodeIds` via `getCandidateNextNodeIds` | Centralises traversal logic; UI must not compute next candidates from raw definition |
| 4 | `null`-return policy documented in comment and tests | Null only when `currentNodeId` not found in definition |
| 5 | `buildStoryViewModel` does not mutate input | Verified by test |

| Deliverable | Notes |
|---|---|
| `src/application/storySession/storyProgression.ts` | `StoryViewModel` extended with `currentNodeId` and `availableNextNodeIds`; `buildStoryViewModel` updated |
| `src/application/storySession/storyProgression.test.ts` | 7 new tests for ViewModel shape (currentNodeId, availableNextNodeIds per node type, null for invalid, no-mutate) |
| `docs/09_pr_plan.md` | This entry |
| `docs/19_story_system_architecture.md` | §6 and §3 updated with StoryViewModel principles |

**Constraints:** Pure Application Layer helper alignment only. No engine imports. No UI. No storage. No production content.

---

### M6-H1 — Story System Foundation Sign-off

**Goal:** Verify that the schema, progression logic, and sample story are correct and consistent before any content (NPC, region, dialogue) work begins in M7.

| Deliverable | Notes |
|---|---|
| `docs/19_story_system_architecture.md` | §12 M6-H1 sign-off section added: scope reviewed, boundary verification table, final decision, deferred work, recommended next milestone |
| `docs/09_pr_plan.md` | M6-H1 result + M7 proposed PR plan (this section) |
| `docs/10_decision_log.md` | M6 foundation approved — M7 may begin |

**Constraints:** Documentation only. No code.

**Result:**
- Story System Foundation reviewed and signed off.
- Engine/content boundary confirmed: no engine file modified across any M6 PR.
- `StoryProgress` JSON serialization confirmed: `ReadonlyArray<string>`, no `Set`/`Map`.
- `StoryNode` discriminated union confirmed: compile-time enforcement of per-type required fields.
- Pure progression logic and `StoryViewModel` Application Layer boundary confirmed.
- `buildMatchOutcome` / `FinalResult` adapter, persistence, UI shell, and production content deferred to M7+.

---

## 3.7. Milestone 7 Proposed PRs — Minimal Story Runtime Integration

Milestone 7 connects the completed match engine to the Story System Application Layer. No full regional/NPC/dialogue content is produced in M7. Engine code is not touched.

See `docs/19_story_system_architecture.md` §12-E for the recommended path rationale.

---

### M7-PR1 — Story Runtime Architecture

**Goal:** Document the runtime flow connecting `StoryProgress`, `StoryViewModel`, `GameSession` completion, and the `MatchOutcome` adapter while preserving the engine boundary.

| Deliverable | Notes |
|---|---|
| `docs/20_story_runtime_architecture.md` | Runtime flow (story start, dialogue, match, choice, end nodes), `MatchOutcome` adapter placement decision, `StorySession` state proposal, persistence deferral decision, M7 risk review |
| `docs/09_pr_plan.md` | This entry |
| `docs/10_decision_log.md` | M7 start decision |

**Constraints:** Documentation only. No code.

**Result:**
- `docs/20_story_runtime_architecture.md` added.
- `buildMatchOutcome` adapter location proposed: `src/application/storySession/matchOutcomeAdapter.ts` (M7-PR2, not created in this PR).
- `StorySessionState` shape proposed — does not include `GameState`.
- Persistence and production content confirmed deferred.

---

### M7-PR2 — MatchOutcome Adapter

**Goal:** Add an Application Layer adapter that converts engine `FinalResult` into `MatchOutcome`, without importing story types into the engine.

| Deliverable | Notes |
|---|---|
| `buildMatchOutcome(result: FinalResult): MatchOutcome` | Application Layer only; engine file unchanged |
| Tests | Correct `humanWon`, `humanFinalScore`, `aiFinalScore` derivation |

**Constraints:** Application Layer only. Engine unchanged. No UI. No story content.

**Result:**
- `src/application/storySession/matchOutcomeAdapter.ts` added — `buildMatchOutcome(finalResult: FinalResult): MatchOutcome`.
- `matchOutcomeAdapter.ts` is the only file under `src/application/storySession/` that imports an engine type (`FinalResult`, type-only, from `src/engine/types/index.ts`). `storyProgression.ts` and `storyTypes.ts` remain engine-free.
- `humanWon` is derived from `finalResult.winner === HUMAN_PLAYER_ID` — the engine's authoritative winner field — not from score comparison. Draw (`winner: null`) and AI win both map to `humanWon: false`.
- `humanFinalScore` / `aiFinalScore` map from `finalResult.scores[HUMAN_PLAYER_ID].total` / `finalResult.scores[AI_PLAYER_ID].total`.
- `HUMAN_PLAYER_ID` / `AI_PLAYER_ID` imported from the existing `src/application/gameSession/index.ts` boundary (Application Layer to Application Layer import — not an engine import).
- `src/application/storySession/matchOutcomeAdapter.test.ts` added — 7 tests: human win, AI win, draw, `humanFinalScore` mapping, `aiFinalScore` mapping, exhausted-reason win, no-mutation of input `FinalResult`.
- `buildMatchOutcome` exported from `src/application/storySession/index.ts`. `FinalResult` is not re-exported from the public boundary.
- No engine file modified. No `StorySession` state. No UI. No persistence. No production content.

---

### M7-PR2A — Player ID Boundary Refactor

**Goal:** Move `HUMAN_PLAYER_ID` / `AI_PLAYER_ID` to an Application Layer shared constants file so `storySession` does not import `gameSession/index` for player identity.

| Deliverable | Notes |
|---|---|
| `src/application/shared/playerIds.ts` | New shared constants file — `HUMAN_PLAYER_ID`, `AI_PLAYER_ID`; no engine or content imports |
| `createGameSession.ts` imports/re-exports shared player IDs | `gameSession/index.ts` export list unchanged — still re-exports `HUMAN_PLAYER_ID`/`AI_PLAYER_ID` from `createGameSession.js` |
| `matchOutcomeAdapter.ts` imports shared player IDs instead of `gameSession/index` | Removes the `storySession → gameSession/index → createGameSession → engine runtime` indirect coupling |
| `matchOutcomeAdapter.test.ts` updated | Imports player IDs from `shared/playerIds.js` |
| `docs/20` boundary note updated | Documents the new player ID import path |

**Constraints:** Boundary refactor only. No engine changes, no `StorySession` state, no UI, no persistence, no production content.

**Result:**
- `src/application/shared/playerIds.ts` added — sole source of `HUMAN_PLAYER_ID` / `AI_PLAYER_ID` for the Application Layer.
- `createGameSession.ts` no longer defines the constants directly — it imports and re-exports them from `../shared/playerIds.js`. `gameSession/index.ts` was not modified; its public export list continues to work unchanged.
- `matchOutcomeAdapter.ts` now imports `HUMAN_PLAYER_ID` / `AI_PLAYER_ID` from `../shared/playerIds.js` — it no longer imports `gameSession/index.ts` at all. Its only remaining engine dependency is the type-only `FinalResult` import.
- No behavior change: player ID values (`'human'`, `'ai'`), `createGameSession` logic, and `newGame` call shape are all unchanged.
- All 7 existing `matchOutcomeAdapter.test.ts` tests preserved and passing.

---

### M7-PR3 — StorySession State

**Goal:** Add a minimal `StorySession` state that tracks `StoryProgress` and current `StoryViewModel` within the Application Layer.

| Deliverable | Notes |
|---|---|
| `StorySession` type / reducer | Holds `StoryProgress` and current `StoryViewModel`; no UI state |
| `initStorySession` | Creates initial session from a `StoryDefinition` |
| Tests | State updates correctly on `advanceStory` call |

**Constraints:** No UI polish. No production content. No persistence unless explicitly approved after runtime flow is proven.

**Result:**
- `StorySessionState` added in the Application Layer (`src/application/storySession/storySessionState.ts`) — `storyId`, `progress`, `viewModel`, `status` (`'story' | 'matchRequested' | 'completed' | 'invalid'`), `pendingMatchContext`, `error`.
- `createInitialStoryProgress(definition)` / `createStorySession(definition)` added — build the initial `StoryProgress` and derive the first `StorySessionState`.
- `continueStorySession` / `requestStoryMatch` / `completeStoryMatch` / `selectStoryChoice` added — pure state-transition helpers, one per node type (`dialogue`, `match` request, `match` completion, `choice`).
- `StorySessionState` holds only `StoryProgress` and `StoryViewModel` (plus transition bookkeeping) — no `StoryDefinition`, no `GameState`, no `RandomProvider`, no `Ruleset`, no UI animation state.
- `completeStoryMatch` accepts an already-built `MatchOutcome` — it does not call `buildMatchOutcome` and does not import `FinalResult` or any engine module.
- `requestStoryMatch` exposes `MatchContext` as `pendingMatchContext` only — it does not create engine state or start a `GameSession`.
- No UI. No persistence. No production content. Engine unchanged.
- `src/application/storySession/storySessionState.test.ts` added — 30 tests covering all six functions, the error policy (wrong status / wrong node type → `error` message; unresolvable node → `status: 'invalid'`), and no-mutation of inputs.
- All exported from `src/application/storySession/index.ts`.

---

### M7-PR4 — Minimal Story UI Shell

**Goal:** Render the current story node and allow basic navigation: dialogue node display, entry to a match, and return from match result to story state.

| Deliverable | Notes |
|---|---|
| Story node renderer | Reads `StoryViewModel`; does not interpret raw `StoryDefinition` |
| Match entry flow | Transitions from `match` node to game session |
| Post-match return | Calls `advanceStory` with `MatchOutcome`; updates `StoryViewModel` |

**Constraints:** Minimal shell only. No final art. No regional content. No BGM/SFX. No production dialogue.

**Result:**
- `src/components/story/StoryRuntimeScreen.tsx` added — owns `StorySessionState` for `sampleStory` via `useState`; drives it exclusively through `createStorySession` / `continueStorySession` / `requestStoryMatch` / `completeStoryMatch` / `selectStoryChoice` / `buildMatchOutcome`.
- `src/components/story/StoryNodePanel.tsx` added — presentational; renders `StoryViewModel.currentNode` by discriminated `type` (`dialogue` / `match` / `choice` / `end`); never reads `StoryDefinition.nodes` directly and never evaluates `UnlockCondition`.
- `src/App.tsx` now renders `StoryRuntimeScreen` instead of `GameSessionScreen` directly — the app's entry point is the sample story runtime validation flow, not the game board.
- `GameSessionScreen` extended with optional props: `mode` (`'standalone' | 'storyMatch'`, default `'standalone'`), `onMatchComplete`, `onCancelStoryMatch`, `enableResume` (default `true`), `enableActiveGamePersistence` (default `true`). With all defaults, standalone behavior is byte-for-byte the same as before this PR. `GameSessionScreen` still imports nothing from `storySession` or content — it only reports `finalResult` upward via `onMatchComplete`.
- When `enableActiveGamePersistence` is `false`, both the save/delete effect and the `deleteActiveGame` call inside `handleStartGame` are skipped, so a story match never touches (or deletes) the player's standalone saved game.
- `ResultPanel` extended with optional `onContinue` / `continueLabel` props (defaulting the label to "이야기로 돌아가기"); the existing `onRestart` ("다시 하기") is unchanged and always rendered.
- Match completion flow: `GameSessionScreen` (storyMatch mode) → `onMatchComplete(finalResult)` → `StoryRuntimeScreen` calls `buildMatchOutcome(finalResult)` then `completeStoryMatch(storySession, sampleStory, outcome)` → `setStorySession(next)`.
- No `StoryProgress` persistence. No production story content — `sampleStory` used strictly as the M6/M7 validation fixture. Engine unchanged; no engine file touched.
- Verified end-to-end in a real browser (Playwright against the Vite dev server): dialogue → match node → storyMatch idle screen (no resume prompt, cancel button present, cancel returns to the match node without error) → full match played to completion → `ResultPanel` shows both "다시 하기" and "이야기로 돌아가기" → clicking "이야기로 돌아가기" returns to the story shell on the `end` node ("샘플 이야기 완료") → "샘플 이야기 다시 시작" restarts from the intro dialogue. No console errors observed in any step.
- No new test infrastructure added (no React rendering test library exists in this project and `package.json` is off-limits for this PR); existing 581 tests all pass unchanged.

---

### M7-H1 — Story Runtime Boundary Review

**Goal:** Confirm that the M7 story runtime integration did not leak into engine code and did not affect match fairness.

| Deliverable | Notes |
|---|---|
| Boundary verification | Engine import scan; `StoryProgress` serialization check; AI fairness unchanged |
| `docs/19` or new `docs/20` | Updated with M7 integration findings |

**Constraints:** Review and documentation only, unless a boundary issue is discovered that requires a fix.

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
