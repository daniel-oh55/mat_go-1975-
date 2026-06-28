# Milestone 4 Playability Polish — Review

## 1. Scope

### Included in Milestone 4

- `CardButton` interaction clarity (touch target, border consistency, state badges, `aria-label`, `aria-disabled`, `aria-pressed`)
- `DisplayCard` for captured card display (read-only `<span>` chip)
- `ActionHint` context-sensitive guidance bar
- `GoStopPanel` extracted presentational component with choice explanation
- `ResultPanel` clarity (outcome-aware styling, separated heading, reason line, restart button)
- MVP playtest checklist updates (`docs/13_mvp_playtest_checklist.md`)
- UI state matrix updates (`docs/14_ui_state_matrix.md`)

### Excluded from Milestone 4

- Card images and artwork
- Animation and state transition effects
- 1970s theme visual design
- Story, NPC, region content
- Save / load / cloud sync
- Ads, billing, entitlements
- Online multiplayer
- BGM, sound effects

---

## 2. Player Flow Checklist

The complete player flow reachable from the current UI:

```
Idle
  → "새 게임 시작" button
Human Turn
  → Card selection (legal card highlighted)
    → Target selection (if multi-target card played)
  → Card played → AI Turn
    → (auto-advance 400 ms) → Human Turn
      or
    → Human Go/Stop (human score ≥ threshold)
      → Human clicks 고 → AI Turn
      → Human clicks 스톱 → Ended
    → AI Go/Stop (AI score ≥ threshold, auto-advance 400 ms)
      → AI decides 고 → Human Turn
      → AI decides 스톱 → Ended
    → Ended (deck exhausted)
  → Ended (deck exhausted during human's turn)
Ended
  → ResultPanel
    → "다시 하기" → Human Turn (Idle is NOT re-entered)
```

### Key UI Component per Flow State

| Flow state | Main UI component |
|---|---|
| Idle | `GameSessionScreen` (title + start button) |
| Human Turn | `GameStatusBar`, `ActionHint`, `CardButton` |
| Target Selection | `ActionHint`, `CardButton` (target state), target prompt |
| AI Turn | `GameStatusBar`, `ActionHint`, `EventLog` |
| Human Go/Stop | `ActionHint`, `GoStopPanel` |
| AI Go/Stop | `ActionHint` |
| Ended | `ResultPanel` |
| Restart | `ResultPanel` → `GameSessionScreen` dispatches `START_GAME` |

---

## 3. Component Responsibility Table

| Component | Responsibility | Must not do |
|---|---|---|
| `CardButton` | Interactive card display — hand cards and field cards that can be selected or targeted | Scoring logic, rule evaluation, dispatch |
| `DisplayCard` | Read-only card chip for display-only contexts (captured piles) | Click handling, button affordance |
| `ActionHint` | Show the player what to do next based on current status | Dispatch actions, call engine, evaluate game state |
| `GoStopPanel` | Render the human Go/Stop choice UI with explanation text | Decide winner, evaluate outcome, dispatch anything other than `CHOOSE_GO` / `CHOOSE_STOP` |
| `ResultPanel` | Display final outcome, score breakdown, and restart button | Change winner determination, alter restart flow |
| `GameSessionScreen` | Own session state, dispatch all human actions, auto-advance AI turns | Implement engine rules, call engine directly |
| `GameStatusBar` | Show current status label, scores, score breakdown | Dispatch, interpret raw game events |
| `EventLog` | Display the last 1–5 Korean event messages | Format raw engine events directly |

---

## 4. Hidden Information Check

The following invariants must hold at all times. A PR that violates any of these must be rejected.

- **AI hand contents are never rendered.** `GameViewModel.aiHandCount` is a `number` — the array of `Card` objects is never exposed to the UI.
- **AI hand is shown only as count and face-down card placeholders.** `GameSessionScreen` renders `Array.from({ length: vm.aiHandCount }, ...)` placeholder elements only.
- **Draw pile contents are never rendered.** `GameViewModel.drawPileCount` is a `number` — the actual card array is not in `GameViewModel`.
- **Draw pile is shown only as count.** `GameStatusBar` displays `drawPileCount` as a number label only.
- **Captured cards are public and may be rendered.** Both `humanCaptured` and `aiCaptured` are `ReadonlyArray<Card>` in `GameViewModel`. They are correctly displayed via `DisplayCard`.
- **UI must not import from the engine directly.** All UI imports go through `src/application/gameSession/index.ts`. Any `import ... from '../../engine/...'` in `src/components/` must be rejected at PR review.

---

## 5. M4 Completion Criteria

- [ ] Card state is readable without relying only on color (text badge + border shape + `aria-label` all convey state).
- [ ] The player can tell what to do next from `ActionHint` at every state except Ended.
- [ ] Human Go/Stop (`GoStopPanel`) explains both choices before the player decides.
- [ ] `ResultPanel` clearly separates: outcome (승리/패배/무승부), reason (스톱/덱 소진), scores, and restart.
- [ ] Captured cards use `DisplayCard` (not disabled `CardButton`) everywhere captured piles are rendered.
- [ ] AI hand contents and draw pile contents remain hidden — count/placeholders only.
- [ ] Restart starts a new game directly in Human Turn state, not via Idle.
- [ ] `docs/13_mvp_playtest_checklist.md` matches the current UI (section numbers, component names, flow steps).
- [ ] `docs/14_ui_state_matrix.md` matches the current UI (visibility matrix, component specs, hidden information).
- [ ] All tests pass (`npx vitest run`).
- [ ] TypeScript check passes (`npx tsc --noEmit`).
