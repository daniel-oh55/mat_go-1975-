# Decision Log

This file records key decisions made during the project. Each entry documents what was decided, why, and what impact it has on future development.

Entries are listed in reverse chronological order (newest first).

---

## 2026-06-28 - M5: GameViewModel Is Never Saved; UI Receives Derived State After Restore (M5-PR1D)

**Decision**  
`GameViewModel` and all derived view state (score display strings, `legalCardIds`, `legalPlayActions`, `statusDisplay`, `humanScoreBreakdown`, `aiScoreBreakdown`, React local state, timers, transient errors) must not be persisted. On game resume, the Application Layer restores `GameState`, derives a fresh `GameViewModel` using the same derivation function used during live play, and passes `GameViewModel` to the UI. The UI never receives a raw saved document.

**Reason**  
`GameViewModel` is a pure function of `GameState`. Saving it creates a redundant copy that can drift out of sync with the engine source of truth. If a derived field (e.g., a new score breakdown format) changes, a saved `GameViewModel` would carry the old shape, requiring a migration for data that is trivially re-computable. Conversely, if the UI is allowed to receive a raw saved `GameState`, deserialization and validation logic leaks into React components — violating the Application Layer / UI boundary. The restore path must be indistinguishable from a live-turn path at the UI layer.

**Impact**  
- The save document (Category A) contains only `GameState`, `sessionPhase`, `saveVersion`, and `savedAt` — never any derived view fields.
- On resume: validate `GameState` → pass to engine → derive `GameViewModel` → pass to UI. This is identical to the post-turn flow.
- No "resume mode" or special rendering path in the UI — components cannot tell whether a session was restored or started fresh.
- Adding a new field to `GameViewModel` never requires a save schema migration.
- PR review must reject any attempt to serialize `GameViewModel` or any field derived from it.

---

## 2026-06-28 - M5: Active Game Trigger Table Must Not Reference Deferred Categories (M5-PR1C)

**Decision**  
The Active Game save triggers table (§6 of `docs/16_save_progress_architecture.md`) must only list actions that are part of M5 scope. References to Category B or Category C updates must not appear in the Active Game trigger flow, even if logically related to the same event (e.g., game end).

**Reason**  
The "Game ended" trigger previously read "Delete Category A, then update Category B." Category B (Player Statistics) is deferred to post-M5. Including it in the Active Game trigger table implied that M5 implementations would need to update Category B on game end — which they must not. A reader implementing M5-PR4 (Save Triggers) would see that row and add Category B update code that is explicitly out of scope. The Category B trigger is correctly documented in its own "Player Statistics save triggers — Deferred" table below.

**Impact**  
- "Game ended" Active Game trigger action: `Delete Category A` (Category B reference removed).
- "App paused / backgrounded" Active Game trigger: annotated as Capacitor-only (M5-PR6); `BrowserLocalStorageStorageService` (M5-PR2 through M5-PR5) has no reliable pause event in a browser environment.
- Explanatory notes added below the trigger table to explain both constraints without changing behavior.
- No code changes.

---

## 2026-06-28 - M5: Browser localStorage Adapter Is Implemented First; Capacitor Is M5-PR6

**Decision**  
`BrowserLocalStorageStorageService` (wrapping `window.localStorage`) is the primary Platform Layer implementation for M5, implemented in M5-PR2. `CapacitorStorageService` is deferred to M5-PR6, after the Application Layer save/load logic is validated in the browser environment.

**Reason**  
The game runs on Vite/React in a browser during development. Validating save/load against `window.localStorage` requires no device, no emulator, and no Capacitor SDK installation. Attempting to build `CapacitorStorageService` first would block test and development feedback on any machine without Capacitor configured. The `StorageService` interface ensures the Application Layer cannot tell the difference — swapping implementations is a single dependency injection change.

**Impact**  
- M5-PR2 delivers: `StorageService` interface + `BrowserLocalStorageStorageService` + `InMemoryStorageService`.
- M5-PR3 through M5-PR5 use `BrowserLocalStorageStorageService` in manual browser testing and `InMemoryStorageService` in automated tests.
- M5-PR6 adds `CapacitorStorageService` for production mobile; the Application Layer code does not change.
- The `BrowserLocalStorageStorageService` key format matches the Capacitor key format exactly — no data migration is needed when switching from browser to Capacitor in a production build.

---

## 2026-06-28 - M5: MVP Save Scope Is "Active Game Resume Only"

**Decision**  
Milestone 5 implements Category A (Active Game) only. Category B (Player Statistics) and Category C (App Settings) are architecture-documented but not implemented in M5.

**Reason**  
The highest-value save feature for a single-session mobile game is "not losing your game progress when the app closes." Player statistics are meaningful only after the player has played multiple games and a Stats screen exists to display them. Implementing all three categories in M5 would require a Stats screen UI that is not yet designed, adding scope that is not justified by player value at this stage.

**Impact**  
- M5 implementation PRs cover: `StorageService` interface, `InMemoryStorageService`, Application Layer save/load module, save triggers in `GameSessionScreen`, resume UX ("게임 이어하기" prompt), and `CapacitorStorageService`.
- No stats tracking, no stats screen, no settings persistence in M5.
- Category B and C schema and keys are documented in `docs/16_save_progress_architecture.md` so the architecture is stable before implementation begins in a later milestone.

---

## 2026-06-28 - M5: Save System Uses Three Independent Data Categories

**Decision**  
Persistent data is split into three independent categories: Active Game (in-progress game state), Player Statistics (lifetime stats), and App Settings (player preferences). Each category has its own storage key, its own save trigger, and its own retention lifetime. They are never combined into a single save document.

**Reason**  
A single monolithic save document creates tight coupling between concerns with different lifetimes. The Active Game document is deleted when a game ends; Player Statistics must never be deleted when a game ends. Separating them ensures stats cannot be accidentally lost when the active game is cleared.

**Impact**  
- Storage keys: `matgo.v1.activeGame`, `matgo.v1.playerStats`, `matgo.v1.settings`.
- Deleting the active game on game end does not affect stats or settings.
- New data categories in future milestones get their own key — they do not extend an existing document.

---

## 2026-06-28 - M5: Application Layer Owns Save/Load Logic; Platform Layer Owns Storage

**Decision**  
The Application Layer decides when to save, serializes/deserializes save documents, validates loaded state, and runs schema migrations. The Platform Layer implements the storage API (`read`, `write`, `delete`) and has no knowledge of what is stored. The two responsibilities must not cross layers.

**Reason**  
If the Platform Layer validates or interprets save data, it becomes coupled to the Application Layer's schema. If the Application Layer calls storage APIs directly, it becomes coupled to a platform (Capacitor, browser, etc.). The interface boundary (`StorageService`) allows the Application Layer to be tested with an in-memory mock without Capacitor.

**Impact**  
- `StorageService` interface is defined in the Application Layer (dependency inversion).
- `CapacitorStorageService` and `InMemoryStorageService` implement the interface in the Platform Layer.
- The Application Layer never imports a concrete storage implementation.
- The Platform Layer never imports save schema types.

---

## 2026-06-28 - M5: Save Failure Is Non-Fatal; Load Corruption Falls Back to Fresh Start

**Decision**  
If a save write fails, the error is logged and the game continues. There is no save-error UI. If a loaded active game document fails validation or is from a newer schema version, the document is deleted and the player starts fresh from the title screen.

**Reason**  
A failed save during a turn is rarely catastrophic for a local game — at most one turn of progress is lost. Showing a blocking save-error dialog interrupts gameplay for a non-critical failure. Conversely, passing a corrupted or incompatible `GameState` to the engine could cause unpredictable behavior; discarding and starting fresh is safer than attempting partial recovery.

**Impact**  
- Application Layer save calls use fire-and-forget error handling (log, continue).
- Application Layer load calls validate all required fields before passing state to the engine.
- If any validation check fails, the entire active game document is discarded — there is no partial recovery.
- The player is never blocked from starting a new game due to a corrupted save.

---

## 2026-06-28 - M5: `saveVersion` Field in Every Document; Breaking Changes Increment Key Generation

**Decision**  
Every saved JSON document contains a `saveVersion: number` integer field starting at 1. Additive changes (new optional fields with safe defaults) do not increment `saveVersion`. Breaking changes (removed/renamed fields, changed semantics) increment `saveVersion` and require a migration function in the Application Layer. A schema generation change that requires full data discard uses a new storage key (`matgo.v2.*` instead of `matgo.v1.*`).

**Reason**  
Schema versioning without a migration path leads to silent corruption when app versions change. Using the key itself as the generation marker (`v1`, `v2`) allows old and new documents to coexist in storage during a rolling update — the new app reads from `v2` and discards the `v1` document rather than trying to migrate a document it may not be able to read.

**Impact**  
- `saveVersion` must be present and checked on every load.
- Documents with `saveVersion > CURRENT_VERSION` (from a newer app) are treated as unreadable and discarded.
- Migration functions are pure: old document in, new document out — no side effects.
- This PR establishes version 1 as the baseline. No migration functions exist yet.

---

## 2026-06-28 - State Transition Diagrams Must Be Verified Against Engine Source (M3-H1B, M3-H1C)

**Decision**  
Any state transition diagram in the documentation must be verified against engine source code before merging. Specifically: the triggering condition for `GO_STOP_DECISION_REQUIRED` — that `pendingDecision.playerId = currentPlayer.id` — must be reflected correctly in diagrams. A diagram claiming a cross-player Go/Stop trigger (e.g., "Human Go/Stop triggered after AI plays") must be rejected.

**Reason**  
M3-H1A introduced two inaccuracies that were caught in subsequent PRs: (1) the "다시 하기" button was described as resetting to the Idle state when it actually dispatches `START_GAME` directly to `phase: 'playing'`; (2) the state transition diagram showed `AI Turn → Human Go/Stop`, which is structurally impossible — Go/Stop is only triggered for the current player. These errors demonstrate that plausible-sounding diagrams can silently misrepresent engine behavior.

**Impact**  
- New or updated state transition diagrams must cite the engine function or field that enforces the described behavior (e.g., `pendingDecision.playerId` in `applyAction.ts`).
- PR reviews must check diagram accuracy against the implementation, not just readability.
- `createIdleSession()` vs `createGameSession()` call sites are now documented explicitly in `docs/14_ui_state_matrix.md` §3.

---

## 2026-06-28 - QA Checklist and UI State Matrix Are Separate Documents (M3-H1, M3-H1A)

**Decision**  
Manual QA procedure is documented in `docs/13_mvp_playtest_checklist.md` (step-by-step test cases). The authoritative UI state machine specification is documented separately in `docs/14_ui_state_matrix.md` (state definitions, transitions, invariants). The checklist references the matrix by link — it does not duplicate the tables.

**Reason**  
Keeping both in one document creates redundancy and maintenance burden: the same tables appear in two documents and drift out of sync. Separating them makes each document's purpose clear: the checklist tells a tester *what to do* and the matrix tells a developer *how the system works*. The matrix is the reference; the checklist is the procedure.

**Impact**  
- `docs/13_mvp_playtest_checklist.md` §2 contains only a link to `docs/14_ui_state_matrix.md`.
- Element visibility tables, status bar colors, and card highlight rules live in `docs/14_ui_state_matrix.md` only.
- When the state machine changes (new phase, new component), update the matrix first, then verify the checklist references are still accurate.

---

## 2026-06-28 - ScoreBreakdown Is a Reusable Presentational Component (M3-PR7)

**Decision**  
Score breakdown display (광/열/띠/피) is extracted into a standalone `ScoreBreakdown` component with `compact` and `showZeroCategories` props. It is used by both `GameStatusBar` (compact mode) and `ResultPanel` (full mode).

**Reason**  
The same breakdown rendering logic existed as a local `formatBreakdown()` string helper in `GameStatusBar` and was absent from `ResultPanel`. Extracting it into a component eliminates duplication, enforces consistent display across the UI, and makes future styling changes a single-file edit.

**Impact**  
- `ResultPanel` props changed: `humanScore`/`aiScore` removed; `humanScoreBreakdown`/`aiScoreBreakdown` added.
- `GameSessionScreen` no longer accesses `finalResult.scores` for the result panel — it passes `vm.humanScoreBreakdown`/`vm.aiScoreBreakdown` directly.
- Any future component that displays score breakdown must use `ScoreBreakdown`, not a local string helper.

---

## 2026-06-28 - PlayerScoreBreakdown Is Defined in the Application Layer (M3-PR6)

**Decision**  
`PlayerScoreBreakdown` (with `total`, `gwang`, `yeol`, `tti`, `pi` fields) is defined in `src/application/gameSession/gameViewModel.ts` and exported from the Application Layer boundary. It is not re-exported from the engine.

**Reason**  
Re-exporting engine types into the UI would break the boundary: UI components would gain an indirect engine import path. Defining the type independently in the Application Layer keeps the boundary clean. The shape mirrors `PlayerScoreState` in the engine, but the two types are unrelated in the import graph.

**Impact**  
- UI components import `PlayerScoreBreakdown` from `../../application/gameSession/index.js` only.
- Adding new engine score fields does not automatically surface them to the UI — the Application Layer must explicitly choose to expose them.

---

## 2026-06-26 - GameStatusKind Encodes Phase + Turn as a Discriminated Union (M3-PR5)

**Decision**  
A `GameStatusKind` discriminated union (`'humanTurn' | 'aiTurn' | 'humanGoStop' | 'aiGoStop' | 'ended'`) is added to `GameViewModel.statusDisplay`. `GameStatusBar` uses `kind` for color decisions and `label` for display text.

**Reason**  
Before this change, `GameStatusBar` derived its display from a raw `isHumanTurn` boolean, which could not express the `pendingGoStop` or `ended` phases. Adding a pre-computed discriminated union in the ViewModel keeps the conditional logic in one place (`buildStatusDisplay`) and makes component props strictly typed.

**Impact**  
- `GameStatusBar` no longer needs to import or interpret `SessionPhase` directly.
- New phase-specific status displays are added by extending `GameStatusKind` and updating `buildStatusDisplay` — no UI component changes required.

---

## 2026-06-26 - GameSessionScreen Is Split into Presentational Sub-components (M3-PR4)

**Decision**  
`GameSessionScreen` is refactored into a container + five presentational sub-components: `CardButton`, `CardRow`, `GameStatusBar`, `EventLog`, `ResultPanel`. Sub-components receive only the data they need and contain no dispatch logic.

**Reason**  
A single 400-line component is hard to review, test, and extend. The container/presentational split makes the rendering logic independently readable and prevents accidental coupling of sub-component props to session internals.

**Impact**  
- Sub-components are pure rendering functions — they do not call hooks or dispatch actions.
- `GameSessionScreen` is the single owner of `session` state and all `dispatch` calls.
- New UI areas are added as new sub-components, not as inline JSX blocks in `GameSessionScreen`.

---

## 2026-06-26 - UI Components Import Only from the Application Layer Boundary (M3-PR3)

**Decision**  
UI components (`src/components/`) must not import directly from `src/engine/`. All engine types needed by the UI (e.g., `Card`) are re-exported from `src/application/gameSession/index.ts`.

**Reason**  
A direct UI → engine import bypasses the Application Layer contract. If the engine's internal types change, UI components break without going through the Application Layer review path. The re-export from the Application Layer makes the boundary explicit and checkable.

**Impact**  
- `src/application/gameSession/index.ts` is the only import source for UI components that need engine-originated types.
- PR reviews must reject any `import ... from '../../engine/...'` in `src/components/`.
- The Application Layer decides which engine types are surfaced to the UI — not all engine types are eligible.

---

## 2026-06-26 - Event Messages Are Formatted in the Application Layer, Not the UI (M3-PR3)

**Decision**  
`GameEvent[]` is converted to Korean UI strings by `formatGameEvents()` in `src/application/gameSession/gameEventMessages.ts`. `GameSessionState` exposes `lastEventMessages: ReadonlyArray<string>` — a pre-formatted array. UI components render strings directly without interpreting event types.

**Reason**  
If UI components interpret `GameEvent` types, they must import from the engine and embed display logic (Korean strings, conditional phrasing) inside rendering code. Moving formatting to the Application Layer keeps UI components as pure renderers and makes message logic independently testable.

**Impact**  
- `EventLog` receives `messages: ReadonlyArray<string>` — it never sees `GameEvent`.
- New event types require changes in `gameEventMessages.ts` only; no UI component changes are needed.
- `CARD_MATCHED` and `INVALID_ACTION_REJECTED` events are silently filtered (return `null`) — this is documented in `gameEventMessages.ts`.

---

## 2026-06-26 - MVP Rule Open Decisions Are Resolved Before Engine Implementation

**Decision**  
The MVP rule Open Decisions OD-1 through OD-6 are resolved in `docs/12_open_decision_resolution.md` before Milestone 2 engine implementation begins.

**Reason**  
Engine implementation should not rely on implicit or ad-hoc rule choices. Resolving these decisions before coding reduces rework and keeps implementation PRs small and testable.

**Impact**  
- Milestone 2 implementation PRs use the resolved MVP defaults.
- Advanced rule behavior remains deferred to `Ruleset` expansion.
- Claude Code must not invent alternative rule behavior during implementation.

---

## 2026-06-26 - Monetization Is Designed Early but Implemented Late

**Decision**  
The project will document monetization strategy during Milestone 1, but actual ad SDK, billing SDK, product, and entitlement implementation is deferred until release preparation (Milestone 9).

**Reason**  
The game should generate revenue through ads and simple purchases, but monetization must not contaminate the engine or damage the core player experience. Designing it early prevents future coupling between the engine and monetization state; implementing it late prevents MVP scope creep.

**Impact**  
- Engine code must never depend on ads, purchases, product IDs, entitlements, or premium status.
- Monetization must not affect shuffle, hand distribution, scoring, AI difficulty, or win/loss outcome.
- Release preparation will include AdMob, Google Play Billing, entitlement storage, purchase restore, and policy compliance checks.
- Monetization strategy is documented in `docs/11_monetization_strategy.md`.

---

## 2026-06-26 - Milestone 2 Requires AI Design, Testing Strategy, and PR Plan Before Implementation

**Decision**  
Milestone 2 implementation will begin only after MVP AI design (`docs/07_ai_design.md`), engine testing strategy (`docs/08_testing_strategy.md`), and implementation PR plan (`docs/09_pr_plan.md`) are documented and reviewed.

**Reason**  
The engine must be implemented in small, independently testable PRs. Without a defined AI design and testing strategy, implementation risks drifting into UI, content, or platform concerns. The PR plan ensures each PR has a single, clear purpose.

**Impact**  
- Milestone 2 PRs follow the sequence and scope defined in `docs/09_pr_plan.md`.
- AI implementation follows `docs/07_ai_design.md` — correctness-first, random legal action for MVP.
- Engine validation follows `docs/08_testing_strategy.md` — headless simulation must pass before UI work begins.

---

## 2026-06-26 - Engine Boundary and Core Rule Spec Must Precede Implementation

**Decision**  
Engine implementation will not begin until engine boundaries and MVP core rule scope are documented in `docs/03_engine_boundary.md` and `docs/04_game_rule_spec.md`. Open Decisions listed in the rule spec must be resolved before implementing the affected rule.

**Reason**  
The engine is the reusable foundation of the project. Implementing rules, scoring, AI, or state transitions before boundaries are documented risks introducing UI, content, and platform concerns into the engine. Unresolved rule decisions (e.g., how multiple same-month field cards are handled) would force rework during implementation.

**Impact**  
- Milestone 2 implementation PRs must follow the boundaries defined in `docs/03_engine_boundary.md`.
- Rule implementation must follow `docs/04_game_rule_spec.md`.
- Each Open Decision in the rule spec must be resolved before coding the affected rule module.

---

## 2026-06-26 - Advanced Matgo Rules Are Deferred as Ruleset Options

**Decision**  
Only core Matgo rules (2-player, 48-card deck, basic capture, scoring, Go/Stop) are implemented in the MVP. Advanced rules (쪽, 따닥, 뻑, 폭탄, 흔들기, 총통, 피박, 광박, 고박, 멍박, 나가리, regional rules, NPC-specific rules) are deferred and will be added later as `Ruleset` configuration options.

**Reason**  
Implementing all rule variants before the core loop is validated introduces complexity that makes the engine harder to test and reason about. Advanced rules can be layered on top of a stable core without changing the engine's fundamental structure.

**Impact**  
- MVP engine implementation covers only the core rule set listed in `docs/02_mvp_scope.md`.
- Advanced rules must not require changes to the engine core when added later.
- `Ruleset` is designed as a configuration object from the start, even if it only holds default values in the MVP.

---

## 2026-06-26 - Architecture Uses Layered Boundaries

**Decision**  
The project uses six separated layers: UI, Application, Engine, Content, Platform, and Shared. The Engine layer does not depend on UI, Content, or Platform layers. All cross-layer communication follows the dependency direction defined in `docs/01_architecture.md`.

**Reason**  
Layered boundaries keep the Matgo engine reusable, testable, and independent from story, presentation, storage, advertising, and platform-specific code. Without clear boundaries, engine logic accumulates UI assumptions and platform calls that make it impossible to test in isolation or reuse in another title.

**Impact**  
- Future implementation PRs must follow the dependency direction in `docs/01_architecture.md`.
- PR reviews must reject changes that put rules, scoring, shuffle, or state mutation outside the Engine layer.
- UI, Content, and Platform features must communicate with the Engine through the Application Layer.

---

## 2026-06-26 - Engine and Content Must Be Strictly Separated

**Decision**  
The game engine will have no knowledge of story, NPCs, regions, dialogue, background images, BGM, fortune/horoscope data, or reward structures. All content is managed externally as data and injected into the content layer — never into the engine.

**Reason**  
Mixing content into the engine creates tight coupling that makes it expensive to add new worlds, change narratives, or reuse the engine in another title. Separation ensures the engine stays clean and portable.

**Impact**  
- Adding a new region or story must never require modifying engine code.
- Engine code changes are gated to: rules, scoring, shuffle, AI, state, save interface.
- Content teams (Claude, writers, designers) work independently of engine development.

---

## 2026-06-26 - Shuffle and Hand Distribution Must Use Fair Randomness

**Decision**  
Shuffle and hand distribution will always use fair, unbiased randomness. No system will intentionally give a user a favorable or unfavorable hand. Win/loss outcomes are never manipulated.

**Reason**  
Player trust depends on fairness. Manipulating outcomes — even with good intentions (e.g., adjusting difficulty) — breaks the integrity of the game. Difficulty will be managed through AI strength, not card distribution.

**Impact**  
- The shuffle module must be independently testable for statistical fairness.
- Fortune/horoscope/story elements must be implemented in the content layer only and must not feed back into engine randomness.
- Any future difficulty system must operate through AI behavior, not hand stacking.

---

## 2026-06-26 - Completion Over Expansion

**Decision**  
New features will not be added until existing features are complete and working correctly. The project follows the principle: *Complete Before Expand*.

**Reason**  
Premature expansion leads to shallow, half-finished features that accumulate technical debt and reduce overall quality. A fully working core experience is more valuable than many partially working features.

**Impact**  
- Feature requests during active development milestones will be logged but not implemented until the current milestone is complete.
- PR reviews should flag scope creep.
- Each milestone has a single, clearly defined completion condition.

---

## 2026-06-26 - MVP Scope: Engine-Only, No Content Layer

**Decision**  
The MVP will implement only the Matgo engine. Story, NPCs, regions, BGM, background images, fortune/horoscope, rewards, ads, online multiplayer, and rankings are explicitly excluded from the MVP.

**Reason**  
The engine is the foundation. Building content before the engine is stable and validated results in content that must be rebuilt later. Validating the engine first — with a single AI vs. player game — ensures the foundation is solid before anything is layered on top.

**Impact**  
- MVP completion condition: a user can play one full game of Matgo against an AI, from start to finish, without errors.
- Any PR that introduces content-layer code during the MVP phase should be rejected.
- UI/UX in the MVP is functional, not polished.

---

## 2026-06-28 - M4: Interactive Cards and Display-Only Cards Are Separate Components

**Decision**  
`CardButton` (`<button>`) is used for hand cards and field cards where interaction is possible. `DisplayCard` (`<span>`) is used for captured card piles where display is the only purpose. Display-only cards must never be rendered as a disabled button.

**Reason**  
`<button disabled>` implies that the element could be interactable in some state. For captured cards — which are always public and never selectable — this is semantically wrong and misleads assistive technology. A `<span>` conveys no affordance.

**Impact**  
- Any new display-only card context (card preview, history view, reference panel) must use `DisplayCard`, not `CardButton`.
- `cardLabel()` is shared between both components — no label duplication.
- `DisplayCard` carries `aria-label` and `title` but no interactive ARIA attributes.

---

## 2026-06-28 - M4: `ActionHint` Is UI Guidance, Not Game Logic

**Decision**  
`ActionHint` is a presentational component that shows the player what to do next. It reads `statusKind` and `isTargetSelectionPending` from props and renders a hint string. It does not dispatch, does not call the engine, and does not compute game state.

**Reason**  
Mixing guidance rendering with action dispatch blurs the boundary between presentation and logic. `GameSessionScreen` owns dispatch; `buildGameViewModel` owns state derivation. `ActionHint` must stay on the presentation side of that line.

**Impact**  
- All state derivation that `ActionHint` needs must be pre-computed in `GameSessionScreen` or `buildGameViewModel` and passed as props.
- Adding a new `GameStatusKind` requires adding a matching entry to `ActionHint`'s `HINT_TEXT` map — no other component changes.
- `role="status"` + `aria-live="polite"` ensure screen readers announce hint changes without disruption.

---

## 2026-06-28 - M4: `GoStopPanel` Explains the Choice but Does Not Decide the Result

**Decision**  
`GoStopPanel` renders the human Go/Stop decision UI — heading, guidance text, and two buttons. It dispatches `CHOOSE_GO` or `CHOOSE_STOP`. Winner determination happens inside the Application Layer after the dispatch; `GoStopPanel` never computes or implies the outcome.

**Reason**  
In the MVP engine, choosing Stop ends the game but the winner is determined by score comparison — not by pressing Stop. Labelling the Stop button "승리 선언" (victory declaration) would be factually wrong; the human could still lose if the AI score is higher.

**Impact**  
- Stop button copy: "게임 종료" (not "승리 선언").
- Stop `aria-label`: "스톱 — 게임 종료".
- `ResultPanel` is the authoritative outcome display; `GoStopPanel` never indicates who won.

---

## 2026-06-28 - M4: `ResultPanel` Is the Only Ended-State Next-Action UI

**Decision**  
In the `ended` session phase: `ActionHint` renders `null`, `GoStopPanel` is not shown, and `ResultPanel` is the sole UI region that presents the outcome and the restart action. Restart dispatches `START_GAME` directly to Human Turn — the Idle screen is not shown between games.

**Reason**  
Showing multiple UI elements that both summarize outcome and offer next steps (ActionHint + ResultPanel) creates redundancy and visual noise. `ResultPanel` is purpose-built for this role; `ActionHint`'s null return is intentional and documented.

**Impact**  
- `HINT_TEXT.ended = null` in `ActionHint` — this is a documented intentional omission, not a missing entry.
- The "다시 하기" button in `ResultPanel` dispatches `START_GAME`, which calls `createGameSession()` and returns `phase: 'playing'` directly.
- `createIdleSession()` is called only once (on mount via `useReducer` initializer) — never on restart.

---

## 2026-06-26 - M4: `cardInteractionLabel()` as Single Source of Truth

**Decision**  
All text that identifies a `CardButton`'s interaction state — both the visible badge line and the `aria-label` suffix — is produced by a single helper, `cardInteractionLabel(highlight: CardHighlight): string`.

**Reason**  
Without a shared function, badge text and aria-label text can drift. A card labelled "선택됨" visually but announced as "selected" by screen readers is a bug. One function eliminates the class.

**Impact**  
- `CardButton.tsx` imports only `cardInteractionLabel()` for both badge and aria-label.
- Tests cover `cardInteractionLabel()` exhaustively (all four `CardHighlight` values).
- Any future change to interaction state copy must touch exactly one location.

---

## 2026-06-26 - M4: `DisplayCard` (`<span>`) vs `CardButton` (`<button>`) for Display-Only Contexts

**Decision**  
Captured card piles render via `DisplayCard`, a `<span>`-based chip component. `CardButton`, a `<button>`, is reserved for interactive card slots only.

**Reason**  
Rendering a `<button disabled>` for display-only cards misleads assistive technology: a button implies that interaction is possible in principle, even when disabled. A `<span>` conveys no affordance.

**Impact**  
- `DisplayCard` receives `aria-label` = `카드명, 획득 카드` and `title` = `카드명 획득 카드`.
- `cardLabel()` is imported from `CardButton.tsx` — no duplication.
- Any new display-only card context (preview, history, reference) should use `DisplayCard`, not `CardButton`.

---

## 2026-06-26 - M4: `ActionHint` Uses `role="status"` + `aria-live="polite"`

**Decision**  
`ActionHint` is rendered as `<div role="status" aria-live="polite">`. It returns `null` for the `ended` state.

**Reason**  
`role="status"` announces hint changes to screen readers without interrupting the user. `aria-live="polite"` means announcements wait for idle time — not intrusive. The `ended` state needs no hint; returning null avoids an empty live region.

**Impact**  
- `isTargetSelectionPending` takes priority over `statusKind`: "바닥패를 선택하세요" appears whenever target selection is pending, regardless of the underlying status.
- Any new game state that requires a hint must add a `HINT_TEXT` entry.
- The `ended` entry explicitly maps to `null` to document the intentional omission.

---

## 2026-06-26 - M4: "스톱" Ends the Game; Winner Is Determined by Score Comparison

**Decision**  
The Stop button copy reads "게임 종료" (game end). It does not say "승리 선언" (victory declaration).

**Reason**  
Pressing Stop ends the game, but the winner is determined by comparing scores — the player who pressed Stop could lose if the AI's score is higher. Calling it a "victory declaration" is factually wrong.

**Impact**  
- `GoStopPanel` button sub-label: "게임 종료".
- `aria-label`: "스톱 — 게임 종료".
- Guidance text: "지금 점수로 게임을 종료합니다."
- `ResultPanel` remains the authoritative outcome display.

---

## 2026-06-26 - M4: `ResultPanel` Uses Outcome-Aware Styling

**Decision**  
`ResultPanel` drives `background`, `border`, and `color` from an `OUTCOME_STYLE` map keyed on `'win' | 'lose' | 'draw'`. Prior to M4 the panel was always styled as green (win) regardless of outcome.

**Reason**  
A red result panel for a loss is a primary UI affordance — the player should not need to read the text to know they lost.

**Impact**  
- win: `#e8f5e9` / `#4caf50` / `#2a7`
- lose: `#fdecea` / `#e57373` / `#c33`
- draw: `#f5f5f5` / `#bbb` / `#555`
- `<section aria-label="게임 결과">` wraps the panel; `<h2>게임 종료</h2>` is always neutral — only the outcome line carries color.

---

## 2026-06-26 - Working Title Is Provisional

**Decision**  
The current project name **팔도맞고 1975** is a working title (가칭). The final name will be chosen after the world-building, tone, story, and player experience are sufficiently developed.

**Reason**  
A name chosen too early may not fit the final identity of the game. The world, atmosphere, and experience should inform the name — not the other way around.

**Impact**  
- Internal documents, code, and repo names may use 팔도맞고 1975 as a placeholder.
- No brand assets, app store listings, or external communications should treat this name as final.
- A naming review should be scheduled as part of the content milestone.
