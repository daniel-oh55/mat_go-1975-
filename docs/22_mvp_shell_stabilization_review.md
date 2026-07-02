# MVP Shell Stabilization Review

## 1. Purpose

M8은 M7에서 증명한 story-match-story runtime을 플레이어와 테스터가 이해할 수 있는 MVP shell로 안정화하는 단계였다. M8-H1은 M8 결과를 검토하고, 다음 단계로 넘어가도 되는지 결정한다.

**M8 stabilizes the app shell before production content begins.**

---

## 2. Scope Reviewed

| PR | Goal | Result | Status |
|---|---|---|---|
| M8-PR1 — Runtime Shell Review and App Flow Decision | Decide whether the app should start directly in `StoryRuntimeScreen`, show a minimal home/menu first, or provide separate buttons for Story Mode and Free Match | `docs/21_runtime_shell_app_flow_decision.md` added; Option B (Minimal Home Shell) recommended over keeping `StoryRuntimeScreen` as entry (Option A) or building full navigation (Option C, deferred) | Approved / Merged to main |
| M8-PR2 — Minimal Home Shell | Add a simple home screen with Story Mode and Free Match entry points | `MinimalHomeScreen` added; `App` now starts at `mode: 'home'` and tracks `'home' \| 'story' \| 'freeMatch'`; Story Mode renders `StoryRuntimeScreen` unchanged, Free Match renders `GameSessionScreen` with default standalone props; verified save/resume survives a home round-trip | Approved / Merged to main |
| M8-PR3 — Story Runtime UX Polish | Improve the sample story runtime usability: clearer labels, clearer match start/return affordance, basic error visibility | `StoryRuntimeScreen`/`StoryNodePanel` labels and helper captions clarified; `storyMatch`-only wording added to `GameSessionScreen` ("스토리 대결", "스토리 대결 시작", "대결 취소"); `ResultPanel` gained an optional continue caption; standalone wording verified unchanged | Approved / Merged to main |
| M8-PR4 — Board Readability Pass | Improve the match board readability inside both standalone and storyMatch mode | `GameSessionScreen`, `CardButton`, `CardRow`, `GameStatusBar`, `ActionHint`, `GoStopPanel`, `ResultPanel`, `CapturedCardGroups` all received presentation-only readability improvements (labelled stat chips, larger tap targets, outcome badge, tinted captured groups); hidden information invariant verified preserved | Approved / Merged to main |

---

## 3. Current MVP Shell Flow

```
App
→ MinimalHomeScreen
  → Story Mode
     → StoryRuntimeScreen
        → sampleStory validation flow
        → storyMatch GameSessionScreen
        → result
        → story progression
  → Free Match
     → GameSessionScreen standalone
        → active game save/resume
```

- App stores only selected mode (`'home' | 'story' | 'freeMatch'`).
- App does not store `GameState`.
- App does not store `StorySessionState`.
- App does not store `StoryDefinition`.
- Story Mode state is not persisted yet — leaving and re-entering Story Mode restarts `sampleStory` from the intro dialogue.
- Free Match active-game persistence remains available — leaving and re-entering Free Match preserves an in-progress standalone game via "게임 이어하기".

---

## 4. Boundary Verification Table

| Check | Status | Evidence | Notes |
|---|---|---|---|
| Engine files changed in M8 | **Pass** | No M8 PR touched any file under `src/engine/` (verified across PR1–PR4 diffs) | Engine tree unchanged since M6-H1 |
| Application logic changed in M8 | **Pass / No change** | No M8 PR touched any file under `src/application/` | `storySessionState.ts`, `storyProgression.ts`, `matchOutcomeAdapter.ts`, `gameSessionReducer.ts` all untouched |
| App stores `GameState` | **Pass / No** | `App.tsx`'s only state is `mode: AppMode` (M8-PR2) | `GameState` lives inside `GameSessionScreen`'s own `useReducer`, not in `App` |
| App stores `StorySessionState` | **Pass / No** | `App.tsx` has no `StorySessionState` field | `StorySessionState` lives inside `StoryRuntimeScreen`'s own `useState` |
| App stores `StoryDefinition` | **Pass / No** | `App.tsx` does not import `sampleStory` or any `StoryDefinition` | Only `StoryRuntimeScreen` imports `sampleStory` |
| `MinimalHomeScreen` imports engine/application/story/content | **Pass / No** | `MinimalHomeScreen.tsx` imports nothing beyond React — no `engine`, `application`, `storySession`, `gameSession`, `sampleStory`, or `StorageService` import | Confirmed in M8-PR2 code review |
| `StoryRuntimeScreen` production-content risk | **Validation-only** | `StoryRuntimeScreen` imports `sampleStory` directly — a `sample-` prefixed validation fixture, not production content | Flagged as a known limitation in `docs/21` §11 and §14; addressed by the M9 recommendation below |
| Free Match standalone save/resume behavior | **Pass** | Verified in M8-PR2 and M8-PR4 browser testing: starting a Free Match, returning home mid-game, and re-entering Free Match shows "게임 이어하기" and restores the in-progress game | `enableResume` / `enableActiveGamePersistence` default to `true` in standalone mode, unchanged since M7-PR4 |
| Story Match active-game persistence disabled behavior | **Pass** | `StoryRuntimeScreen` renders `GameSessionScreen` with `enableResume={false}` and `enableActiveGamePersistence={false}` for `storyMatch` mode | Verified: a story match never shows a resume prompt and never deletes/overwrites the standalone saved game |
| `GameSessionScreen` imports story/content | **Pass / No** | `GameSessionScreen.tsx` imports only from `../../application/gameSession/index.js` and sibling UI components | `onMatchComplete` reports `finalResult` upward only — `GameSessionScreen` has no knowledge of `MatchOutcome` or `StorySession` |
| Board readability changed rule/scoring/AI | **Pass / No** | M8-PR4 changes are limited to labels, spacing, tap-target sizing, and colored badges/chips — no dispatch, reducer, or Application Layer logic was touched | Verified by diff review: only JSX/style/copy changed in `src/components/game/` |
| Hidden information invariant | **Pass** | The opponent/AI area renders only a hand-size count and face-down placeholder `div`s — no card content | Verified in a real browser across M8-PR2 through M8-PR4; also true for captured cards, which are legitimately public information |
| `StoryProgress` persistence | **Deferred** | No `StorageService` call exists for story state in `storySessionState.ts` or `StoryRuntimeScreen.tsx` | Per `docs/20` §8; still deferred until a runtime/content-loader decision is made |
| Production story content | **Deferred** | `sampleStory` remains the only story definition; no region/NPC/dialogue content was added in M8 | Per `docs/19` §2 and `docs/20` §2 |
| Router/full navigation introduced | **Pass / No** | `App.tsx` uses a single `mode` state variable and conditional rendering — no React Router or similar library was added | `package.json` unchanged across all of M8 |
| Card images/final art introduced | **Pass / No** | All cards remain text-label buttons (`CardButton`/`DisplayCard`); no image assets were added | Consistent with `docs/02_mvp_scope.md` MVP scope |

---

## 5. Runtime UX Verification

The following flow was implemented across M8-PR2 through M8-PR4 and verified end-to-end in a real browser (Playwright against the Vite dev server):

- Home → Story Mode.
- Story dialogue → match node.
- Story match starts `GameSessionScreen` in `storyMatch` mode (no resume prompt; idle screen shows "스토리 대결 시작" and "대결 취소").
- Story match result returns to the story end node via "이야기로 돌아가기" → `buildMatchOutcome` → `completeStoryMatch`.
- Home → Free Match.
- Free Match starts standalone `GameSessionScreen` (idle screen shows "새 게임 시작", and "게임 이어하기" when a saved game exists).
- Free Match save/resume survives a home round-trip (leaving mid-game and returning shows "게임 이어하기").
- Board labels/stat chips/action hints (내 점수, 상대 점수, 더미, 상대 패, 상태 표시) are visible and legible in both standalone and storyMatch mode.
- Opponent hand contents remain hidden — only a count and face-down placeholders are rendered, in both modes.

No console errors were observed in any of the above flows across M8-PR2, M8-PR3, or M8-PR4 verification passes.

---

## 6. Final M8 Decision

M8 MVP Shell Stabilization is approved.

The app now has a minimal understandable shell with separate Story Mode and Free Match entry points.

The story runtime remains validation-only, but the app flow is stable enough for continued MVP development.

Board readability is improved enough for internal test play.

Production content should still not begin until the next milestone explicitly approves content work.

---

## 7. Remaining Deferred Work

| Item |
|---|
| `StoryProgress` persistence |
| Runtime content loader / story selection |
| Production region/NPC/dialogue content |
| 1970s visual presentation |
| Character portraits |
| BGM/SFX/background art |
| Reward/unlock animation |
| Fortune/saju integration |
| Monetization/ads integration |
| Settings screen |
| Save slots |
| Full navigation/router |
| Card images/final card art |
| Online multiplayer |

---

## 8. Risks Before Production Content

| Risk | Mitigation |
|---|---|
| `sampleStory` still hardcoded in `StoryRuntimeScreen` | Keep `sampleStory` as a validation fixture until a content-loader milestone introduces a proper boundary |
| Story Mode has no persistence | Add `StoryProgress` persistence only after runtime/content-loader decisions are settled |
| Content loader/story selection does not exist | Add a content loader before production region expansion |
| Board readability is improved but not final visual design | Treat the current board as MVP readability, not final art |
| No automated React UI tests | Continue manual browser validation per PR until UI test infrastructure is introduced |
| Production content may outgrow current sample story assumptions | Add schema/content validation before production content scale-up |

---

## 9. Recommended Next Milestone

**Recommended next: M9 — Content Loader and Story Selection Foundation**

Purpose:
- Remove the production risk of hardcoding `sampleStory` directly in `StoryRuntimeScreen`.
- Introduce a minimal content registry/loader boundary.
- Allow Story Mode to choose or receive a `StoryDefinition` without the UI directly importing a specific story file.
- Keep production content minimal.
- Do not yet write full regional/NPC/dialogue content.

**Alternative: M9A — StoryProgress Persistence**

Use if resume continuity becomes more urgent than content loading.

**Do not recommend:** Immediate full production region/NPC/dialogue content.

**Reason:** Before real content is written, the project needs a clean way to load/select `StoryDefinition` without hardcoding `sampleStory` in the UI.

---

## 10. M9 Proposed PR Sequence

### M9-PR1 — Content Loader Architecture

Documentation only. Define how story definitions are registered, selected, and passed to `StoryRuntimeScreen` without hardcoding a specific story file in UI.

### M9-PR2 — Story Content Registry

Add a minimal Content Layer registry for available `StoryDefinition` entries. Use `sampleStory` as the only registered story. No production content.

### M9-PR3 — StoryRuntimeScreen Definition Injection

Refactor `StoryRuntimeScreen` to receive a `StoryDefinition` or storyId/loader result from the parent/Application boundary. Remove the direct `sampleStory` import from `StoryRuntimeScreen`. Keep behavior identical.

### M9-PR4 — Minimal Story Selection Stub

If needed, add a minimal Story Mode entry screen or selector that lists only the sample story. No production content. No final art.

### M9-H1 — Content Loader Boundary Review

Confirm the UI no longer hardcodes `sampleStory`, the engine remains story-agnostic, and content loading is data-driven.

---

## 11. M9-PR1 Note

- M8-H1 (§9 of this document) recommended M9 because `sampleStory` is still hardcoded in `StoryRuntimeScreen`.
- M9-PR1 defines the architecture for the content registry/loader in `docs/23_content_loader_architecture.md` — layer boundary, proposed registry shape, proposed loader API, and the `StoryRuntimeScreen` definition-injection direction.
- No production content begins yet.
- M9 should first make content loading data-driven (registry + injection) before any region/NPC/dialogue content is written.
