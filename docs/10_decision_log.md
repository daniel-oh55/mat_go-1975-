# Decision Log

This file records key decisions made during the project. Each entry documents what was decided, why, and what impact it has on future development.

Entries are listed in reverse chronological order (newest first).

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

## 2026-06-26 - Working Title Is Provisional

**Decision**  
The current project name **팔도맞고 1975** is a working title (가칭). The final name will be chosen after the world-building, tone, story, and player experience are sufficiently developed.

**Reason**  
A name chosen too early may not fit the final identity of the game. The world, atmosphere, and experience should inform the name — not the other way around.

**Impact**  
- Internal documents, code, and repo names may use 팔도맞고 1975 as a placeholder.
- No brand assets, app store listings, or external communications should treat this name as final.
- A naming review should be scheduled as part of the content milestone.
