# MVP Playtest Checklist

## 1. Purpose

This document defines a manual playtest protocol for the current Minimal Playable UI.

The checklist covers every reachable UI state and the transitions between them. Run this checklist whenever:

- A new PR modifies `GameSessionScreen`, any sub-component, or the Application Layer.
- The engine's `GameState` shape changes.
- A new session phase or `GameStatusKind` is added.

The goal is not to replace automated tests. The goal is to catch visual regressions and interaction breakdowns that unit tests cannot observe.

---

## 2. UI State Matrix

UI state behavior is documented separately in:

- [docs/14_ui_state_matrix.md](14_ui_state_matrix.md)

Run that matrix together with this checklist when reviewing PRs that touch `src/components/game/` or `src/application/gameSession/`.

---

## 3. Quick Smoke Test

Run this first. If it fails, stop — the app is broken.

- [ ] App loads without a console error.
- [ ] The idle screen shows the title "맞고" and the "새 게임 시작" button.
- [ ] Clicking "새 게임 시작" transitions immediately to the Human Turn state.
- [ ] `GameStatusBar` shows "▶ 내 차례" in green.
- [ ] `ActionHint` shows "낼 카드를 선택하세요" with a green left border.
- [ ] Hand cards are shown with yellow-orange borders.
- [ ] AI face-down card placeholders are visible in the AI area.
- [ ] Field cards are visible in the field area.

---

## 4. Happy Path — Human Turn → AI Turn cycle

**Precondition:** App is in Human Turn state.

- [ ] At least one hand card has a yellow-orange border (legal to play).
- [ ] Clicking an illegal card does nothing (no state change, no error).
- [ ] Clicking a legal hand card triggers an action:
  - If `multiTargetCardIds` does **not** include this card → card is played immediately, game advances.
  - If `multiTargetCardIds` includes this card → enters target selection mode (see section 6).
- [ ] After the human plays, status transitions to "⌛ AI 차례" (AI Turn).
- [ ] `ActionHint` updates to "AI가 생각 중입니다…" with an amber left border.
- [ ] AI Turn auto-advances after ~400 ms — no user action needed.
- [ ] After AI plays, status returns to "▶ 내 차례".
- [ ] `ActionHint` returns to "낼 카드를 선택하세요" with a green left border.
- [ ] The `EventLog` updates after each action (shows the last 1–5 Korean messages).
- [ ] Scores in `GameStatusBar` are non-decreasing.
- [ ] Score breakdown row (광/열/띠/피) appears as soon as either player scores > 0.

---

## 5. Target Selection Flow (OD-2)

This flow is reached when two or more same-month cards are on the field and the human plays a card of that month.

**How to reproduce (manual):** Play until two field cards share a month. This may not occur on every game.

- [ ] Clicking the multi-target hand card shows "바닥패를 선택하세요" prompt and a "취소" button.
- [ ] `ActionHint` updates to "바닥패를 선택하세요" (same text, different location — the prompt is inside the human area; `ActionHint` is above the board).
- [ ] The hand card changes highlight to `selected` (blue border).
- [ ] Valid field card targets appear with `target` highlight (red border).
- [ ] Clicking a valid target field card completes the play (both highlights clear, game advances).
- [ ] Clicking "취소" clears the selection (hand card returns to `legal` highlight, prompt disappears).
- [ ] Clicking a different legal hand card while one is selected deselects the first and selects the new one (or plays immediately if that card is not multi-target).
- [ ] While in target selection mode, clicking an illegal hand card does nothing.

---

## 6. Human Go/Stop Decision

**Precondition:** Human player's score reaches or exceeds the threshold (7 points) during their play.

- [ ] Status bar transitions to "고/스톱 선택 중" in orange.
- [ ] `ActionHint` updates to "고 또는 스톱을 선택하세요" with a gold left border.
- [ ] The Go/Stop panel appears below the event log with the human's current score and two buttons: "고 (계속)" and "스톱 (종료)".
- [ ] Hand cards are shown (non-clickable, since it is not a card-play turn).
- [ ] Clicking "스톱 (종료)" ends the game → `ResultPanel` appears (see section 8).
- [ ] Clicking "고 (계속)" continues the game → AI takes its turn → returns to Human Turn or AI Go/Stop.
- [ ] The Go/Stop panel disappears after a decision is made.

---

## 7. AI Go/Stop Decision

**Precondition:** AI player's score reaches or exceeds the threshold during its play.

- [ ] Status bar transitions to "AI 고/스톱 선택 중" in gray.
- [ ] `ActionHint` updates to "AI가 고/스톱을 결정 중입니다…" with a gray left border.
- [ ] No Go/Stop panel is shown (AI decides automatically).
- [ ] AI auto-advances after ~400 ms (same timer as AI Turn).
- [ ] After the AI's decision, status returns to Human Turn or transitions to Ended.
- [ ] `EventLog` shows "AI가 고! (N번째)" or "AI가 스톱!" message.

---

## 8. Game End — ResultPanel

**Triggered by:** Human chooses Stop, or the draw pile is exhausted.

- [ ] `ActionHint` is **not** shown (it returns null for the `ended` state).
- [ ] `ResultPanel` appears with:
  - [ ] "게임 종료 — 승리!" / "게임 종료 — 패배..." / "게임 종료 — 무승부"
  - [ ] Reason: "스톱" or "덱 소진"
  - [ ] Human score with breakdown, e.g. "내 점수: 7점 (광2 · 피5)"
  - [ ] AI score with breakdown, e.g. "AI 점수: 3점 (피3)"
  - [ ] "다시 하기" button
- [ ] Status bar shows "게임 종료" in gray.
- [ ] Go/Stop panel is **not** shown.
- [ ] Hand cards are still visible (non-clickable).
- [ ] Clicking "다시 하기" dispatches `START_GAME` → transitions directly to Human Turn. The idle screen is **not** shown between games.
- [ ] The new game starts correctly: "▶ 내 차례", legal hand cards highlighted, field cards visible.

---

## 9. Error State

Invalid actions must never crash the app. They should set `session.error` and leave game state unchanged.

**How to trigger (manual):** Sending a malformed dispatch is not possible via the standard UI. This state is primarily tested via `gameSessionReducer.test.ts`. Verify in the UI:

- [ ] The error box is **not** visible during normal play (only when `session.error !== null`).
- [ ] If an error is somehow injected, the red error box appears with the message text.
- [ ] `lastEventMessages` is empty when an error is present (the invariant from M3-PR4A).
- [ ] Game state is unchanged after a rejected action — the player can continue playing.

---

## 10. Score Breakdown Visibility

- [ ] At game start, the secondary breakdown row in `GameStatusBar` is hidden (both totals are 0).
- [ ] Once either player scores > 0, the breakdown row appears.
- [ ] Only non-zero categories are shown (e.g. "피3" only; "광0" is not shown).
- [ ] In `ResultPanel`, the breakdown for each player is shown even when the other player has no breakdown.
- [ ] `ResultPanel` shows `광N · 열N · 띠N · 피N` correctly for each category > 0.

---

## 11. Regression Checklist After Any PR

Run these checks for any PR that modifies components in `src/components/game/` or `src/application/gameSession/`:

- [ ] Smoke test (section 3) passes.
- [ ] Human turn → AI turn cycle works (section 4).
- [ ] `ActionHint` updates with every state transition (sections 3, 4, 6, 7).
- [ ] `ActionHint` shows "바닥패를 선택하세요" during target selection (section 5).
- [ ] `ActionHint` is **not** shown in the Ended state (section 8).
- [ ] `EventLog` updates correctly after each action.
- [ ] Score breakdown row appears and disappears correctly (section 10).
- [ ] `ResultPanel` shows correct winner, reason, and breakdown (section 8).
- [ ] "다시 하기" starts a new game directly in Human Turn, not through Idle (section 8).
- [ ] `tsc --noEmit` reports 0 errors.
- [ ] All 422+ tests pass (`npx vitest run`).

---

## 12. Not in Scope for This Checklist

The following are out of scope for the MVP playtest and must not be added:

- Card images or artwork
- Animations or transitions
- Sound effects or BGM
- Special rules: 쪽/따닥/뻑/폭탄/흔들기/총통/피박/광박/고박/멍박/나가리
- Special scores: 고도리/홍단/청단/초단/쌍피/비광
- Go multiplier (goCount is tracked; multiplier is not applied)
- NPC names, story, region names
- Ads, billing, entitlements
- Save / load / cloud sync
- Online multiplayer

---

## 13. Known Gaps (to be addressed in later milestones)

| Gap | Impact | Planned Milestone |
|---|---|---|
| No card images — cards identified by text label only | Low (functional, not visual) | UI polish |
| No animation between states | Low (functional playtest unaffected) | UI polish |
| Error state cannot be triggered via normal play | Low (covered by unit tests) | — |
| Go multiplier not applied to final score | Medium (game balance) | After core loop stable |
| OD-2 multi-target flow rare to hit manually | Low (covered by engine tests) | — |
