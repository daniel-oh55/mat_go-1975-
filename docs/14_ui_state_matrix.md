# UI State Matrix

## 1. Purpose

This document is the authoritative reference for the UI state machine implemented in `GameSessionScreen`.

It complements `docs/13_mvp_playtest_checklist.md` (which is procedural / QA-focused) by specifying:

- The exact conditions that define each UI state.
- The transitions between states and what triggers them.
- The visibility and interactivity rules for each UI element per state.
- The auto-advance behavior of the AI turn timer.
- Invariants that must hold across all states.

Use this document when implementing a new component, adding a new session phase, or reviewing a PR that modifies `GameSessionScreen`, `gameSessionReducer`, or `buildGameViewModel`.

---

## 2. State Taxonomy

The UI state is the product of two independent signals:

| Signal | Source | Values |
|---|---|---|
| `SessionPhase` | `GameSessionState.phase` | `idle` · `playing` · `pendingGoStop` · `ended` |
| `GameStatusKind` | `GameViewModel.statusDisplay.kind` | `humanTurn` · `aiTurn` · `humanGoStop` · `aiGoStop` · `ended` |

`SessionPhase` drives which major UI regions are visible. `GameStatusKind` drives color and label in `GameStatusBar` and the Go/Stop panel gating. Together they define six meaningful display states.

| Display State | `SessionPhase` | `GameStatusKind` | `isHumanTurn` | `isPendingGoStopDecisionForHuman` |
|---|---|---|---|---|
| **Idle** | `idle` | — | — | — |
| **Human Turn** | `playing` | `humanTurn` | `true` | `false` |
| **AI Turn** | `playing` | `aiTurn` | `false` | `false` |
| **Human Go/Stop** | `pendingGoStop` | `humanGoStop` | — | `true` |
| **AI Go/Stop** | `pendingGoStop` | `aiGoStop` | — | `false` |
| **Ended** | `ended` | `ended` | — | — |

> `GameStatusKind` is not available in the Idle state because `viewModel` is `null` when `phase === 'idle'`.

---

## 3. State Transitions

```
[App Mount]
  │  createIdleSession() — useReducer initializer, called once only
  ▼
[Idle]
  │  START_GAME dispatch (human clicks "새 게임 시작")
  ▼
[Human Turn] ←──────────────────────────────────────────────────────┐
  │  Human plays a card (SUBMIT_HUMAN_ACTION)                        │
  ▼                                                                  │
[AI Turn]                                                           │
  │  ADVANCE_AI (auto, 400 ms delay)                                │
  │                                                                  │
  ├──→ [Human Turn] ────────────────────────────────────────────→ ─┘
  │     (human score < threshold, or human chose Go)
  │
  ├──→ [Human Go/Stop]
  │     (human score ≥ threshold after AI plays)
  │       │  Human chooses Stop → [Ended]
  │       │  Human chooses Go  → [AI Turn]
  │
  └──→ [Ended]
        (deck exhausted)

[Human Turn]
  │  Human plays a card that pushes human score ≥ threshold
  ▼
[Human Go/Stop]
  │  Human chooses Stop → [Ended]
  │  Human chooses Go  → [AI Turn]

[AI Turn]
  │  AI play pushes AI score ≥ threshold
  ▼
[AI Go/Stop]
  │  ADVANCE_AI (auto, 400 ms delay)
  ├──→ AI chooses Stop → [Ended]
  └──→ AI chooses Go  → [Human Turn]

[Ended]
  │  Human clicks "다시 하기" — START_GAME dispatch
  ▼
[Human Turn]   ← Idle is NOT re-entered
```

> **Restart note:** Clicking "다시 하기" dispatches `START_GAME`, which calls `createGameSession()` and returns `phase: 'playing'` directly. `createIdleSession()` is the `useReducer` initialization function — it is called once on mount, never on restart. The Idle screen is never shown between games.

---

## 4. Element Visibility Matrix

| UI Element | Idle | Human Turn | AI Turn | Human Go/Stop | AI Go/Stop | Ended |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Title "맞고" | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| "새 게임 시작" button | ✓ | — | — | — | — | — |
| `GameStatusBar` (primary row) | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GameStatusBar` score breakdown row | — | when score > 0 | when score > 0 | when score > 0 | when score > 0 | when score > 0 |
| AI area (face-down card placeholders) | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Field area | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Target selection prompt + Cancel button | — | when `pendingCardId ≠ null` | — | — | — | — |
| Human hand area | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| `EventLog` | — | when msgs > 0 | when msgs > 0 | when msgs > 0 | when msgs > 0 | when msgs > 0 |
| Go/Stop panel | — | — | — | ✓ | — | — |
| `ResultPanel` | — | — | — | — | — | ✓ |
| Error box | — | when error ≠ null | when error ≠ null | when error ≠ null | when error ≠ null | when error ≠ null |
| Captured cards (collapsible) | — | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 5. Card Interactivity Matrix

### Human hand cards

| Condition | `CardHighlight` | Clickable |
|---|---|---|
| Not human's turn (`isHumanTurn === false`) | `none` | No |
| Human's turn, card not in `legalCardIds` | `none` | No |
| Human's turn, card in `legalCardIds`, not multi-target | `legal` | Yes — plays immediately |
| Human's turn, card in `legalCardIds`, is multi-target, not yet selected | `legal` | Yes — enters target selection |
| Human's turn, card in `legalCardIds`, is multi-target, this card is selected | `selected` | Yes — deselects (toggle) |
| Human's turn, card in `legalCardIds`, is multi-target, another card is selected | `legal` | Yes — switches selection to this card |

### Field cards

| Condition | `CardHighlight` | Clickable |
|---|---|---|
| No hand card is in pending selection (`pendingCardId === null`) | `none` | No |
| Hand card is pending, this field card is **not** a valid target | `none` | No |
| Hand card is pending, this field card **is** a valid target | `target` | Yes — completes play |

---

## 6. Auto-Advance Behavior

`useEffect` in `GameSessionScreen` fires a 400 ms timer to dispatch `ADVANCE_AI` whenever:

```
session.phase === 'playing'   AND   vm.isHumanTurn === false
  OR
session.phase === 'pendingGoStop'   AND   vm.isPendingGoStopDecisionForHuman === false
```

The timer is cancelled if the session changes before it fires (`clearTimeout` in the cleanup). This means any dispatch during the 400 ms window restarts the timer for the new state.

> **Note:** The 400 ms delay is a UX choice, not an engine constraint. The engine itself is synchronous — ADVANCE_AI can be dispatched at any time.

---

## 7. Status Bar Display Rules

| `GameStatusKind` | Label | Hex color |
|---|---|---|
| `humanTurn` | ▶ 내 차례 | `#2a7` |
| `aiTurn` | ⌛ AI 차례 | `#a72` |
| `humanGoStop` | 고/스톱 선택 중 | `#c8860a` |
| `aiGoStop` | AI 고/스톱 선택 중 | `#888` |
| `ended` | 게임 종료 | `#555` |

The score breakdown row (광/열/띠/피) is shown when `humanScoreBreakdown.total > 0 || aiScoreBreakdown.total > 0`. Individual categories that are 0 are omitted from the display.

---

## 8. Error State Rules

- `session.error` is `null` during normal play.
- An error is set when the reducer rejects an action (all 10 error paths in `gameSessionReducer`).
- When `error !== null`, `lastEventMessages` is always `[]` — stale messages are never shown alongside an error (invariant established in M3-PR4A).
- The error box is shown when `session.error !== null`.
- Game state is **not** mutated on error — the player can continue.
- The error box is cleared on the next successful action (the reducer always resets `error: null` on success).

---

## 9. Invariants

These must hold at all times. A PR that violates any of these must be rejected.

| Invariant | Where enforced |
|---|---|
| `viewModel === null` iff `phase === 'idle'` | `createIdleSession`, `gameSessionReducer` |
| `gameState === null` iff `phase === 'idle'` | `createIdleSession`, `gameSessionReducer` |
| `error !== null` → `lastEventMessages.length === 0` | All error paths in `gameSessionReducer` |
| `lastEventMessages` is derived from `lastEvents` via `formatGameEvents` | Success paths in `gameSessionReducer` |
| UI never imports directly from the engine | Application Layer re-exports `Card`; UI imports only from `application/gameSession/index.js` |
| Engine is never called from UI components | All engine calls go through `gameSessionReducer` |
| `humanScore === humanScoreBreakdown.total` | `buildGameViewModel` derives both from the same source |
| `aiScore === aiScoreBreakdown.total` | Same as above |

---

## 10. Hidden Information

Matgo has asymmetric information. The human player can see only what is legally visible. `GameViewModel` enforces this boundary — the AI's hand and the draw pile top card are never exposed to the UI.

### What the human player can see

| Data | `GameViewModel` field | Notes |
|---|---|---|
| Own hand | `humanHand: ReadonlyArray<Card>` | Full card objects |
| Field cards | `fieldCards: ReadonlyArray<Card>` | All cards on the field |
| Both captured piles | `humanCaptured`, `aiCaptured` | Full card objects |
| Own score (total + breakdown) | `humanScore`, `humanScoreBreakdown` | Derived from `scoreState` |
| AI score (total + breakdown) | `aiScore`, `aiScoreBreakdown` | AI score is public in Matgo |
| Number of AI hand cards | `aiHandCount: number` | Count only — not the cards |
| Number of draw pile cards | `drawPileCount: number` | Count only — not the cards |
| Legal actions for own turn | `legalCardIds`, `legalPlayActions` | Computed by engine; empty when not human's turn |
| Game status and phase | `statusDisplay`, `phase` | Pre-computed in Application Layer |

### What the human player cannot see

| Hidden Data | How it is hidden |
|---|---|
| AI hand cards | `GameViewModel` exposes `aiHandCount: number` only — never `aiHand: Card[]` |
| Draw pile top card | `drawPileCount: number` only — the actual cards are not in `GameViewModel` |
| AI decision logic | AI runs inside `ADVANCE_AI` in the reducer — result is observed, not the process |
| Future draw pile cards | Not in `GameViewModel` at any point |

> This boundary is structural, not just a display choice. `buildGameViewModel` receives the full `GameState` (which includes the AI hand and draw pile) but deliberately maps these to counts. The UI never has access to the underlying arrays.

---

## 11. Application Layer Boundary

The Application Layer (`src/application/`) is the only permitted import source for UI components. UI components in `src/components/` must never import directly from `src/engine/`.

### Import rules

| Allowed in UI (`src/components/`) | Source |
|---|---|
| `Card` (type) | Re-exported from `src/application/gameSession/index.ts` |
| `PlayerScoreBreakdown` | Defined in Application Layer (`gameViewModel.ts`) — not a re-export from engine |
| `GameViewModel`, `LegalPlayAction` | Defined in Application Layer |
| `GameStatusKind`, `GameStatusDisplay` | Defined in Application Layer |
| `GameSessionState`, `SessionPhase` | Defined in Application Layer |
| `GameSessionReducerAction` | Defined in Application Layer |
| `gameSessionReducer`, `createIdleSession`, `buildGameViewModel` | Exported from Application Layer |
| `HUMAN_PLAYER_ID`, `AI_PLAYER_ID` | Exported from Application Layer |
| `formatGameEvents` | Defined in Application Layer |

| Prohibited in UI | Why |
|---|---|
| `import ... from '../../engine/...'` | Bypasses Application Layer contract; breaks boundary |
| Calling engine functions directly | Engine calls must go through `gameSessionReducer` only |
| Interpreting `GameEvent` types in components | Events are converted to Korean strings by `formatGameEvents` before reaching UI |

### How the boundary is enforced

- **Convention**: all UI imports from `'../../application/gameSession/index.js'` only.
- **PR review**: any `import ... from '../../engine/...'` in `src/components/` must be rejected.
- **Re-export gate**: the Application Layer `index.ts` explicitly controls which engine types are surfaced to the UI. Adding a new engine type to the UI requires a deliberate change to `index.ts`.

### Types defined in the Application Layer (not re-exported from engine)

`PlayerScoreBreakdown`, `GameStatusKind`, `GameStatusDisplay`, `LegalPlayAction` mirror engine shapes but are defined independently in `gameViewModel.ts`. This means:

- A change to the engine's internal type shape does not automatically surface to the UI.
- The Application Layer decides what the UI sees.
- Future engine types can be introduced without any UI impact until explicitly mapped.

---

## 12. Relationship to Other Documents

| Document | Contents |
|---|---|
| [13_mvp_playtest_checklist.md](13_mvp_playtest_checklist.md) | Manual QA protocol — what to test and how |
| [01_architecture.md](01_architecture.md) | Layer boundaries and dependency direction |
| [05_data_flow.md](05_data_flow.md) | Game flow, event direction, AI turn flow |
| [03_engine_boundary.md](03_engine_boundary.md) | Engine responsibilities and PR review checklist |
