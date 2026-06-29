# One Full Game Playability Review

## 1. Purpose

This document records the findings of M5.5-PR1: a playability review verifying that a player can complete one full game of 맞고 — from launch to game-end — without blockers.

Scope: all code delivered through M5-H1A (Milestone 5, including the `isStartingGame` reset fix).

This is not a feature review. The question is:
> "Can a real player start the app, play one full game, see a result, and restart — without getting stuck?"

---

## 2. Full Player Flow

The complete flow reachable from the current UI, including M5 Save/Resume:

```
[App Launch]
  │  loadActiveGame runs (async, isCheckingResume = true)
  │
  ├── No saved game found
  │     └── Idle: "새 게임 시작" enabled
  │
  └── Saved game found
        └── Idle: "게임 이어하기" + "새 게임 시작" both available
              │  Click "게임 이어하기"
              └── Human Turn (game restored exactly)
                    → [same as below]
              │  Click "새 게임 시작"
              └── [saves deleted, new game starts]

[Idle]
  │  Click "새 게임 시작"
  ▼
[Human Turn]
  │
  ├── Play non-multi-target card → field resolves → [AI Turn]
  │
  ├── Play multi-target card → [Target Selection]
  │     │  Click valid field target → play completes → [AI Turn]
  │     └── Click "취소" → returns to [Human Turn]
  │
  └── Score reaches threshold after capture → [Human Go/Stop]
        │  Click "스톱" → [Ended]
        └── Click "고" → [AI Turn]

[AI Turn]
  │  auto-advances after 400ms
  │
  ├── Score < threshold → [Human Turn]
  │
  ├── Score reaches threshold → [AI Go/Stop]
  │     └── auto-advances after 400ms
  │           ├── AI chooses Stop → [Ended]
  │           └── AI chooses Go → [Human Turn]
  │
  └── Deck exhausted + opponent hand empty → [Ended]

[Ended]
  │  ResultPanel shown (승리/패배/무승부, reason, scores)
  │  Click "다시 하기" (Idle is NOT re-entered)
  ▼
[Human Turn]  ← new game starts directly
```

**All paths verified reachable and correct in code.**

---

## 3. Save / Resume Integration Check

M5 added persistent save and resume. This section verifies the integration is sound in the context of a full play session.

| Scenario | Status | Notes |
|---|---|---|
| First launch (no save) — idle screen shows only "새 게임 시작" | ✅ | `resumeSession === null` after `loadActiveGame` returns null |
| Launch with saved game — "게임 이어하기" button appears | ✅ | `resumeSession !== null && !isCheckingResume` guards render |
| "새 게임 시작" disabled during async resume check | ✅ | `disabled={isCheckingResume || isStartingGame}` |
| "게임 이어하기" also disabled during `isStartingGame` window | ✅ | Same disabled guard on resume button |
| Clicking "게임 이어하기" restores full game state | ✅ | `RESTORE_SESSION` returns the exact serialized session |
| Restored game has fresh `GameViewModel` (not a stale snapshot) | ✅ | `buildGameViewModel` called in `loadActiveGame` |
| Clicking "새 게임 시작" with a saved game — save is deleted first | ✅ | `await deleteActiveGame` before `dispatch(START_GAME)` |
| Game saved after every action (playing / pendingGoStop phases) | ✅ | `useEffect` on `[session, storageService]` fires on every change |
| Save deleted on game end | ✅ | `deleteActiveGame` called when `session.phase === 'ended'` |
| App reload mid-AI-turn → resumes at that AI turn state | ✅ | `pendingGoStop` / `playing` phases both save correctly |
| App reload mid-game during human GoStop decision → resumes at GoStop | ✅ | `pendingGoStop` phase is saved and validated |
| "다시 하기" after ended→playing path allows further restarts | ✅ | `isStartingGame` reset fixed in M5-H1A |
| Cancellation guard prevents stale setState on unmount | ✅ | `let cancelled = false` pattern in startup effect |

---

## 4. Findings

### 4-A. OBSERVATION — GoStopPanel is below the fold on small viewports

**Severity:** Medium — UX issue; functional behavior is correct.

**Detail:** The game board renders in this top-to-bottom order:

```
Title + GameStatusBar + ActionHint
AI area (face-down placeholders)
Field area (8 cards)
Human area (up to 10 hand cards + target prompt)
EventLog
GoStopPanel ← rendered here
ResultPanel ← rendered here
Error box
Captured cards (collapsible)
```

On a compact mobile viewport (e.g. 375 × 667 px with 10 hand cards displayed), the `GoStopPanel` may appear below the visible area. The `ActionHint` bar correctly updates to "고 또는 스톱을 선택하세요" (visible near the top), so the player has a textual cue, but the action buttons are off-screen.

`ResultPanel` has the same position and the same risk for small viewports.

**No code change in this PR.**

**Follow-up:** M5.5-PR2 — evaluate whether the action panels (`GoStopPanel`, `ResultPanel`) should float above the hand area or scroll into view on trigger.

---

### 4-B. OBSERVATION — "새 게임 시작" disabled with no loading indicator during resume check

**Severity:** Low — observable on Capacitor adapters with >100ms storage latency.

**Detail:** On app launch, `isCheckingResume` starts `true`. Both buttons are disabled or hidden until `loadActiveGame` resolves. On `BrowserLocalStorageStorageService` (synchronous backing, async wrapper) this is essentially instant. On `CapacitorStorageService` (`@capacitor/preferences`) the read may take 100–300ms. During this window the idle screen shows "맞고" with a grayed-out "새 게임 시작" button and no loading feedback.

**No code change in this PR.**

**Follow-up:** Consider adding a spinner or "로딩 중…" label when `isCheckingResume` is true. Deferred post-M5.5.

---

### 4-C. OBSERVATION — Two same-month same-category cards are indistinguishable in target selection

**Severity:** Low — affects OD-2 target selection only, and only for 피(pi) cards (which can have two cards of the same month and category).

**Detail:** The card label is `${card.month}월 ${category_ko}`. Two 피 cards of the same month (e.g. two "1월 피" cards) produce identical labels. If both are on the field and the human plays a 1월 card, target selection mode activates. Both field card targets display as "1월 피 (대상 선택)" — visually identical.

In practice the choice is game-equivalent (capturing either 피 gives the same score outcome), so no unfair play results. The player may be briefly confused about which of the two identical buttons to click, but the outcome is the same either way.

**No code change in this PR.**

**Resolution:** Will be naturally resolved when card artwork is added (each card will have a unique visual identity). No separate PR needed.

---

### 4-D. OBSERVATION — Human hand count not shown in status bar

**Severity:** Informational — no functional impact.

**Detail:** `GameStatusBar` displays `AI 패 N장` (AI hand count) but not the human's hand count. The human can count their own hand by looking at the hand area. The omission is intentional (hand area already shows the cards), but a quick-glance count label would be helpful at low cost.

**No code change in this PR.**

**Resolution:** Deferred. Add `내 패 N장` to the primary status row in a future polish PR.

---

### 4-E. OBSERVATION — Go multiplier not applied to winner's score

**Severity:** Known gap — intentional MVP scope decision (OD-5).

**Detail:** `goStopState.goCount` is tracked per player and emitted in the `GO_DECLARED` event, but `ruleset.applyGoMultiplier` is `false` in the `defaultRuleset`. The winner's score in `FinalResult` is the raw score at Stop — no multiplier is applied.

The `GoStopPanel` correctly explains "고: 계속 플레이해서 더 많은 점수를 노립니다" without mentioning a multiplier, so no UI text is inaccurate.

**No code change needed.** Documented in `docs/12_open_decision_resolution.md` as OD-5.

---

### 4-F. OBSERVATION — `docs/13_mvp_playtest_checklist.md` §12 references stale test count

**Severity:** Documentation — no code impact.

**File:** `docs/13_mvp_playtest_checklist.md` §12 (Regression Checklist)

**Issue:** The line reads "All 422+ tests pass (`npx vitest run`)". The current count at M5-H1A is **485 tests** (22 test files). The threshold is stale by 63 tests.

**Fix in this PR:** Update the threshold in §12 to "All 485+ tests pass".

---

## 5. Full Flow Playability Sign-off

| Flow path | Status |
|---|---|
| Launch → new game → human turn | ✅ |
| Human plays non-multi-target card → AI plays → back to human | ✅ |
| Human plays multi-target card → target selection → complete | ✅ |
| Target selection → cancel → re-select → complete | ✅ |
| Human score reaches threshold → GoStopPanel appears | ✅ |
| Human clicks 스톱 → ResultPanel (승리/패배/무승부) | ✅ |
| Human clicks 고 → AI turn → human turn | ✅ |
| AI score reaches threshold → auto-advance → AI decides (Go or Stop) | ✅ |
| Deck exhausted → ended with "덱 소진" reason | ✅ |
| ResultPanel shows correct winner, reason, score breakdown | ✅ |
| "다시 하기" → new game in Human Turn (not via Idle) | ✅ |
| Second "다시 하기" → third game (isStartingGame reset fixed) | ✅ |
| Reload mid-game → resume prompt → "게임 이어하기" → game restored | ✅ |
| Reload mid-game → "새 게임 시작" → fresh game (save deleted) | ✅ |
| Error state does not crash the game | ✅ |
| AI hand contents not visible to player | ✅ |
| Draw pile contents not visible to player | ✅ |

**Verdict: One full game is playable end-to-end. No blockers found.**

---

## 6. Follow-up Items

| Item | Priority | Suggested PR |
|---|---|---|
| GoStopPanel / ResultPanel below fold on small viewports | Medium | M5.5-PR2 |
| "새 게임 시작" disabled with no loading indicator during resume check | Low | Post-M5.5 polish |
| Identical labels for same-month same-category 피 cards in target selection | Low | Resolved by card artwork |
| Human hand count not shown in status bar | Informational | Post-M5.5 polish |
| `docs/13` stale test count → fixed in this PR | Done | M5.5-PR1 |
