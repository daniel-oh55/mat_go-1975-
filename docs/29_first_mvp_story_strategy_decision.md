# First MVP Story Strategy Decision

## 1. Purpose

This document decides which strategy the first MVP story / production-like story should follow, before any production content is written.

This is a strategy decision, not a content implementation. It does not write a story, expand `sampleStory`, or change the registry. It decides which of the three options `docs/27` §10 raised should be executed, and what has to be true before that execution can safely begin.

## 2. Inputs Reviewed

- `docs/23_content_loader_architecture.md`
- `docs/24_content_loader_boundary_review.md`
- `docs/25_story_progress_persistence_plan.md`
- `docs/26_story_progress_persistence_review.md`
- `docs/27_mvp_content_authoring_boundary.md`
- `docs/28_story_schema_content_validation_review.md`
- `src/content/stories/sample/sampleStory.ts`
- `src/content/stories/storyRegistry.ts`
- `src/App.tsx`
- `src/components/story/StoryRuntimeScreen.tsx`

## 3. Current State

- `storyRegistry` currently registers `sampleStory` only.
- `sampleStory` is a runtime validation fixture — 4 nodes, 1 match, 2 endings (`docs/28` §3).
- `App.tsx` resolves the first catalog entry (`getStoryCatalog()[0]`) as the default story — safe today only because there is exactly one entry.
- `StoryRuntimeScreen` receives an injected `StoryDefinition` prop; it does not discover content itself.
- `StoryProgress` persistence uses a single-slot key: `matgo.v1.storyProgress`.
- `StoryProgress` save/load validates both `storyId` and `currentNodeId` against the currently-resolved `StoryDefinition` (`docs/25` §8, `docs/26` checklist #9–15).
- Story selection UI remains deferred (`docs/24` §6, `docs/27` §9).
- Multi-story save slots remain deferred (`docs/25` §7).
- Production content has not started.
- Layer 1 graph validation (`validateStoryDefinition`) is not implemented yet — proposed as a strong candidate in `docs/28` §6.

## 4. Strategy Options

Re-evaluating the three options `docs/27` §10 raised, now with `docs/28`'s validation findings folded in.

### Option A — Keep `sampleStory` as fixture and add a separate production story

`sampleStory` stays a validation fixture; the first production story is added as a separate content file and a second `storyRegistry` entry. `App.tsx`'s default-story selection must change to point at the production story explicitly.

**Advantages:** the validation fixture and production content stay cleanly separated — this is the architecture `docs/23`'s five-layer boundary table was designed around, and it means production content can be edited, replaced, or even removed later without touching `sampleStory.test.ts` or any of the Playwright verification scripts that already depend on `sampleStory`'s exact shape.

**Risks:**
- `storyRegistry` grows to two-or-more entries, and `App.tsx`'s current "take `getStoryCatalog()[0]`" logic becomes ambiguous the instant array order isn't guaranteed to put the production story first.
- Story selection UI doesn't exist, but there would now be two stories — nothing currently prevents a player from ending up on the wrong default.
- The single-slot `matgo.v1.storyProgress` key has no way to distinguish "the player has progress in `sampleStory`" from "the player has progress in the production story" — a `storyId` mismatch is already handled safely (the mismatched save is discarded, `docs/25` §8), but that means switching which story is "default" would silently erase whichever story's save doesn't match, which is a correctness risk for whoever is testing/using `sampleStory` at that time, not a crash risk.
- No explicit "this story is the default" rule exists yet — see §8.

**Judgment:** this is the correct long-term direction, but not something to execute today — the prerequisites in §6 need to land first.

### Option B — Grow `sampleStory` into a production-like MVP story

`sampleStory` itself is incrementally expanded with more nodes, more dialogue, and eventually production-quality content. `storyRegistry` stays at one entry; the selector/multi-slot-save problem never arises.

**Advantages:** structurally the simplest path — no `App.tsx` change, no registry-order ambiguity, no single-slot save conflict, and the fastest route to something that feels player-facing.

**Risks:**
- Mixes a validation fixture with production narrative content. `sampleStory.test.ts` asserts on `sampleStory`'s current minimal shape, and every milestone's manual/Playwright verification since M7 has driven `sampleStory`'s exact dialogue/match/end flow — growing it means both the committed unit test and every future manual verification pass need to evolve in lockstep with narrative decisions, coupling test infrastructure to content decisions in a way this project has avoided everywhere else.
- The registry's `status: 'sample'` label becomes inaccurate the moment the content stops being sample-only.
- Long-term cleanup cost: eventually someone has to decide where the "test fixture" ends and the "real story" begins inside a single file that was never designed for that split.

**Judgment:** rejected for now. This trades a short-term convenience (no `App.tsx` change) for a durable violation of the same fixture/production separation this project already protects in `docs/23`/`docs/27`.

### Option C — Do not start production content yet

`sampleStory` stays exactly as it is; no production story is added; the immediate next steps are structural (graph validation, default-story rule) rather than narrative.

**Advantages:** safest option available. Nothing built in M9–M11 so far gets blurred. It directly enables the next PR to add Layer 1 graph validation against a known-stable, single-story registry, without simultaneously reasoning about a second story's content.

**Risks:** player-facing content growth is delayed further; the "여행/성장/운명" experience this project is ultimately building toward doesn't move forward this milestone.

**Judgment:** current recommendation for M11.

## 5. Decision

**Short-term decision: Option C is selected for M11.**

This means:
- No production content is added in M11.
- `sampleStory` is not expanded into production-like content.
- `sampleStory` remains a runtime validation fixture.
- `storyRegistry` stays sample-only for now.
- Story selection UI remains deferred.
- Multi-story save remains deferred.

**Strategic direction:** Option A remains the preferred long-term direction for the first real production story — separate file, separate registry entry, `sampleStory` preserved — but only after the prerequisites in §6 are met.

**Option B is rejected for now**, because it mixes a validation fixture with production content, which this project's architecture has consistently avoided (`docs/23` §3, `docs/27` §10).

## 6. Required Prerequisites Before Option A

Before executing Option A (adding a second, production `storyRegistry` entry):

1. Layer 1 story graph validation exists (`docs/28` §5–§7) — a broken graph must be caught before it ships, not discovered by a player.
2. The first production story's scope is approved (region, NPC, node count within `docs/27` §6's budget).
3. The default-story selection rule is made explicit (§8) — "first catalog entry" cannot remain the mechanism once there are two entries.
4. The `StoryProgress` single-slot save assumption is explicitly reviewed against having two stories (§9) — accepted, revised, or deferred with a stated reason.
5. `storyRegistry` ordering must not implicitly decide the production default — whatever replaces "first entry" must be order-independent.
6. `sampleStory`'s registered status is clarified for the two-story state — does it stay registered as `status: 'sample'` and simply not be the default, or does something else change about how it's exposed?
7. Story selection UI is either explicitly kept deferred (players never see two stories, one is silently the "real" default) or gets a separate, approved plan — not left ambiguous.
8. The first production story has a stated `storyId`/`nodeId` stability policy in its own PR description, per `docs/27` §5/§11.
9. The production content PR uses the `docs/27` §8 content handoff format.

## 7. Layer 1 Graph Validation Decision

Layer 1 scope (from `docs/28` §5, unchanged):
- `storyId` is non-empty
- `startNodeId` exists
- `nodeId` is unique
- dialogue/match `next` entries resolve
- choice `nextNodeId` entries resolve
- at least one `end` node is reachable from `startNodeId`

**Not implemented in this PR.**

**Decision:** Layer 1 graph validation should be implemented **before** any production story content is added — not after.

**Reasoning:**
- A broken graph link directly blocks player progress — this is the single highest-risk content-authoring error this project has identified across `docs/27`/`docs/28`.
- `sampleStory` is already a small, stable fixture — writing the first validation test against it is close to zero-risk today, and validates the tool itself before it's needed for anything higher-stakes.
- Adding validation *after* production content exists means the first production story ships with no safety net exactly when one matters most.
- Validation infrastructure should exist before content-writing volume increases, not be retrofitted once a broken graph is already discovered by a player.

**Proposed next PR:** `M11-PR4 — Minimal Story Graph Validation`.

## 8. Default Story Selection Risk

`App.tsx` currently resolves the default story via:
```ts
function getDefaultStoryDefinition() {
  const firstStory = getStoryCatalog()[0];
  return firstStory === undefined ? null : getStoryDefinition(firstStory.storyId);
}
```

- This is safe today because `storyRegistry` has exactly one entry — "first" and "only" are the same thing.
- The moment a production story is added (Option A), "first catalog entry" becomes an accident of array order, not a deliberate choice — reordering `storyRegistry` for any unrelated reason (e.g. alphabetizing, or inserting a story for a future feature) would silently change which story every player sees by default.
- Registry order deciding a player-facing default is a maintainability risk this project should not accept, matching the general principle (`docs/27` §14) that this project's risk right now is structural clarity, not content volume.
- An explicit default-story rule is required before Option A executes. Not implemented in this PR — documented here as a decision that must be made first. Possible future directions (not decided, not scoped, listed only for awareness):
  - A `getDefaultStoryDefinition()` helper that filters by an explicit rule rather than array position.
  - Preferring `status: 'production'` entries over `status: 'sample'` when resolving the default.
  - An explicit `defaultStoryId` constant somewhere in the Content Layer.
  - Story selection UI (still deferred, but would eliminate the need for an implicit default entirely).
  - App-level route/selection state, if routing is ever introduced.

## 9. Single-Slot Save Risk

`StoryProgress` persistence uses a single storage key, `matgo.v1.storyProgress`.

- Safe today: exactly one story exists, so there is exactly one thing to save progress for.
- Once two stories exist, "switching" which story is active needs defined behavior — `validateStoryProgressSaveDocument` already rejects a `storyId` mismatch and discards the mismatched save (`docs/25` §8), which means: if `sampleStory` and a production story share the single slot, whichever one didn't write the most recent save gets silently reset the next time it's loaded. This is not a crash, but it is a correctness/trust risk — a player (or a developer manually testing `sampleStory`) could lose progress without any visible cause.
- Multi-story save slots remain explicitly deferred (`docs/25` §7) — this decision is not changed here.

**Conclusion:** the single-slot save assumption must be explicitly reviewed before Option A executes. One mitigation that would let single-slot persist a while longer: if the first production story is fixed as the sole player-facing default and `sampleStory` is effectively hidden from normal play (still registered, still tested, just never selected as default), the single slot could continue to work for the production story specifically — but this is itself a decision that belongs in the Option A execution PR, not assumed here.

## 10. Why Not Add Production Content Now?

- Graph validation does not exist yet (§7).
- The default-story selection rule does not exist yet (§8).
- The single-slot save assumption has not been reviewed against a multi-story state yet (§9).
- `sampleStory`'s fixture role needs to be preserved, not blurred, while these prerequisites are built.
- Once production content exists, `storyId`/`nodeId` stability problems become real save-data problems for real players, not just documentation concerns (`docs/27` §5).
- The current risk to this project is not "not enough content" — it is content arriving before the structure that would keep it safe is finished.

## 11. Proposed Next PR Sequence

### M11-PR4 — Minimal Story Graph Validation
Implement Layer 1 graph validation (`docs/28` §7's pseudo-design). Validate `sampleStory`. Validate registered stories if low-risk to do so within the same PR. No production content. No schema change.

### M11-H1 — Content Authoring Boundary Review
Review `docs/27`, `docs/28`, `docs/29`, and the graph validation landed in M11-PR4. Sign off whether M12 can begin first-production-story planning/content.

### M12-PR1 — First Production Story Scope / Handoff
Docs/content planning only. Uses the `docs/27` §8 handoff format. No code content until scope is approved.

### M12-PR2 or later — First Production Story Implementation
Only after M12-PR1 is approved. Small story only, sized per `docs/27` §6's budget. Must pass Layer 1 validation before merging.

**Note:** inserting M11-PR4 before M11-H1 changes the sequence `docs/27` §12 originally proposed (which had M11-H1 immediately after M11-PR3). This is a deliberate, safe adjustment — `docs/28` §6 already flagged Layer 1 validation as a strong candidate, and reviewing the content authoring boundary (M11-H1) without the validation safety net it recommends in place would be reviewing an incomplete picture.

## 12. Non-Goals

This PR does not:
- Write production story content.
- Expand `sampleStory`.
- Change `storyRegistry`.
- Implement default story selection.
- Implement a graph validator.
- Change the schema.
- Implement story selection UI.
- Add multi-story save.
- Add region/NPC/art/BGM/reward metadata.
- Change the engine.
- Change persistence.
- Change monetization.

## 13. Final Recommendation

- M11 selects Option C for now.
- `sampleStory` remains a validation fixture.
- Production content remains deferred.
- Option A remains the preferred long-term strategy, but only after the §6 prerequisites are met.
- Option B is rejected for now.
- Layer 1 graph validation should be implemented before production content — proposed as **M11-PR4**.
- M11-H1 should happen after M11-PR4, not before.
