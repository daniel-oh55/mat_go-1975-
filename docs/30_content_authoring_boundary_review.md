# Content Authoring Boundary Review

## 1. Purpose

M11-H1 is a sign-off document reviewing whether the MVP content authoring boundary built across M11-PR1–PR4 is safe enough to begin production content.

This document is not content implementation. It is a quality gate — the door to first-production-story *planning*, not to writing content directly.

## 2. Reviewed Scope

- `docs/27_mvp_content_authoring_boundary.md`
- `docs/28_story_schema_content_validation_review.md`
- `docs/29_first_mvp_story_strategy_decision.md`
- `src/content/validation/storyDefinitionValidation.ts`
- `src/content/validation/storyDefinitionValidation.test.ts`
- `src/content/schemas/storySchema.ts`
- `src/content/stories/sample/sampleStory.ts`
- `src/content/stories/storyRegistry.ts`
- `src/App.tsx`
- `src/components/story/StoryRuntimeScreen.tsx`
- `docs/23_content_loader_architecture.md`
- `docs/24_content_loader_boundary_review.md`
- `docs/25_story_progress_persistence_plan.md`
- `docs/26_story_progress_persistence_review.md`

## 3. Boundary Checklist

| # | Item | Result |
|---|---|---|
| 1 | Current `StoryDefinition` schema is sufficient for a small MVP story. | PASS |
| 2 | Current `StoryDefinition` schema is not expanded for production-scale metadata. | PASS |
| 3 | `sampleStory` remains a runtime validation fixture. | PASS |
| 4 | `sampleStory` is not expanded into production content. | PASS |
| 5 | `storyRegistry` remains sample-only. | PASS |
| 6 | Production story content remains deferred. | DEFERRED |
| 7 | Story selection UI remains deferred. | DEFERRED |
| 8 | Multi-story save remains deferred. | DEFERRED |
| 9 | Option C is selected for M11. | PASS |
| 10 | Option A remains preferred long-term direction, gated by prerequisites. | PASS |
| 11 | Option B is rejected for now. | PASS |
| 12 | Layer 1 graph validation exists. | PASS |
| 13 | Layer 1 validator checks non-empty `storyId`. | PASS |
| 14 | Layer 1 validator checks non-empty `nodes`. | PASS |
| 15 | Layer 1 validator checks non-empty `nodeId`. | PASS |
| 16 | Layer 1 validator checks duplicate `nodeId`. | PASS |
| 17 | Layer 1 validator checks `startNodeId` exists. | PASS |
| 18 | Layer 1 validator checks dialogue/match `next` links resolve. | PASS |
| 19 | Layer 1 validator checks choice `nextNodeId` links resolve. | PASS |
| 20 | Layer 1 validator checks at least one reachable `end` node. | PASS |
| 21 | Layer 1 validator ignores `UnlockCondition` evaluation. | PASS |
| 22 | Layer 1 validator is cycle-safe. | PASS |
| 23 | Layer 1 validator imports only content schema types in production code. | PASS |
| 24 | Layer 1 validator does not import `sampleStory` or `storyRegistry` in production code. | PASS |
| 25 | `sampleStory` passes validation. | PASS |
| 26 | All registered story definitions pass validation. | PASS |
| 27 | Engine remains content-agnostic. | PASS |
| 28 | `StoryRuntimeScreen` does not import concrete story files. | PASS |
| 29 | `App.tsx` still uses single default-story resolution and remains safe only because the registry has one entry. | PASS (as documented risk) |
| 30 | Default story selection rule remains unresolved before Option A. | DEFERRED (open risk, tracked) |
| 31 | Single-slot `StoryProgress` save remains unresolved before multi-story content. | DEFERRED (open risk, tracked) |
| 32 | Region/NPC/art/BGM/reward metadata remain deferred. | DEFERRED |
| 33 | Production content requires a separate M12 planning/handoff PR before implementation. | PASS |

## 4. Verification Basis

- **`docs/27`**: authoring boundary — current content surface (read directly from `storySchema.ts`/`storyRegistry.ts`), allowed/forbidden content rules, `storyId`/`nodeId` stability rules, content complexity budget, four-role AI content workflow, content handoff format, `sampleStory` strategy options (#1–5, #32).
- **`docs/28`**: schema sufficiency judgment, four-layer validation classification (graph/registry/boundary/authoring-policy), persistence risk review connecting `storyId`/`nodeId`/`next`-graph changes to save safety, schema gap review without schema expansion (#1, #2, #12).
- **`docs/29`**: Option C selected for M11, Option A confirmed as long-term direction gated on nine explicit prerequisites, Option B rejected, decision that Layer 1 validation lands before production content (#9, #10, #11, #12).
- **`storyDefinitionValidation.ts`**: read directly — `validateStoryDefinition` checks exactly the eight Layer 1 items (#13–20); a single `import type { StoryDefinition, StoryNode, StoryNodeId } from '../schemas/storySchema.js'` is the only import in the file — no `sampleStory`, `storyRegistry`, engine, application, components, platform, or React import (#23, #24); `UnlockCondition` is never referenced in the file (#21); reachability traversal uses a `visited` Set and terminates via a `while (queue.length > 0)` loop that only enqueues unvisited nodes (#22).
- **`storyDefinitionValidation.test.ts`**: 13 tests — `sampleStory` passes (#25), every `storyRegistry` entry's definition passes (#26), 8 individually-tested invalid-graph rejections, a choice-reachable-end acceptance case, and a cycle-with-reachable-end acceptance case confirming no infinite loop.
- **`sampleStory.ts`**: unchanged since M6 — 4 nodes (`sample-intro`, `sample-match-01`, `sample-end-win`, `sample-end-default`), explicitly documented as "NOT production content" (#3, #4).
- **`storyRegistry.ts`**: `storyRegistry` array has exactly one entry (#5).
- **`App.tsx`**: unchanged since M9-PR3 — `getDefaultStoryDefinition()` still resolves `getStoryCatalog()[0]`, which is safe today only because there is one catalog entry (#29 — confirmed as a documented, not hidden, risk per `docs/29` §8).
- **`StoryRuntimeScreen.tsx`**: unchanged since M10-PR3 — takes `storyDefinition` as a prop; no `sampleStory` or `storyRegistry` import anywhere in the file (#28).
- **Engine (`src/engine/`)**: `grep -rn "storyProgress|StoryProgress|storySession|StoryDefinition" src/engine/` returns zero matches (#27).
- **`docs/23`–`docs/26`**: confirm the loader and persistence boundaries this review builds on remain unchanged and were already separately signed off (M9-H1, M10-H1) — this review does not re-litigate those, only checks that M11's additions are consistent with them.

## 5. Current State Summary

**Story content state:**
- `sampleStory` only.
- Registry sample-only.
- No production content.
- No Region/NPC data model.
- No story selection UI.

**Runtime state:**
- `App.tsx` resolves the default story from the registry.
- `StoryRuntimeScreen` receives an injected `StoryDefinition`.
- `StoryProgress` persistence is active (M10).
- Single-slot save key (`matgo.v1.storyProgress`) remains in use.

**Validation state:**
- Layer 1 graph validation implemented (M11-PR4).
- `sampleStory` and all registered stories pass.
- Layer 2 (registry integrity) mostly covered already by the existing M9-PR2 `hasDuplicateStoryId` test; no dedicated `validateStoryRegistry` exists (deliberately, per `docs/28` §6/`docs/28` §15).
- Layer 3 (import boundary) remains manual/later, per `docs/28` §5.
- Layer 4 (authoring policy: node-count budget, metadata creep, persistence-impact notes) remains manual, indefinitely, per `docs/28` §5.

## 6. Findings

- No blocking issue.
- The M11 content authoring boundary is acceptable for MVP continuation.
- The project is now safe to begin M12 first-production-story **planning**, but not direct implementation.
- Production content should still not be written until a story scope/handoff PR is approved (see §8).
- `sampleStory` should remain a validation fixture — nothing in M11 changed that judgment.
- Option A is still the preferred long-term path, but only after its prerequisites (`docs/29` §6) are met.
- Layer 1 validation meaningfully reduces broken-graph risk before content writing begins — it is a real safety net, not a formality, confirmed by its own test suite passing against both the fixture story and a set of deliberately-broken graphs.
- The default-story selection rule and the single-slot save assumption remain unresolved risks that must be addressed before a second story is registered — this review does not resolve them, it confirms they are known and tracked (§9).
- Story selection UI remains unnecessary while there is only one player-facing story.
- Region/NPC/art/BGM/reward metadata should remain deferred.

Non-blocking observations:

- The validator does not check for empty `next` arrays or empty `choices` lists. This is acceptable — M11-PR4 intentionally implemented only the agreed Layer 1 scope (`docs/28` §5, `docs/29` §7), and such gaps are typically caught indirectly by the "at least one reachable end" check, since a node with no outgoing edges that isn't itself an `end` node cannot reach one.
- The validator does not evaluate `UnlockCondition`. This is correct by design — unlock evaluation is Application Layer runtime behavior (`storyProgression.ts`'s `evaluateUnlockCondition`), not content graph structure, and conflating the two would reintroduce exactly the kind of layer-crossing this project's architecture has consistently avoided.
- Registry-level validation (Layer 2) may become genuinely useful the moment a second story is registered — right now, with one entry, there is nothing to cross-check `catalog.storyId === definition.storyId` against beyond the trivial case.
- Import-boundary automation (Layer 3) may become worth building once there is more than one content file to watch by hand — today, manual review of a single file (`sampleStory.ts`) is not a burden.

## 7. Decisions

**Approved:**
- Current MVP content authoring boundary (`docs/27`).
- Current `StoryDefinition` schema for very small MVP story authoring.
- `sampleStory` as a validation fixture.
- Option C selected for M11.
- Option A as the preferred long-term first-production-story strategy.
- Layer 1 graph validation implemented before production content.
- M12 may begin with first-production-story scope/handoff planning.

**Deferred:**
- Production story implementation.
- Story selection UI.
- Multi-story save slots.
- Default story selection implementation.
- Region/NPC/art/BGM/reward metadata.
- Layer 2/3/4 automation.
- Rich production-scale regional content.

**Rejected for now:**
- Option B — growing `sampleStory` into production-like content.

## 8. M12 Recommendation

M12 should not begin directly with story implementation — it should start with planning/handoff.

**Recommended: M12-PR1 — First Production Story Scope / Handoff Plan**

Purpose:
- Define the first production story's region, NPC, story purpose, player emotion, node budget, match purpose, and choice purpose.
- Actually use the `docs/27` §8 content handoff format for the first time, rather than leaving it a template.
- Propose a `storyId`/`nodeId` naming policy for the first production story.
- Jointly review how the default-story selection risk (§9) and the single-slot save assumption (§9) will be handled for this specific story, rather than leaving them abstract.
- No `src` content added yet.

M12-PR2 or later handles actual content implementation — and only after M12-PR1 is approved. Approving M12-PR1 in this review does **not** pre-approve M12-PR2; that PR requires its own review once the scope is concrete.

## 9. Remaining Risks Before Production Content

| # | Risk | Blocker before M12-PR1 (planning)? | Blocker before M12-PR2 (implementation)? |
|---|---|---|---|
| 1 | Default story selection rule unresolved. | No — planning can proceed without deciding this yet, but the plan should address it. | **Yes** — must be resolved before a second story is actually registered. |
| 2 | Single-slot `StoryProgress` save assumption unresolved for two stories. | No | **Yes** — must be explicitly reviewed and either accepted (with the "hide `sampleStory` from default play" mitigation from `docs/29` §9) or revised. |
| 3 | Story selection UI still deferred. | No | No, as long as decision #1 makes UI unnecessary (single implicit default). |
| 4 | Region/NPC identity is still prose-only, no structured model. | No | No — this is an accepted, deliberate MVP constraint, not a defect. |
| 5 | No automated import-boundary check yet (Layer 3). | No | No — manual review remains sufficient at current content-file volume. |
| 6 | No content versioning (on `StoryDefinition` itself, distinct from `StoryProgressSaveDocumentV1.saveVersion`). | No | No — not needed until content actually needs to version independently of the save schema. |
| 7 | No localization structure. | No | No — out of MVP scope entirely for now. |
| 8 | No story graph migration for released production content. | No | No — `docs/25`/`docs/27` already accept this; ID stability discipline substitutes for migration. |
| 9 | No player-facing corrupted-save notice. | No | No — accepted trade-off from `docs/26` §6, unchanged. |
| 10 | No production content handoff has been reviewed yet. | **Yes — this is exactly what M12-PR1 produces.** | Yes, trivially — M12-PR2 cannot start without it. |

**Judgment:** M12-PR1 planning can proceed now. M12-PR2 implementation must not proceed until risks #1 and #2 are explicitly resolved as part of executing Option A (per `docs/29` §6's prerequisite list), and until #10 (the handoff itself) exists and is approved.

## 10. Sign-off

**M11 MVP Content Authoring Boundary is approved for MVP continuation.**

Approved:
- `docs/27` authoring boundary
- `docs/28` validation review
- `docs/29` first story strategy decision
- M11-PR4 Layer 1 graph validation
- `sampleStory` remains a validation fixture
- Production content remains deferred until M12 planning

Next:
- **M12-PR1 — First Production Story Scope / Handoff Plan**

Not approved yet:
- Production story implementation
- Second story registration
- Default story selection change
- Story selection UI
- Multi-story save
