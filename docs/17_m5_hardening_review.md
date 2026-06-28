# M5 Save System Hardening Review

## 1. Purpose

This document records the findings of M5-H1: the post-implementation hardening review of the Milestone 5 Save / Progress Foundation.

Scope: all code and documentation delivered in M5-PR1 through M5-PR6A.

Reviewed by: M5-H1 PR (milestone5/h1-save-system-hardening-review)

---

## 2. What Was Delivered (M5 Summary)

| PR | Deliverable |
|---|---|
| M5-PR1 through M5-PR1D | `docs/16_save_progress_architecture.md` — architecture + derived-state boundary |
| M5-PR2 | `StorageService` interface, `BrowserLocalStorageStorageService`, `InMemoryStorageService` |
| M5-PR3 | `activeGameSave.ts` — serialize, save, load, validate, delete |
| M5-PR3A | `loadActiveGame` returns `GameSessionState` (not raw doc); fresh `GameViewModel` derived on restore; sessionPhase/gameState.phase mismatch rejection |
| M5-PR4 | Save triggers wired in `GameSessionScreen` via `useEffect` |
| M5-PR5 | Resume flow: "게임 이어하기" on idle screen; `RESTORE_SESSION` reducer action |
| M5-PR5A | `handleStartGame` race fix: `await deleteActiveGame` before `dispatch(START_GAME)`; `isStartingGame` guard |
| M5-PR5C | Cancellation guard on `loadActiveGame` startup effect |
| M5-PR6 | `CapacitorStorageService`; composition root platform detection (`Capacitor.isNativePlatform()`) |
| M5-PR6A | `@capacitor/core` declared as direct dependency |

Test count at M5-H1: **22 test files, 485 tests pass**.

---

## 3. Architecture Boundary Check

| Constraint (from §13 of `docs/16`) | Status |
|---|---|
| Engine never calls `StorageService` or any storage API | ✅ No storage imports in `src/engine/` |
| Application Layer imports only the `StorageService` interface | ✅ `activeGameSave.ts` imports `StorageService` from `'../storage/StorageService.js'`, never a concrete impl |
| `GameState` contains no NPC, region, or content identity | ✅ Engine boundary preserved |
| Save failure does not crash the game | ✅ `saveActiveGame` and `deleteActiveGame` catch and log all errors |
| Load validates before passing to engine | ✅ `validateActiveGameDoc` + `validateGameState` run before data is used |
| `GameViewModel` not persisted | ✅ `serializeActiveGame` produces only `{ saveVersion, savedAt, sessionPhase, gameState }` |
| UI receives `GameSessionState` with fresh `GameViewModel` after restore | ✅ `loadActiveGame` derives `buildGameViewModel` before returning |

---

## 4. Findings

### 4-A. BUG — `isStartingGame` never reset on `ended → playing` restart path

**Severity:** High — blocks the "play again" flow after the first game restart.

**File:** `src/components/game/GameSessionScreen.tsx:108`

**Reproduction:**
1. App starts → click "새 게임 시작" → `isStartingGame = true` → game starts.
2. Play game to completion → ended screen shown.
3. Click "다시 하기" (ResultPanel `onRestart` → `handleStartGame`).
4. `if (isStartingGame) return;` fires immediately — `isStartingGame` is still `true`.
5. No new game starts. The "다시 하기" button is silently broken.

**Root cause:** The comment in M5-PR5A states "isStartingGame is not reset: the idle screen unmounts immediately after dispatch." This is true for the idle→playing path (idle screen unmounts, the reset is irrelevant). But when called from the ended screen (`ResultPanel.onRestart`), the component stays mounted across the ended→playing transition. `isStartingGame` is never reset to `false`.

**The guard was intended to prevent double-dispatch during the `await deleteActiveGame` window (milliseconds at most), not to be a permanent lock.**

**Follow-up PR:** M5-H1A — reset `isStartingGame = false` after `dispatch(START_GAME)`.

---

### 4-B. DOC INACCURACY — App pause trigger listed as "wired in M5-PR6"

**Severity:** Documentation — no code impact.

**File:** `docs/16_save_progress_architecture.md` §6

**Issue:** The save trigger table said the app-pause trigger was "wired in M5-PR6". M5-PR6 added `CapacitorStorageService` but did not wire the pause event. The pause event requires `@capacitor/app` (a separate Capacitor plugin not yet installed).

**Fix in this PR:** Updated the table entry and the explanatory note. The entry now reads "deferred to M5-PR7; requires `@capacitor/app`".

---

### 4-C. DOC INACCURACY — M5-PR6 entry referenced deprecated `@capacitor/storage`

**Severity:** Documentation — no code impact.

**File:** `docs/09_pr_plan.md`

**Issue:** The M5-PR6 row said "Wraps `@capacitor/preferences` (or `@capacitor/storage`)". `@capacitor/storage` is the deprecated pre-v4 package. The implementation uses `@capacitor/preferences` only.

**Fix in this PR:** Removed the `(or @capacitor/storage)` reference; updated the deliverable table to reflect actual M5-PR6 + M5-PR6A scope.

---

### 4-D. OBSERVATION — Save trigger fires on RESTORE_SESSION (redundant write)

**Severity:** Observation — no functional issue.

**Detail:** When the player clicks "게임 이어하기", `RESTORE_SESSION` is dispatched. The session phase changes from `idle` to `playing` or `pendingGoStop`. The save trigger `useEffect` fires and calls `saveActiveGame` — writing the restored session back to storage. This is a redundant write (the document was just loaded from storage) but is harmless. The write produces an identical document.

**No action needed.**

---

### 4-E. OBSERVATION — `savedAt` not format-validated

**Severity:** Observation — safe for MVP.

**Detail:** `validateActiveGameDoc` checks `typeof savedAt !== 'string'` but does not validate ISO 8601 format. Any non-empty string passes. In practice, `serializeActiveGame` always writes `new Date().toISOString()`, so this is safe. Staleness detection (if added post-M5) would need format validation.

**No action needed for M5.**

---

### 4-F. OBSERVATION — Save-trigger delete vs. new-game save race (ended→restart)

**Severity:** Observation — mitigated by human reaction time.

**Detail:** When a game ends, the save trigger fires `deleteActiveGame` (fire-and-forget). If the player clicks "다시 하기" extremely quickly, the sequence could be:
1. Save trigger: `deleteActiveGame` starts (D1) — fire-and-forget.
2. `handleStartGame` → `await deleteActiveGame` (D2) → `dispatch(START_GAME)` → save trigger: `saveActiveGame` (S1).
3. D2 completes before S1 starts (correct, because D2 is awaited).
4. D1 might complete after S1 — deleting the new game's first save.

In practice, D1 resolves before the user can click restart (human reaction time >> storage I/O). Not a realistic concern for current adapters.

**No action needed for M5.**

---

### 4-G. OBSERVATION — App pause trigger not wired (M5-PR7 pending)

**Severity:** Gap vs. planned scope — deferred to M5-PR7.

**Detail:** The architecture doc lists "App paused / backgrounded" as a save trigger. This was not implemented in M5 because it requires `@capacitor/app` and wiring in `GameSessionScreen`. Per-turn saves provide equivalent protection in the current implementation (at most one turn of progress is lost on force-kill). The gap is acceptable for the browser-first validation phase.

**Follow-up PR:** M5-PR7 (see `docs/09_pr_plan.md`).

---

## 5. M5 Completion Criteria Sign-off

| Criterion | Status |
|---|---|
| `StorageService` interface defined in Application Layer | ✅ |
| `BrowserLocalStorageStorageService` implemented and tested | ✅ |
| `InMemoryStorageService` implemented and tested | ✅ |
| `CapacitorStorageService` implemented and tested | ✅ |
| Application Layer save/load/validate module | ✅ |
| `GameViewModel` not persisted | ✅ |
| `loadActiveGame` returns `GameSessionState` with fresh `GameViewModel` | ✅ |
| sessionPhase / gameState.phase mismatch rejected | ✅ |
| Save triggers wired in `GameSessionScreen` | ✅ |
| Resume flow ("게임 이어하기") | ✅ |
| Race safety: `await deleteActiveGame` before `START_GAME` | ✅ |
| Cancellation guard on startup load effect | ✅ |
| Composition root platform detection | ✅ |
| `@capacitor/core` declared as direct dependency | ✅ |
| App pause trigger | ⏳ Deferred to M5-PR7 |
| `isStartingGame` reset bug | ❌ Follow-up M5-H1A |

---

## 6. Follow-up Items

| Item | Priority | PR |
|---|---|---|
| Fix `isStartingGame` never reset on ended→restart | High | M5-H1A |
| App pause trigger (`@capacitor/app`) | Medium | M5-PR7 |
| `savedAt` ISO 8601 format validation | Low (post-M5) | — |
