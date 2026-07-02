# Story Progress Persistence Review

## 1. Purpose

M10-H1 is a sign-off document reviewing whether `StoryProgress` persistence was implemented safely for MVP.

This document is the quality gate before production story content, story selection UI, or multi-story save begin.

## 2. Reviewed Scope

- `docs/25_story_progress_persistence_plan.md`
- `src/application/storySession/storyProgressSave.ts`
- `src/application/storySession/storyProgressSave.test.ts`
- `src/application/storySession/storySessionState.ts`
- `src/application/storySession/index.ts`
- `src/components/story/StoryRuntimeScreen.tsx`
- `src/application/gameSession/activeGameSave.ts`
- `src/components/story/StoryRuntimeScreen.tsx`'s `GameSessionScreen` usage (`mode="storyMatch"`)
- `docs/09_pr_plan.md`
- `docs/10_decision_log.md`
- `docs/20_story_runtime_architecture.md`

## 3. Boundary Checklist

| # | Item | Result |
|---|---|---|
| 1 | `StoryProgress` storage key is `matgo.v1.storyProgress`. | PASS |
| 2 | `StoryProgress` save document is versioned. | PASS |
| 3 | Persisted document stores `StoryProgress` only, not `StorySessionState`. | PASS |
| 4 | `StoryViewModel` is never persisted. | PASS |
| 5 | `pendingMatchContext` is never persisted. | PASS |
| 6 | Runtime error/status is not persisted as source of truth. | PASS |
| 7 | Engine `GameState` is not persisted as part of `StoryProgress`. | PASS |
| 8 | `serializeStoryProgress` is pure and does not write to storage. | PASS |
| 9 | `validateStoryProgressSaveDocument` rejects malformed documents. | PASS |
| 10 | `validateStoryProgressSaveDocument` rejects a future `saveVersion`. | PASS |
| 11 | `validateStoryProgressSaveDocument` rejects a `storyId` mismatch. | PASS |
| 12 | `validateStoryProgressSaveDocument` rejects a missing `currentNodeId`. | PASS |
| 13 | `loadStoryProgress` deletes corrupted/invalid documents before returning `null`. | PASS |
| 14 | `loadStoryProgress` returns a restored `StorySessionState` for a valid save. | PASS |
| 15 | `restoreStorySession` rebuilds `StoryViewModel` from `StoryProgress` and `StoryDefinition`. | PASS |
| 16 | `saveStoryProgress` saves only `story`/`completed` status. | PASS |
| 17 | `saveStoryProgress` skips `matchRequested`/`invalid`. | PASS |
| 18 | `StoryRuntimeScreen` loads saved progress on mount. | PASS |
| 19 | `StoryRuntimeScreen` falls back to `createStorySession` when no valid save exists. | PASS |
| 20 | `StoryRuntimeScreen` saves after continue/choice/match-complete stable transitions. | PASS |
| 21 | `StoryRuntimeScreen` does not save on `handleRequestMatch`. | PASS |
| 22 | `StoryRuntimeScreen` restart overwrites saved progress with a fresh progress document. | PASS |
| 23 | `StoryRuntimeScreen` does not import `sampleStory`. | PASS |
| 24 | `StoryRuntimeScreen` does not import `storyRegistry`. | PASS |
| 25 | `App.tsx` remains the content-selection boundary and does not own `StoryProgress` persistence. | PASS |
| 26 | Story Match uses `enableActiveGamePersistence={false}`. | PASS |
| 27 | Free Match `ActiveGame` persistence remains separate. | PASS |
| 28 | `StorageService` interface is unchanged. | PASS |
| 29 | Engine imports no `StoryProgress` persistence. | PASS |
| 30 | Production story content remains deferred. | DEFERRED |
| 31 | Story selection UI remains deferred. | DEFERRED |
| 32 | Multi-save / multi-story persistence remains deferred. | DEFERRED |

## 4. Verification Basis

- **`storyProgressSave.ts`**: `STORY_PROGRESS_STORAGE_KEY = 'matgo.v1.storyProgress'` (#1), `StoryProgressSaveDocumentV1 { saveVersion: 1; savedAt: string; progress: StoryProgress }` — no `viewModel`/`pendingMatchContext`/`error`/`status` field exists on the type at all (#2–7), `serializeStoryProgress` takes a `StoryProgress` and returns a document with no `storage`/`StorageService` parameter or call (#8), `validateStoryProgressSaveDocument` rejects non-objects, bad `saveVersion` (missing/non-integer/`< 1`/`> STORY_PROGRESS_SAVE_VERSION`), non-string `savedAt`, malformed `progress` shape, a `storyId !== definition.storyId`, and `findStoryNode(definition, progress.currentNodeId) === null` (#9–12), `loadStoryProgress` calls `deleteStoryProgress` before returning `null` on JSON-parse failure, validation failure, and a restored `invalid` status, and returns `restored` directly on success (#13–14), `saveStoryProgress` gates on `shouldSaveStoryProgress(session.status)` which returns true only for `'story' | 'completed'` (#16–17). No import of `src/engine/`, `src/components/`, `src/platform/`, `sampleStory`, `storyRegistry`, or React anywhere in the file (#29 and part of the general boundary discipline).
- **`storyProgressSave.test.ts`**: 40 tests exercise every validation-reject branch listed above, `restoreStorySession` for `story`/`completed`/`invalid`, save-trigger gating for all four statuses, delete, and load (missing key, malformed JSON, invalid shape, `storyId` mismatch, missing `currentNodeId`, rejected read/write) — all passing (confirmed by `npx vitest run`, §6).
- **`storySessionState.ts`**: `restoreStorySession(definition, progress)` calls the existing private `buildStateFromProgress(definition, progress)` directly — the same function `createStorySession` uses internally — so restore and fresh-create share one code path for deriving `StoryViewModel` and detecting an unresolvable `currentNodeId` (`status: 'invalid'`) (#15).
- **`index.ts`**: `restoreStorySession`, `loadStoryProgress`, `saveStoryProgress`, `deleteStoryProgress`, `serializeStoryProgress`, `validateStoryProgressSaveDocument`, `STORY_PROGRESS_STORAGE_KEY`, `STORY_PROGRESS_SAVE_VERSION`, `StoryProgressSaveDocumentV1`, and `shouldSaveStoryProgress` are all exported from the `storySession` Application Layer boundary, alongside the pre-existing session-transition helpers.
- **`StoryRuntimeScreen.tsx`**: a mount-time `useEffect` calls `loadStoryProgress(storageService, storyDefinition)` and sets `storySession` to the result or `createStorySession(storyDefinition)` (#18–19); a minimal loading state renders while `storySession === null || isRestoringStoryProgress`; `commitStorySession` (`setStorySession` + `void saveStoryProgress(...)`) is called from `handleContinue`, `handleSelectChoice`, `handleMatchComplete`, `handleCancelStoryMatch`, and `handleRestartStory` (#20, #22); `handleRequestMatch` calls only `setStorySession`, never `commitStorySession` (#21); no `sampleStory` or `storyRegistry` import appears anywhere in the file (#23–24); the `GameSessionScreen` element for `mode="storyMatch"` passes `enableActiveGamePersistence={false}` unchanged from M7–M9 (#26).
- **`App.tsx`**: unchanged from M9-PR3 — it still only calls `getStoryCatalog()`/`getStoryDefinition()` to resolve `storyDefinition` and pass it to `StoryRuntimeScreen`; it has no reference to `loadStoryProgress`, `saveStoryProgress`, or `StoryProgress` anywhere (#25).
- **`activeGameSave.ts`**: `ACTIVE_GAME_STORAGE_KEY = 'matgo.v1.activeGame'` — a distinct key from `matgo.v1.storyProgress`, confirming the two persistence documents cannot collide (#27).
- **`StorageService.ts`**: unchanged three-method (`read`/`write`/`delete`) opaque-string interface — no new method, no new parameter (#28).
- **Engine (`src/engine/`)**: `grep -rn "storyProgress|StoryProgress|storySession" src/engine/` returns zero matches — the engine has no reference to any Story System type, persistence or otherwise (#29).
- **docs/25 alignment**: every policy decision in docs/25 §4–§8 (storage key, document shape, save-trigger table, load timing, restart behavior, validation rules) matches its corresponding implementation exactly, as itemized in docs/25 §13 (M10-PR3 Implementation Note) and re-confirmed by this review's direct file reads.

## 5. Current Runtime Flow

**Story Mode entry:**

```
App
→ getStoryCatalog()
→ getStoryDefinition(default storyId)
→ StoryRuntimeScreen(storyDefinition, storageService)
→ loadStoryProgress(storageService, storyDefinition)
→ restored StorySessionState OR createStorySession(storyDefinition)
```

**Story transition:**

```
StoryRuntimeScreen handler
→ Application transition helper
→ next StorySessionState
→ setStorySession(next)
→ saveStoryProgress(storageService, next)
```

**Story Match:**

```
StoryRuntimeScreen
→ GameSessionScreen mode="storyMatch"
→ enableActiveGamePersistence=false
→ onMatchComplete
→ completeStoryMatch
→ saveStoryProgress
```

**Free Match:**

```
App
→ GameSessionScreen standalone
→ ActiveGame persistence remains separate
```

## 6. Findings

- No blocking issue.
- `StoryProgress` persistence is acceptable for MVP continuation.
- Save/load boundary follows `docs/25` exactly — no drift was found between the documented policy and the implementation across M10-PR2 and M10-PR3.
- `StoryProgress` and `ActiveGame` persistence are separated by key (`matgo.v1.storyProgress` vs `matgo.v1.activeGame`) and by responsibility (Story Mode narrative position vs. an in-progress Free Match/Story Match hand of cards).
- `StoryRuntimeScreen` owns runtime persistence orchestration without taking over content discovery — it never imports the registry or a concrete story file, matching the M9 Content Loader Boundary that was signed off in `docs/24`.
- `App.tsx` remains only the story definition selection boundary; it was not touched by M10-PR2 or M10-PR3.
- Engine remains story-agnostic and persistence-agnostic — confirmed by a direct grep, not just by convention.
- Production content should still not begin until at least a small content-pipeline plan exists (see §8).
- Story selection UI should remain deferred until there are at least two story entries or a real player choice to offer (see §9).

Non-blocking observations:

- `StoryRuntimeScreen` now has more responsibility: runtime state *and* persistence orchestration. This is acceptable for MVP because it already owned `StorySessionState` and every transition handler before this PR — persistence wiring added no new state ownership, only new calls at existing call sites. If the component keeps growing (e.g. once a save-toast or "이어하기" UX is added), extracting a `useStoryProgressPersistence` hook would be a reasonable, low-risk refactor — not needed now.
- `saveStoryProgress` is intentionally fire-and-forget and never blocks the UI or surfaces an error to the player. This exactly matches `saveActiveGame`'s established behavior for Free Match — consistent failure handling across both persistence surfaces.
- The single-slot `matgo.v1.storyProgress` key is acceptable while only `sampleStory` exists. `docs/25` §7 already flags that this must be revisited (multi-slot keying, e.g. per-`storyId`) before story selection UI ships with more than one story.
- Story Match mid-game `GameState` is not saved at any point. This is acceptable for MVP because the match result is only committed to `StoryProgress` after `completeStoryMatch` runs — closing the app mid-match loses that one match attempt (returning the player to the `matchRequested`-adjacent `story` node they were on before starting it), not any previously-recorded story progress.
- `loadStoryProgress`'s corrupted-document handling (delete-then-`null`) means a player who somehow gets a corrupted save is silently reset to their last valid saved position — there is no user-visible "your save was reset" notice. For MVP scope with a single validation-only story this is an acceptable trade-off (no telemetry, no support surface exists yet either), but should be reconsidered before it could affect a real, story-invested player.

## 7. Decisions

**Approved:**
- `StoryProgress` persistence helpers (`storyProgressSave.ts`)
- `StoryRuntimeScreen` load/save wiring
- Single-slot `matgo.v1.storyProgress` for the MVP sample-only story
- Save only stable `story`/`completed` states
- Do not save `matchRequested`
- Do not save `invalid`
- Restart overwrites with fresh progress
- Keep `StoryProgress` separate from `ActiveGame` persistence

**Deferred:**
- Production regional/NPC/dialogue content
- Story selection UI
- Multi-story save slots
- Story Match mid-game persistence
- Cloud/account/remote sync
- Save migration beyond version 1
- Analytics/telemetry around save failures

## 8. Production Content Decision

Production regional/NPC/dialogue content remains deferred.

**Reason:**
- The persistence boundary is now in place, but production content needs a content pipeline / minimal content-authoring rules before it begins.
- Adding region/NPC/dialogue/reward/BGM/art metadata all at once risks re-complicating a structure that was just stabilized.
- The next milestone should be an authoring-boundary document, not content itself — see §10.

**Conclusion:** Production regional/NPC/dialogue content remains deferred.

## 9. Story Selection UI Decision

Story selection UI remains deferred.

**Reason:**
- `sampleStory` is still the only registered story.
- A selector would offer the player no real choice yet.
- Multi-story save keying does not exist yet (§7's single-slot assumption).
- Story selection UI should be revisited once at least two story entries exist, or once the first production content batch lands.

**Conclusion:** Story selection UI remains deferred.

## 10. Recommended Next Milestone

Do not proceed directly from M10-H1 to production content.

**Recommended: M11 — MVP Content Authoring Boundary**

Purpose:
- Document which content data fields are allowed before any production content is written.
- Decide whether region/NPC/art/BGM/reward fields are introduced yet, or held back further.
- Decide whether `sampleStory` itself gets expanded, or a new story is authored alongside it.
- Establish content validation rules.
- Lock the format and guardrails before delegating story writing (including to an AI collaborator) to avoid rework.

Considered alternative — M11: Story Mode UX Polish (wording for "이어하기", restart, loading states, Story Mode header) — reasonable, but content-authoring boundaries are the higher-risk unknown now that loader and persistence boundaries both exist. UX polish can follow once the content shape is locked, or be folded into the same milestone if it turns out to be small.

Actual production content should not be written in M11-PR1 — that milestone should also start with a planning/documentation PR, following the same discipline used for M9 and M10.

## 11. Sign-off

**M10 Story Progress Persistence is approved for MVP continuation.**

Approved:
- versioned `StoryProgress` save document
- single-slot MVP story progress key
- Application Layer persistence helpers
- `StoryRuntimeScreen` load/save wiring
- stable-state-only save policy
- restart overwrite policy
- corrupt/invalid save fallback
- `ActiveGame` / `StoryProgress` persistence separation

Deferred:
- production content
- story selection UI
- multi-story save slots
- story match mid-game persistence
- cloud/account sync
- save migration beyond v1

**Next: M11 — MVP Content Authoring Boundary.** See `docs/27_mvp_content_authoring_boundary.md` — before any production content is written, the content authoring rules (allowed schema surface, `storyId`/`nodeId` stability, complexity budget, AI workflow, handoff format, validation checklist) need to be locked, given how directly `storyId`/`nodeId` now interact with the persistence boundary approved in this document.
