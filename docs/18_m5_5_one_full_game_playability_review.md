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

### 4-A. ~~OBSERVATION~~ RESOLVED — GoStopPanel / ResultPanel hoisted above hand area (M5.5-PR2)

**Severity:** Medium — UX issue; functional behavior was correct. **Resolved in M5.5-PR2.**

**Original detail:** The game board rendered in this top-to-bottom order:

```
Title + GameStatusBar + ActionHint
AI area (face-down placeholders)
Field area (8 cards)
Human area (up to 10 hand cards + target prompt)
EventLog
GoStopPanel ← was here (below fold on small screens)
ResultPanel ← was here (below fold on small screens)
Error box
Captured cards (collapsible)
```

**Fix (M5.5-PR2):** `GoStopPanel` and `ResultPanel` moved above the Human Area in `GameSessionScreen.tsx`. New order:

```
Title + GameStatusBar + ActionHint
AI area (face-down placeholders)
Field area (8 cards)
GoStopPanel ← now here (visible without scrolling)
ResultPanel ← now here (visible without scrolling)
Human area (up to 10 hand cards + target prompt)
EventLog
Error box
Captured cards (collapsible)
```

Both panels are conditionally rendered (only when their phase is active), so there is no layout impact during normal play turns. The new position places decision panels in the natural reading flow between the field context (what was captured) and the hand (remaining cards).

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

## 5. Player Emotion Assessment

Technical flow correctness is necessary but not sufficient. A player experiences the game through feedback, clarity, and momentum — not through function calls. This section evaluates the same flow paths through a player experience lens.

### 5-A. Turn Clarity

| Moment | What the player sees | Emotional read |
|---|---|---|
| App launches | Title "맞고" + "새 게임 시작" button (grayed for ~0ms on localStorage, longer on Capacitor) | ✅ Clear starting point. On Capacitor, the brief gray state may feel like a frozen UI. |
| Click "새 게임 시작" | Instant transition to hand + field board | ✅ No loading screen. Feels responsive. |
| Human turn starts | Green "▶ 내 차례" label + ActionHint "낼 카드를 선택하세요" + yellow card borders | ✅ Three independent signals all confirm "your turn." Low confusion risk. |
| Player clicks a legal card | Board updates, AI turn label appears | ✅ Immediate visual feedback. |
| AI turn (400ms wait) | "⌛ AI 차례" label + amber ActionHint | ✅ Player knows AI is deciding. 400ms is short enough not to feel stuck. |

**Assessment:** Turn clarity is good. The three-signal system (status bar label + ActionHint + card highlight) makes the current state unambiguous.

---

### 5-B. Go/Stop Decision Moment

This is the highest-stakes interactive moment in the game. The player must understand what "고" and "스톱" mean before pressing one.

| Element | Current behavior | Player experience |
|---|---|---|
| Trigger text | ActionHint updates to "고 또는 스톱을 선택하세요" near the top of the screen | ✅ Player is informed immediately. |
| GoStopPanel heading | `N점 달성 — 고 또는 스톱을 선택하세요` | ✅ Score is stated explicitly — the player knows why this appeared. |
| Guidance text | `고: 계속 플레이해서 더 많은 점수를 노립니다.` / `스톱: 지금 점수로 게임을 종료합니다.` | ✅ Both choices are explained before the player commits. |
| Panel position | Above Human Area — between Field Area and hand cards (M5.5-PR2) | ✅ GoStopPanel is now immediately visible on all screen sizes without scrolling. |
| No timer | Decision is open-ended | ✅ No pressure. Player can read and decide at their pace. |

**Assessment:** The Go/Stop decision content is clear and the decision panel is now visible without scrolling after M5.5-PR2. Both the information (ActionHint) and the action (the two buttons) are immediately in view.

---

### 5-C. AI Go/Stop — Passive Wait

When the AI triggers Go/Stop, the player is a passive observer. This requires the UI to communicate "something is happening, be patient."

| Element | Current behavior | Player experience |
|---|---|---|
| ActionHint | "AI가 고/스톱을 결정 중입니다…" | ✅ Player knows AI is deciding, not that the app froze. |
| EventLog | Shows the events from the turn that triggered Go/Stop | ✅ Player can see what just happened. |
| Auto-advance | 400ms → EventLog updates with "AI가 고! (N번째)" or "AI가 스톱!" | ✅ Resolution is fast. The ellipsis in ActionHint implies pending action. |

**Assessment:** Passive AI states are communicated clearly. No feeling of being stuck.

---

### 5-D. Game End and Result Screen

The result screen is the emotional peak of each game — the player learns whether they won or lost.

| Element | Current behavior | Player experience |
|---|---|---|
| Panel color | Green (win), Red (lose), Gray (draw) | ✅ Pre-attentive. Player knows the outcome before reading any text. |
| Outcome line | `결과: 승리 / 패배 / 무승부` in matching color | ✅ Confirms what the color already communicated. |
| Reason line | `종료 이유: 스톱 / 덱 소진` | ✅ Player understands why the game ended, not just that it ended. |
| Score breakdown | Human and AI scores with category detail (광/열/띠/피) | ✅ Player can see what drove their score — where they did well. |
| Panel position | Above Human Area — between Field Area and hand cards (M5.5-PR2) | ✅ ResultPanel is now immediately visible on all screen sizes without scrolling. |
| "다시 하기" button | Visible within the ResultPanel without scrolling | ✅ The restart button is in view as soon as the game ends. |

**Assessment:** The result screen content is strong. The color-coded outcome is the right primary signal. Finding 4-A (resolved in M5.5-PR2) has improved discoverability: the panel now renders above the hand area and is immediately visible without scrolling.

---

### 5-E. Restart Momentum

A player who just finished a game should be able to start another quickly.

| Moment | Current behavior | Player experience |
|---|---|---|
| Click "다시 하기" | `await deleteActiveGame` (~0ms on localStorage) → `dispatch(START_GAME)` → board resets | ✅ Nearly instant. No loading screen between games. |
| New game state | Directly in Human Turn — same board layout, fresh cards | ✅ No friction. The game re-enters the same familiar layout immediately. |
| Old save cleared | Previous game's save is deleted before new game starts | ✅ Player pressing "게임 이어하기" after a restart will not see the previous game. |
| Multiple restarts | `isStartingGame` reset fixed (M5-H1A) — unlimited restarts work correctly | ✅ No permanent lock after first restart. |

**Assessment:** Restart flow feels smooth and fast. No emotional friction points.

---

### 5-F. Resume Flow

The resume flow is a power feature — players who return to the app after closing it mid-game.

| Moment | Current behavior | Player experience |
|---|---|---|
| Return to app | Idle screen shows both "게임 이어하기" and "새 게임 시작" | ✅ Clear choice. Player is not forced to resume — they can start fresh if they prefer. |
| "게임 이어하기" position | Shown above "새 게임 시작" | ✅ Resume is the primary action; listed first. |
| After resuming | Directly in the saved game state (playing or pendingGoStop) | ✅ No recap screen or "welcome back" state. The board is exactly where the player left it. |
| Resume when mid-GoStop | Board restores to pendingGoStop — GoStopPanel now above Human Area (M5.5-PR2) | ✅ Player resumes directly to the visible decision panel. No scrolling required. |

**Assessment:** Resume flow is functionally correct and the UX intent is right. After M5.5-PR2, the pendingGoStop resume path also benefits: the GoStopPanel renders above the hand area and is immediately visible on resume.

---

### 5-G. Summary: Player Emotion Map

| Game moment | Feel | Confidence |
|---|---|---|
| App launch | Clean start | ✅ High |
| "새 게임 시작" | Responsive, no delay | ✅ High |
| Human turn recognition | Clear ("your turn" is unambiguous) | ✅ High |
| Card play | Immediate feedback | ✅ High |
| AI turn wait | Aware, not anxious | ✅ High |
| Go/Stop decision (content) | Informed | ✅ High |
| Go/Stop decision (button discoverability) | Buttons immediately visible (M5.5-PR2) | ✅ High |
| AI Go/Stop wait | Passive but informed | ✅ High |
| Game end (result content) | Clear emotional signal (color + text) | ✅ High |
| Game end (discoverability) | Result immediately visible (M5.5-PR2) | ✅ High |
| Restart | Smooth, instant | ✅ High |
| Resume flow | Comfortable, familiar board | ✅ High |

**All moments rate high for clarity and emotional correctness after M5.5-PR2. No remaining blocker for confident player experience.**

---

## 6. UX Risk Summary

The table below consolidates all UX risks identified in §4 (Findings) and §5 (Player Emotion Assessment) into a single risk register. Severity ratings follow the same scale used in §4.

| Risk ID | Description | Severity | Affected Moments | Current Mitigation | Resolution |
|---|---|---|---|---|---|
| UX-1 | ~~GoStopPanel and ResultPanel below fold on small viewports — action buttons require scrolling~~ | ~~Medium~~ | ~~Go/Stop decision (5-B); game end (5-D); pendingGoStop resume (5-F)~~ | **Resolved in M5.5-PR2**: panels hoisted above Human Area in `GameSessionScreen.tsx` | ✅ Done |
| UX-2 | No loading indicator during resume check on Capacitor (100–300ms button-disabled window) | Low | App launch | Near-instant on `BrowserLocalStorageStorageService`; gap is Capacitor-only | Post-M5.5 polish |
| UX-3 | Two same-month 피 cards display identical labels in OD-2 target selection | Low | Multi-target card play (OD-2) | Both targets are game-equivalent; no unfair outcome | Resolved by card artwork — no separate PR needed |
| UX-4 | Human hand count not visible in GameStatusBar | Info | All human turns | Hand area shows cards directly; player can count visually | Post-M5.5 polish |
| UX-5 | Go multiplier not applied to final score (OD-5 known gap) | Known gap | Game end result | GoStopPanel text does not mention multiplier; UI text is accurate | Not in MVP scope (OD-5) |
| UX-6 | EventLog messages may be terse / unfamiliar to beginner players | Low | After human / AI actions | ActionHint explains current required action; EventLog gives recent action feedback | Future beginner-help polish; not an M6 blocker |
| UX-7 | Mobile touch target size / card spacing not audited under compact conditions | Low | Card selection; Go/Stop buttons; Restart button | `CardButton` and primary buttons use `minHeight: 44px`; M5.5-PR2 positions high-priority panels above the fold | Manual QA in M5.5-H1; future polish if issues found |
| UX-8 | Score breakdown category labels (광/열/띠/피) may be unclear to new players | Low | ResultPanel | ResultPanel shows both human and AI breakdown by category; all four categories are labeled | Future beginner-help polish; not an M6 blocker |

**Summary:** UX-1 resolved in M5.5-PR2. UX-2, UX-4, UX-6, UX-7, UX-8 are low-priority polish items. UX-3 resolves itself with card artwork. UX-5 is an intentional MVP scope deferral. No remaining Blocker or High severity UX risks.

---

## 7. Full Flow Playability Sign-off

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

## 8. Follow-up Items

| Item | Priority | Suggested PR |
|---|---|---|
| ~~GoStopPanel / ResultPanel below fold on small viewports~~ | ~~Medium~~ | Resolved — M5.5-PR2 |
| "새 게임 시작" disabled with no loading indicator during resume check | Low | Post-M5.5 polish |
| Identical labels for same-month same-category 피 cards in target selection | Low | Resolved by card artwork |
| Human hand count not shown in status bar | Informational | Post-M5.5 polish |
| `docs/13` stale test count → fixed in this PR | Done | M5.5-PR1 |

---

## 9. Final Pre-Story Sign-off

### M5.5 Milestone Completion Checklist

| Item | Status | PR |
|---|---|---|
| One full game flow reviewed and verified | ✅ | M5.5-PR1 |
| Player emotion / experience assessment | ✅ | M5.5-PR1A |
| UX Risk Summary and M5.5-H1 plan added | ✅ | M5.5-PR1B |
| GoStopPanel / ResultPanel viewport issue (UX-1) resolved | ✅ | M5.5-PR2 |
| Stale emotion-map entries updated post-PR2 | ✅ | M5.5-H1 |
| UX-6, UX-7, UX-8 risks documented | ✅ | M5.5-H1 |

### Remaining Risk Assessment

| Category | Count | Verdict |
|---|---|---|
| Blocker / High severity | 0 | None |
| Medium severity | 0 | None — UX-1 resolved in M5.5-PR2 |
| Low severity | 4 (UX-2, UX-6, UX-7, UX-8) | Deferred to post-M5.5 polish |
| Info | 1 (UX-4) | Deferred |
| Known deferred scope | 2 (UX-3, UX-5) | Intentional MVP scope decisions |

### Player Capability Confirmed

After M5.5, a player can:

- Start the app and begin a new game without friction
- Play one full game through all turn phases (human, AI, Go/Stop, Deck exhausted)
- See a result screen with clear outcome, reason, and score breakdown
- Restart immediately from the result screen
- Close and reopen the app mid-game and resume to the exact game state
- Make a Go/Stop decision with the decision panel immediately visible (M5.5-PR2)
- See the result panel immediately visible at game end (M5.5-PR2)

### Sign-off

**Milestone 5.5 is complete. Milestone 6 Story System may begin.**
