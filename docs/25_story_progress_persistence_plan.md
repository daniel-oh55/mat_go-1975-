# Story Progress Persistence Plan

## 1. Purpose

This document defines the storage policy, save timing, reset/restart behavior, migration/versioning strategy, failure handling, and test scope for `StoryProgress` persistence — **before** any of it is implemented.

**M10-PR1 is a planning PR, not an implementation PR.** No `StorageService` changes, no new storage key in code, no schema/version code, and no `StoryRuntimeScreen`/`App.tsx` changes happen in this PR. The goal is to lock the policy so the eventual implementation PR (M10-PR2) is small, reviewable, and doesn't have to make judgment calls mid-implementation.

---

## 2. Current State

- M9 Content Loader Boundary is approved (`docs/24_content_loader_boundary_review.md`).
- `StoryRuntimeScreen` receives an injected `storyDefinition: StoryDefinition` prop — it no longer imports `sampleStory` directly.
- `App.tsx` resolves the default story via `getStoryCatalog()` / `getStoryDefinition()` (`src/content/stories/storyRegistry.ts`).
- `StoryProgress` already exists as an Application Layer type (`src/application/storySession/storyTypes.ts`) — it is fully JSON-serializable by design (see §3).
- `StorageService` already exists (`src/application/storage/StorageService.ts`) with an opaque `read(key) / write(key, value) / delete(key)` string contract, implemented by `BrowserLocalStorageStorageService`, `InMemoryStorageService`, and `CapacitorStorageService`.
- `StorySessionState` — which wraps `StoryProgress` plus a derived `StoryViewModel` and transition bookkeeping — is currently held only in `StoryRuntimeScreen`'s `useState`. It is not persisted anywhere.
- Practical effect: leaving Story Mode (tapping "← 홈으로") and re-entering remounts `StoryRuntimeScreen`, which calls `createStorySession(storyDefinition)` again — the player's story position resets to the start every time, even mid-playthrough.
- A working precedent already exists for a similar problem: Category A (`ActiveGame`) persistence, implemented in `src/application/gameSession/activeGameSave.ts` (M5). It establishes patterns this plan reuses: a versioned JSON document under a namespaced key, fire-and-forget writes with `console.error` on failure, and delete-on-corruption during load.
- Production story content is still deferred. Story selection UI is still deferred (`docs/24` §6).

---

## 3. StoryProgress Shape

```ts
interface StoryProgress {
  readonly storyId: string;
  readonly currentNodeId: string;
  readonly visitedNodeIds: ReadonlyArray<string>;
  readonly matchHistory: ReadonlyArray<MatchOutcome>;
}

interface MatchOutcome {
  readonly humanWon: boolean;
  readonly humanFinalScore: number;
  readonly aiFinalScore: number;
}
```

Both types already exist unchanged in `src/application/storySession/storyTypes.ts`. Their existing doc comment already states the persistence-relevant invariant: *"Must be fully JSON-serializable: no Set, Map, class instances, or functions."* This plan does not propose changing either shape — persistence should slot in around them, not modify them.

---

## 4. Storage Key & Document Shape

Following the Category A naming convention (`matgo.v1.activeGame`):

| Item | Value |
|---|---|
| Storage key | `matgo.v1.storyProgress` |
| Save version constant | `STORY_PROGRESS_SAVE_VERSION = 1` |
| Slot model | **Single slot.** One persisted `StoryProgress` document at a time — matches the MVP's single-story, no-selection-UI state (§2). Multi-story save slots are out of scope until story selection UI exists. |

Proposed persisted document shape (for the M10-PR2 implementation, not added in this PR):

```ts
interface StoryProgressSaveDocumentV1 {
  readonly saveVersion: 1;
  readonly savedAt: string; // ISO 8601
  readonly progress: StoryProgress;
}
```

`savedAt` is metadata for debugging/telemetry only — it must not participate in story-progression logic.

---

## 5. Save Timing / Triggers

`StorySessionState.status` can be `'story' | 'matchRequested' | 'completed' | 'invalid'`. The save policy is keyed off which status a transition lands on, not which helper was called:

| Trigger | New `status` | Save? | Reason |
|---|---|---|---|
| `continueStorySession` (dialogue → next) | `story` or `completed` | **Yes** | Progress moved to a stable, resolvable node. |
| `selectStoryChoice` (choice made) | `story` or `completed` | **Yes** | Same as above. |
| `completeStoryMatch` (match result applied) | `story` or `completed` | **Yes** | This is the trigger the player most needs preserved — losing a just-recorded match result on app close would be the worst-case failure this plan exists to prevent. |
| `requestStoryMatch` (entering `matchRequested`) | `matchRequested` | **No** | Transient. `pendingMatchContext` is fully re-derivable from the current node the moment the player re-enters Story Mode — nothing is lost by not saving it, since the match itself was never persisted either (`GameSessionScreen` is mounted with `enableActiveGamePersistence={false}` for story matches, per `docs/20_story_runtime_architecture.md`). |
| Any transition that lands on `invalid` | `invalid` | **No** | `invalid` means `StoryProgress.currentNodeId` no longer resolves against `StoryDefinition` (content bug or story swap) — persisting a broken position would strand the player permanently. The previously-saved good document is left untouched on disk. |
| `createStorySession` on **initial mount** (fresh or restored) | `story` | **No** | Nothing changed relative to storage yet — if restored, storage already has this document; if fresh, an unplayed session isn't worth a write. Avoids overwriting a just-loaded document with itself. |
| Explicit restart (`"샘플 이야기 다시 시작"` / any future replay action) | `story` (fresh) | **Yes — as an explicit overwrite** | The player's intent is "start over"; the fresh initial `StoryProgress` must replace whatever was saved, not merge with it. |

Writes are fire-and-forget (`await`-ed but errors are caught and logged, never surfaced to the player or blocking the UI), mirroring `saveActiveGame`.

---

## 6. Load Timing

Load happens once, at the Story Mode entry boundary — the same place that currently resolves the default `StoryDefinition` (`App.tsx`, or whatever component owns that responsibility by the time M10-PR2 lands):

1. Resolve `storyDefinition` via the registry (unchanged from M9-PR3).
2. Attempt to read and validate a persisted `StoryProgressSaveDocumentV1` (see §8 for validation rules).
3. If a valid document exists **and** its `storyId` matches `storyDefinition.storyId`, initialize the story session from the persisted `StoryProgress` instead of a fresh one.
4. Otherwise (no document, invalid document, or `storyId` mismatch), fall back to `createStorySession(storyDefinition)` exactly as today.

This requires a new pure constructor analogous to `createStorySession` — something like `restoreStorySession(definition, progress)` — that builds a `StorySessionState` from an existing `StoryProgress` instead of a fresh one. `buildStateFromProgress` in `storySessionState.ts` already does the hard part (deriving `StoryViewModel`, resolving `invalid`); a restore helper would call it directly, without generating a new `createInitialStoryProgress`. This is a design note for M10-PR2 — no code changes here.

---

## 7. Reset / Restart Behavior

- Restarting the story (currently only reachable from an `end` node's "샘플 이야기 다시 시작" button, or the `invalid`-state fallback button) must call both: (a) the existing `createStorySession(definition)` for in-memory state, and (b) an explicit storage write of the resulting fresh `StoryProgress` — not a delete-then-lazy-recreate, so the two never race.
- Leaving Story Mode ("← 홈으로") must **not** delete or reset the persisted document. The whole point of this plan is that leaving and returning preserves progress.
- There is no separate "abandon story" action in the current MVP shell — out of scope until one exists.
- If a future story selection screen (M9-PR4, still deferred) changes which `storyId` is active, switching to a *different* story must not silently overwrite the previous story's saved progress — this plan's single-slot model (§4) is only valid as long as one story exists. Multi-slot keying (e.g. `matgo.v1.storyProgress.<storyId>`) is deferred until story selection is implemented and is called out explicitly so the single-slot assumption isn't forgotten.

---

## 8. Failure Handling & Validation

Mirrors `validateActiveGameDoc` / `loadActiveGame` in `activeGameSave.ts`:

**On write:**
- Wrap `storage.write(...)` in try/catch; on failure, `console.error` and continue — a failed save must never block or interrupt the story flow.

**On read, reject and delete the document (falling back to a fresh session) if:**
- The stored value is not valid JSON.
- `saveVersion` is missing, not a positive integer, or greater than `STORY_PROGRESS_SAVE_VERSION` (a save from a newer app version).
- `progress.storyId`, `progress.currentNodeId` are not strings, or `progress.visitedNodeIds` / `progress.matchHistory` are not arrays.
- Any `matchHistory` entry fails basic `MatchOutcome` shape validation (`humanWon: boolean`, `humanFinalScore: number`, `aiFinalScore: number`).
- `progress.storyId` does not match the `storyId` of the `StoryDefinition` currently resolved by the registry (defends against a future story swap or content edit changing which story is "current").
- `progress.currentNodeId` does not resolve against the current `StoryDefinition.nodes` (defends against edits to `sampleStory`, or any future story, that remove/rename a node a player was sitting on) — this reuses the same "no viewModel" signal `buildStateFromProgress` already produces for `invalid`, so the validator does not need to duplicate that logic; it can attempt the restore and treat a resulting `invalid` status as a load failure.
- A corrupted or rejected document is deleted from storage before falling back to a fresh session — never left in place to fail the same way on every subsequent load.

**Never:**
- Never crash the app on a malformed or missing document.
- Never surface a raw error message to the player — a fresh story start is an acceptable degraded outcome, not an error state.

---

## 9. Non-Goals for M10-PR1

- No implementation of read/write/validate functions.
- No new `StorageService` methods or changes to its opaque string contract.
- No `StoryRuntimeScreen` or `App.tsx` changes.
- No `storyRegistry` changes.
- No production story content.
- No story selection UI.
- No multi-slot / multi-story save keying (see §7).
- No engine changes — the engine has never known about `StoryProgress` and this plan does not change that.
- No dependency changes, no Android/Capacitor changes, no monetization changes.

---

## 10. Test Plan for the Future Implementation PR (M10-PR2)

Following the `activeGameSave.test.ts` model (38 tests for Category A), the M10-PR2 implementation should include tests for:

**Implemented in M10-PR2** (`src/application/storySession/storyProgressSave.test.ts`, 40 tests):

- `serializeStoryProgress` produces a `StoryProgressSaveDocumentV1` with the current `saveVersion` and an ISO `savedAt`.
- `saveStoryProgress` writes to `matgo.v1.storyProgress` only when status is `story` or `completed` (§5); is a no-op for `matchRequested` and `invalid`.
- `saveStoryProgress` catches and logs a rejected `storage.write` without throwing.
- `loadStoryProgress` returns `null` when the key does not exist.
- `loadStoryProgress` returns `null` and deletes the key on malformed JSON.
- `loadStoryProgress` returns `null` and deletes the key on each individual invalid-shape case in §8 (missing/invalid `saveVersion`, future `saveVersion`, wrong-typed fields, invalid `matchHistory` entries).
- `loadStoryProgress` returns `null` and deletes the key when `progress.storyId` does not match the current `StoryDefinition.storyId`.
- `loadStoryProgress` returns `null` and deletes the key when `progress.currentNodeId` does not resolve against the current `StoryDefinition`.
- `loadStoryProgress` returns a working `StorySessionState` (via the new restore helper) for a valid, matching document.
- `loadStoryProgress` returns `null` when `storage.read` rejects.
- `restoreStorySession` restores `story`, `completed`, and `invalid` statuses correctly from a given `StoryProgress`.

**Deferred to M10-PR3** (require UI wiring to exercise):
- Restart writes a fresh document that overwrites any previously saved one — this is a `StoryRuntimeScreen` behavior (§7), not a helper-level unit test; the helpers themselves (`saveStoryProgress` with a fresh `StoryProgress`) are already covered above.
- Manual/E2E scenario (Playwright, matching the pattern used in M9-PR3 verification): play into the story, leave to Home, re-enter Story Mode, confirm the same node/history is shown instead of the intro.

---

## 11. Proposed M10 PR Sequence

### M10-PR1 — Story Progress Persistence Plan
Documentation only. This PR.

### M10-PR2 — Story Progress Persistence Helpers
Implement `serializeStoryProgress` / `validateStoryProgressSaveDocument` / `saveStoryProgress` / `loadStoryProgress` / `deleteStoryProgress` / a `restoreStorySession` helper, following §4–§8 exactly, with the "Implemented in M10-PR2" test list from §10. **No UI wiring** — `StoryRuntimeScreen` and `App.tsx` are untouched, so the helpers are reviewable purely as an Application Layer surface before any runtime behavior changes.

### M10-PR3 — StoryRuntimeScreen Persistence Wiring
Wire `loadStoryProgress` into the Story Mode entry boundary (in place of always calling `createStorySession`) and `saveStoryProgress` into `StoryRuntimeScreen`'s transition handlers, per §5–§6. Wire the explicit-overwrite restart behavior from §7. Add the "Deferred to M10-PR3" scenarios from §10 (manual/Playwright verification that leaving and re-entering Story Mode preserves progress). No production content, no story selection UI.

### M10-H1 — Story Progress Persistence Review
Sign-off review, following the same format as `docs/24_content_loader_boundary_review.md`, before any further Story Mode feature work (selection UI, production content) begins.

---

## 12. Recommendation

Do not begin M10-PR2 implementation until this plan is reviewed and agreed. The policy decisions in §5–§8 (especially: which transitions save, what counts as a corrupt/mismatched document, and the single-slot assumption in §7) are exactly the kind of judgment calls that are cheap to get right in a document and expensive to get wrong in shipped persistence code that real players' saves depend on.

---

## 13. M10-PR3 Implementation Note

- `StoryRuntimeScreen` implements the §6 load-timing policy exactly: on mount, a `useEffect` calls `loadStoryProgress(storageService, storyDefinition)`, restores the result if non-null, and otherwise falls back to `createStorySession(storyDefinition)` — with a minimal loading state shown while restoring, and a `cancelled` guard against a post-unmount `setState`.
- The §5 save-trigger table is implemented via a `commitStorySession` helper (`setStorySession` + `void saveStoryProgress(...)`) called from every transition that can land on `story`/`completed` (`handleContinue`, `handleSelectChoice`, `handleMatchComplete`, `handleCancelStoryMatch`) plus the explicit restart handler. `handleRequestMatch` deliberately skips `commitStorySession` entirely — matching this document's "선택 B" recommendation of not calling save at all for `matchRequested`, rather than relying solely on `saveStoryProgress`'s internal no-op.
- The §7 restart policy is implemented literally: `handleRestartStory` calls `commitStorySession(createStorySession(storyDefinition))`, so the fresh progress overwrites storage in the same call, never via a separate delete.
- The §6/§7 "load once at the Story Mode entry boundary" design point is satisfied by `StoryRuntimeScreen` itself, per the M10-PR3 instruction's boundary decision — `App.tsx` remains unchanged and still only resolves `storyDefinition` via the registry; it does not know about `StoryProgress` at all.
- All six scenarios from §10's "Deferred to M10-PR3" list were verified manually with Playwright against a running dev server: fresh start (no save → intro), continue-then-reenter (persists mid-dialogue position), match-result-then-reenter (persists the completed end node and `matchHistory`), restart-overwrite (storage reset to a fresh intro document), Free Match standalone (unaffected, own `matgo.v1.activeGame` key), and Story Match (writes only `matgo.v1.storyProgress`, never `matgo.v1.activeGame`, confirming `enableActiveGamePersistence={false}` still holds). No console errors in any scenario.
- Next: **M10-H1 — Story Progress Persistence Review**, to sign off the save/load boundary now that it is live, before any further Story Mode feature work (selection UI, production content) begins.

---

## 14. M10-H1 Review Note

- Full sign-off is documented in `docs/26_story_progress_persistence_review.md` — a 32-item boundary checklist covering M10-PR1–PR3, with no blocker found.
- **M10 Story Progress Persistence is approved for MVP continuation**: the storage key, versioned single-slot document, save-trigger policy, restart-overwrite behavior, and corrupt/invalid-save fallback all hold exactly as designed in §4–§8 of this document.
- Production story content and story selection UI remain deferred (unchanged from §9/§12 of this document).
- Recommended next milestone: **M11 — MVP Content Authoring Boundary**, starting with a documentation/planning PR before any production content is written.
