# Story Schema Content Validation Review

## 1. Purpose

M11-PR2 is a check-only review of whether the current `StoryDefinition` schema is sufficient for authoring the first MVP story, and whether/what content validation is worth building before production content begins.

This document is not a schema-change document and not a validator implementation document. It reviews needs and classifies them — it does not build anything.

## 2. Reviewed Scope

- `src/content/schemas/storySchema.ts`
- `src/content/stories/sample/sampleStory.ts`
- `src/content/stories/storyRegistry.ts`
- `docs/23_content_loader_architecture.md`
- `docs/24_content_loader_boundary_review.md`
- `docs/25_story_progress_persistence_plan.md`
- `docs/26_story_progress_persistence_review.md`
- `docs/27_mvp_content_authoring_boundary.md`

## 3. Current Schema Sufficiency

| Requirement | Current schema support |
|---|---|
| `StoryDefinition` has `storyId`/`startNodeId`/`nodes` | Yes — exact shape in `storySchema.ts`, unchanged since M6. |
| Dialogue nodes can carry a simple conversation | Yes — `DialogueStoryNode.dialogue: DialogueLine[]`, each with `speakerId`/`text`, plus a linear `next` array. |
| Match nodes can represent story-triggered matches | Yes — `MatchStoryNode.matchContext: { npcId, regionId, presentationHints? }`, with `next` candidates resolved by the Application Layer based on match outcome. |
| Choice nodes can represent small branch points | Yes — `ChoiceStoryNode.choices: StoryChoice[]`, each with its own `nextNodeId` and optional `unlockCondition`. |
| End nodes can terminate a story | Yes — `EndStoryNode` is terminal, no `next`. |
| `UnlockCondition` supports minimal branching | Yes, but narrowly — exactly four variants exist (`always`, `humanWon`, `visitedNode`, `matchesPlayed`). This is enough to gate an ending on a match result, on having seen a prior node, or on a match count, but nothing more elaborate (no arbitrary boolean combination, no item/flag-based conditions). |
| `RegionId`/`NpcId` are opaque strings, enough for MVP-level references | Yes — both are `type X = string` with no backing data model. A story can *reference* a region or NPC by ID, but the schema carries no name, description, or other metadata about what that ID means — that lives entirely in prose/dialogue text today. |
| `StoryCatalogEntry` has minimal metadata only | Yes — `storyId`, `title`, `description`, `status` only; confirmed unchanged since M9-PR2. |

**Conclusion:** the current schema is sufficient for a very small MVP story — one with a handful of dialogue/match/choice nodes and simple win/lose or visited-node branching. It is **not** sufficient for full production regional content that needs rich NPC/region metadata (names, personalities, art, music) as first-class structured data — that content would have to live as prose inside `DialogueLine.text` and be referenced only by opaque ID, which is consistent with `docs/27` §4's decision not to add a region/NPC data model yet.

`sampleStory` itself is a working example of exactly this ceiling: 4 nodes, 1 match, 2 endings gated by `humanWon`/`always` — it already demonstrates every node type and every `UnlockCondition` variant except `visitedNode` and `matchesPlayed`, within a structure well inside the `docs/27` §6 budget (5–12 nodes).

## 4. Checklist Classification

Re-classifying every item from `docs/27` §11:

| Checklist item | Classification | Notes |
|---|---|---|
| `storyId` unique within registry | **Automate soon** | Already partially automated — `hasDuplicateStoryId()` exists and is unit-tested (`storyRegistry.test.ts`, M9-PR2). A per-`StoryDefinition` graph validator would only need to check the definition's own `storyId` is a non-empty string; registry-level uniqueness is already covered. |
| `nodeId` unique within `StoryDefinition` | **Automate soon** | Cheap, mechanical, and exactly the kind of error that's easy to introduce by copy-pasting a node and forgetting to rename its `nodeId`. |
| `startNodeId` exists | **Automate soon** | One `findStoryNode` call; already implicitly exercised by `createStorySession`/`buildStateFromProgress` at runtime, but a load-time content check would catch it before a player ever hits it. |
| Every dialogue/match `next` entry resolves | **Automate soon** | Same shape of error as above — a typo'd `nodeId` in a `next` array is silent until a player reaches that exact branch, potentially in production after content has shipped. |
| Every choice `nextNodeId` resolves | **Automate soon** | Same reasoning as `next` entries. |
| Every match `next` candidate resolves | **Automate soon** | Same reasoning — and match nodes are exactly where `docs/25`'s persistence risk is highest (a `completeStoryMatch` outcome is the trigger most likely to advance to a dead-end). |
| At least one `end` node reachable | **Automate soon** | Graph reachability from `startNodeId` — mechanical, and a story with no reachable ending is a real player-facing dead end, not just a style issue. |
| No unintentional orphan node | **Automate later** | Detecting *unintentional* is a judgment call an automated check can only approximate (an unreachable node might be intentional dead content awaiting a future choice). A reachability report (which nodes are unreached from `startNodeId`) can be automated; whether it's a real bug is still a human call. |
| Node count within PR scope | **Manual for now** | This is a review-process/PR-scope judgment (`docs/27` §6's budget), not a schema property — it depends on what the PR claims to be doing, not just on the file's contents. |
| No `engine` import in content file | **Automate later** | Mechanical (a grep or lint rule), but low-value to automate until there are enough content files to make manual review tedious — right now there is exactly one (`sampleStory.ts`). |
| No `components` import in content file | **Automate later** | Same reasoning as engine import. |
| No `platform`/storage import in content file | **Automate later** | Same reasoning. |
| No `storyId`/`nodeId` change without persistence-impact note | **Manual for now** | This is a PR-description/review-process requirement, not something a static check on the content file alone can detect (it requires diffing against what shipped, and judging player impact). |
| No production content mixed with schema refactor | **Manual for now** | A PR-scope judgment call, same category as node-count budget. |
| No region/NPC/art/BGM/reward metadata unless explicitly approved | **Not applicable yet** | These fields don't exist in the schema at all today (`docs/27` §4), so there is nothing for a validator to check yet — this becomes relevant only if/when such fields are proposed. |

## 5. Proposed Validation Layers

Not proposed as one big validator — split into layers so each can be adopted independently and only when it earns its cost.

**Layer 1 — Story graph integrity** (per-`StoryDefinition`)
- `storyId` is a non-empty string
- `startNodeId` exists among `nodes`
- every `nodeId` is unique
- every dialogue/match `next` entry resolves to an existing node
- every choice `nextNodeId` resolves to an existing node
- at least one `end` node is reachable from `startNodeId`
- **Recommendation: Automate soon.** This is the layer with the highest risk-to-effort ratio — broken links are exactly the class of bug that (a) is easy to introduce, (b) is invisible until a player reaches the exact branch, and (c) directly produces the "진행 불가 상태" this document's §3 (player experience) exists to prevent.

**Layer 2 — Registry integrity** (across `storyRegistry`)
- `storyRegistry` has no duplicate `storyId` (already covered by `hasDuplicateStoryId`, M9-PR2)
- every registered entry's `catalog.storyId` matches its `definition.storyId`
- `getStoryCatalog()` output never exposes `StoryDefinition` fields (already covered by existing `storyRegistry.test.ts` assertions)
- **Recommendation: Automate later, mostly already done.** The duplicate-`storyId` guard already exists and is tested; the `catalog.storyId === definition.storyId` check is a one-line addition worth folding into Layer 1/2 whenever a second story is registered (there's nothing to cross-check with only one entry).

**Layer 3 — Boundary/import integrity**
- content files import no `src/engine/`, `src/components/`, `src/platform/`
- `StoryRuntimeScreen` imports no concrete story file or the registry
- the engine imports no content
- **Recommendation: Automate later, or handle via a lightweight grep-based check script** (similar in spirit to the saju_fortune project's `checkZodiacFirstProductionScope.mjs` pattern) rather than a full test suite — this boundary has held by convention across nine milestones' worth of manual review and is cheap to spot-check, but a low-maintenance script would catch a regression automatically once there's more than one content file to watch.

**Layer 4 — Authoring policy integrity**
- node count budget (`docs/27` §6)
- no metadata creep (`docs/27` §4)
- no production content mixed with a schema change
- ID-stability impact note present when `storyId`/`nodeId` changes
- **Recommendation: Manual, indefinitely.** These are PR-review judgment calls about *intent and scope*, not properties of a file that a validator can check in isolation. No automation is proposed for this layer in this document.

## 6. Should We Implement Automated Validation Now?

**Option A — Do not automate yet.** No new code, keeps M11 simple; but every future content PR's graph-integrity review stays fully manual, which does not scale past a handful of stories and re-introduces exactly the kind of silent-typo risk Layer 1 exists to catch.

**Option B — Add docs-only validation design now, implement the test later.** Review standard becomes explicit and can be applied by hand today; no enforcement exists yet, but nothing is built before there is a second content file to justify it.

**Option C — Implement minimal graph validation in the next PR.** Catches broken story graphs before content volume grows; but adds test/helper code before any production content exists to validate against, ahead of `docs/27`'s own principle (§14) of not adding structure before it's needed.

**Recommendation: Option B for M11-PR2.** This PR stays docs-only. `sampleStory` already demonstrates a graph small and clean enough that automation isn't blocking anything today — the real trigger for building Layer 1 is the first production content PR, where a typo'd `nodeId` would matter for the first time. Given that, this document proposes a concrete candidate rather than leaving the decision fully open: **M11-PR3 candidate — add a minimal Layer 1 graph validation test (`validateStoryDefinition`) before the first production story strategy is executed**, since `sampleStory`'s existing shape is simple enough that writing this test against it now is close to zero-risk, and having it in place *before* content authoring starts (rather than after a broken graph ships) is exactly the point of building it at all. This is a recommendation for M11-PR3 to decide, not an implementation in this PR.

## 7. Minimal Future Validator Shape (Pseudo-Design Only)

**Not implemented in this PR — no file is created.** For reference only, for whichever future PR decides to build Layer 1:

Proposed future location: `src/content/validation/storyDefinitionValidation.ts` (a new `validation` subdirectory under Content Layer, parallel to `schemas/` and `stories/`), with `src/content/validation/storyDefinitionValidation.test.ts` alongside it.

Proposed result shape:
```ts
interface ValidationResult {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<string>;
}
```

Proposed pseudo-API:
```ts
function validateStoryDefinition(definition: StoryDefinition): ValidationResult;
function validateStoryRegistry(storyRegistry: ReadonlyArray<RegisteredStory>): ValidationResult;
```

`validateStoryDefinition` would cover Layer 1 (§5); `validateStoryRegistry` would cover Layer 2, calling `validateStoryDefinition` on each entry's `definition` plus the cross-entry checks. Both would be pure functions with no `StorageService`/engine/component imports, consistent with every other Content Layer file's dependency rule.

## 8. Persistence Risk Review

Connecting content validation to `docs/25`/`docs/26`'s `StoryProgress` persistence boundary:

- A `storyId` mismatch invalidates saved progress — `validateStoryProgressSaveDocument` rejects it outright (`docs/25` §8).
- A missing `currentNodeId` invalidates saved progress — same validation path, plus the `restoreStorySession` → `status: 'invalid'` defense-in-depth check (`docs/26` checklist #12–15).
- Renaming or deleting a `nodeId` that a save references is save-breaking — the save is silently deleted and the player restarts (`docs/26` §6 non-blocking observation on silent resets).
- Changing `startNodeId` affects only *fresh* sessions (`createStorySession`), not restored ones (`restoreStorySession` uses the saved `currentNodeId` directly, never `startNodeId`) — comparatively low risk, but still worth a deliberate decision rather than an incidental change.
- Editing dialogue text, a choice's `label`, or a `matchContext`'s non-ID fields is generally safe — nothing in `StoryProgress` references node *content*, only `nodeId` strings (`docs/27` §5).
- Adding new nodes is generally safe as long as all existing `nodeId`s are left untouched — an in-flight save's `currentNodeId` still resolves.
- Changing an `UnlockCondition` can alter *future* progression (which branch a player is routed to next) without necessarily invalidating an *already-saved* position — the save's `currentNodeId` is still valid; only where `advanceStory` sends the player from there changes. This is a content-design risk (a player's expectations about "what happens next" may shift under them), not a persistence-crash risk.
- Changing `next` links is the same category as `UnlockCondition` changes for a player sitting exactly on the changed node, but is strictly more dangerous if it removes a `next` entry a saved player's *next* step depended on — this is exactly what Layer 1's "every `next` entry resolves" check exists to catch before it ships.
- Deleting an `end` node may invalidate a `completed`-status save whose `currentNodeId` pointed there — the save load path treats this identically to any other missing-node case (reject and reset).

**Conclusion:** any content PR that changes an existing, already-shipped `storyId`, `nodeId`, or `next`/`choices` graph must include an explicit persistence-impact note in its PR description (`docs/27` §5, §11) — this is a process requirement, not something a validator alone can guarantee, since it requires knowing what shipped previously, not just what the file currently contains.

## 9. Schema Gap Review

Documented for awareness — **none of these are added in this PR**, and `docs/27` §4/§9 already establishes that filling a gap is not itself justification for expanding the schema before production content actually needs it:

- No `Region` data model (only the opaque `RegionId` string).
- No `Npc` data model (only the opaque `NpcId` string).
- No chapter/episode metadata for grouping nodes within a longer story.
- No story display title inside `StoryDefinition` itself — `title`/`description` live only on the registry's `StoryCatalogEntry`, not on the content file.
- No difficulty/tuning metadata on `MatchContext` (e.g. a way to make a story match harder/easier than a default AI).
- `presentationHints` exists on `MatchContext` but is a documented placeholder only — nothing reads it today.
- `emotionTag` exists on `DialogueLine` but is a documented placeholder only — nothing reads it today.
- No localization structure (all text is a single hardcoded string per `DialogueLine`).
- No content version field on `StoryDefinition` itself (versioning currently lives entirely in the *persistence* document, `StoryProgressSaveDocumentV1.saveVersion` — not in the content schema).

These gaps are real, but none of them block writing a very small MVP story within the current schema (§3). Filling them prematurely would be exactly the "content added too quickly, blurring the structure" risk `docs/27` §14 warns against.

## 10. Recommendation

- The current `StoryDefinition` schema is sufficient for a very small MVP story.
- Production-scale regional/NPC content is not ready to be schema-supported yet, and does not need to be for the next PR.
- Automated validation should not be implemented in this PR.
- Minimal graph validation (Layer 1) is a strong, low-risk candidate to build before the first production content PR — ideally in M11-PR3, ahead of executing whichever `sampleStory` strategy option is chosen there.
- M11-PR3 should decide the first MVP story strategy (`docs/27` §10's Option A/B/C) and, within the same decision, when (if not immediately) to add Layer 1 validation relative to that strategy.
- Production content remains deferred.
- Story selection UI remains deferred.

## 11. Proposed Next Step

**Option 1 — M11-PR3: First MVP Story Strategy Decision** (the originally-planned scope). Decides `sampleStory`-keep / production-story-add / default-story-replace, per `docs/27` §10. No production dialogue yet.

**Option 2 — M11-PR3: Minimal Story Graph Validation Design or Test Decision.** Decides whether to implement Layer 1 (`docs/28` §7's pseudo-design) before any story-strategy decision is executed. Possibly docs-only, possibly a small test-only PR.

**Recommendation:** keep M11-PR3 scoped as **"First MVP Story Strategy Decision"**, but have that PR explicitly decide, as part of the same document, whether Layer 1 graph validation lands before or after the strategy choice is executed — rather than splitting it into a fully separate PR. This keeps the two closely-related decisions (which story strategy, and whether a safety net exists before content changes based on that strategy start landing) in one place instead of forcing a reader to cross-reference two documents to understand the full picture.

## 12. Non-Goals

This PR does not:
- Change the schema.
- Implement an automated validator.
- Write production story content.
- Change `storyRegistry`.
- Change `sampleStory`.
- Implement story selection UI.
- Add multi-story save.
- Add region/NPC/art/BGM/reward metadata.
- Change the engine.
- Change persistence.

## 13. Final Recommendation

- M11-PR2 proceeds docs/check-only.
- The current schema is sufficient for a small MVP story.
- It is insufficient for production-scale content, but is not expanded now.
- The manual checklist is sufficient for most items; graph integrity (Layer 1) is the strongest automation candidate.
- Production content is not started in this PR.
- The next PR proceeds as First MVP Story Strategy Decision, deciding Layer 1's timing alongside it.

---

## 14. M11-PR3 Decision Note

- `docs/29_first_mvp_story_strategy_decision.md` confirmed this document's §6 recommendation: Layer 1 graph validation lands **before** production content, not after.
- Next PR is now fixed as **M11-PR4 — Minimal Story Graph Validation** (implementing this document's §7 pseudo-design), inserted ahead of M11-H1.

---

## 15. M11-PR4 Implementation Note

- `src/content/validation/storyDefinitionValidation.ts` implements §7's pseudo-design almost exactly: `ValidationResult { valid, errors }` and `validateStoryDefinition(definition)` covering every §5 Layer 1 check. `validateStoryRegistry` was **not** added, per §6's own recommendation to keep the PR small — Layer 2 (registry integrity) remains covered by the existing M9-PR2 `hasDuplicateStoryId` test.
- Scope is strictly Layer 1 — no region/NPC/art/BGM/reward validation (Layer 4, still not applicable per §4), no import-boundary automation (Layer 3, still "automate later"), no `UnlockCondition` evaluation.
- `sampleStory` and every registered story definition pass validation, confirming the tool works against the one real content file that exists today.

---

## 16. M11-H1 Review Note

- `docs/30_content_authoring_boundary_review.md` approved Layer 1 graph validation as a sufficient pre-content safety net — confirmed cycle-safe, dependency-clean, and passing against `sampleStory` and every registered story.
- Layer 2/3/4 remain deferred/manual, unchanged from this document's own §5/§6 recommendations — no automation added in the review.
