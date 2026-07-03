# MVP Content Authoring Boundary

## 1. Purpose

M11-PR1 defines the content authoring boundary before any production story content is written.

This is not a content PR. It does not add a story, a region, an NPC, or any dialogue. It is a rules document: what content can be written, in what structure, with what IDs treated as frozen, and through what workflow — so that when production content writing eventually starts, it starts inside a boundary that has already been agreed, rather than inventing the rules mid-PR.

## 2. Current Approved Foundations

- M9 Content Loader Boundary approved (`docs/24_content_loader_boundary_review.md`).
- `storyRegistry` exists and currently registers `sampleStory` only.
- `StoryRuntimeScreen` receives an injected `StoryDefinition` — it does not discover content itself.
- `App.tsx` resolves the default story via `getStoryCatalog()` / `getStoryDefinition()`.
- M10 StoryProgress persistence approved (`docs/26_story_progress_persistence_review.md`).
- `StoryProgress` save is tied to `storyId` and `currentNodeId` — a saved document is validated against exactly those two fields on load (`docs/25` §8).
- Production content remains deferred.
- Story selection UI remains deferred.
- Multi-story save slots remain deferred.

## 3. Current Content Surface

Read directly from `src/content/schemas/storySchema.ts` and `src/content/stories/storyRegistry.ts` — no field below is speculative.

**`StoryDefinition`** (`storySchema.ts`):
```ts
interface StoryDefinition {
  readonly storyId: StoryId;
  readonly startNodeId: StoryNodeId;
  readonly nodes: ReadonlyArray<StoryNode>;
}
```

**`StoryNode`** — a discriminated union on `type`, all extending `BaseStoryNode { nodeId, regionId?, npcId?, unlockCondition? }`:
- `DialogueStoryNode` — `{ type: 'dialogue', dialogue: DialogueLine[], next: StoryNodeId[] }`
- `MatchStoryNode` — `{ type: 'match', matchContext: MatchContext, next: StoryNodeId[] }`
- `ChoiceStoryNode` — `{ type: 'choice', choices: StoryChoice[] }`
- `EndStoryNode` — `{ type: 'end' }` (terminal, no `next`)

**`DialogueLine`**: `{ speakerId: string, text: string, emotionTag?: string }` — `emotionTag` is documented in-schema as "Future: portrait emotion animation hint," i.e. accepted by the type today but not consumed by any runtime code yet.

**`MatchContext`**: `{ npcId: NpcId, regionId: RegionId, presentationHints?: Record<string, string> }` — `presentationHints` is documented as "Future: BGM key, background image key, etc." Same status as `emotionTag`: a schema-level placeholder, not a feature.

**`StoryChoice`**: `{ choiceId: string, label: string, nextNodeId: StoryNodeId, unlockCondition?: UnlockCondition }`.

**`UnlockCondition`** — exactly four variants exist, no others:
- `{ type: 'always' }`
- `{ type: 'humanWon' }`
- `{ type: 'visitedNode', nodeId: StoryNodeId }`
- `{ type: 'matchesPlayed', minimum: number }`

**`StoryCatalogEntry`** (`storyRegistry.ts`): `{ storyId: string, title: string, description: string, status: 'sample' | 'draft' | 'production' }`. This is registry metadata only — it is never the `StoryDefinition` itself (`docs/24` checklist item confirmed this boundary).

**`RegionId` / `NpcId`**: both `type X = string` — opaque identifiers with no backing data model (no `Region` or `Npc` object type exists anywhere in the schema).

## 4. MVP Content Rule

**Allowed:**
- Writing a story strictly within the existing `StoryDefinition` schema above — no new fields, no new node types.
- Registering it in `storyRegistry` using only the existing `StoryCatalogEntry` metadata (`storyId`, `title`, `description`, `status`).
- Using only the four node types that exist today (`dialogue`, `match`, `choice`, `end`).
- Using `matchContext` strictly within its current shape (`npcId`, `regionId`, optionally `presentationHints` — but see §6, don't populate placeholders speculatively).
- Using only the four `UnlockCondition` variants that are actually implemented (`always`, `humanWon`, `visitedNode`, `matchesPlayed`).
- A sample-level validation story, or a very small MVP story (see §6 for the size budget).

**Forbidden for now:**
- A region data model (a `Region` type with fields beyond the opaque `RegionId` string).
- An NPC data model (an `Npc` type with fields beyond the opaque `NpcId` string).
- An NPC relationship/affinity system.
- Art or background metadata beyond the existing placeholder field (`presentationHints`) — do not start populating it as if it were a real feature.
- BGM metadata, similarly.
- A reward system (items, currency, unlockable content tied to match results).
- Zodiac/사주 fortune effects influencing match results or story branching — this app's fortune-telling features (if any exist elsewhere in the product) must stay separate from Matgo match outcomes and story `UnlockCondition`s.
- Monetization-linked content unlocks.
- Online/remote/event content.
- Branching complexity beyond what §6's budget allows.
- Adding production-scale, many-region content in one pass.

## 5. ID Stability Rules

`StoryProgress` persistence (`docs/25`, `docs/26`) means `storyId` and `nodeId` are no longer purely content-authoring concerns — they are also save-data keys.

- **`storyId` must not change once a story has shipped with any player save relying on it.** `validateStoryProgressSaveDocument` rejects a saved document whose `progress.storyId` doesn't match the currently-loaded `StoryDefinition.storyId` (`docs/25` §8) — renaming a `storyId` silently invalidates every existing save for that story.
- **`nodeId` must not be renamed or removed once shipped**, for the same reason: a saved document's `currentNodeId` is validated against `findStoryNode(definition, progress.currentNodeId)` — a missing node causes the save to be treated as corrupted and deleted (`docs/26` checklist items #12–13).
- **`startNodeId` changes only affect a fresh session**, not a restored one (`createStorySession` vs `restoreStorySession` — `docs/25` §6) — so it is comparatively safe to adjust, but should still be done deliberately, not casually.
- **Editing an existing node's content (dialogue text, `matchContext`, a choice's `label`) is safe** — nothing about the persisted `StoryProgress` shape references node *content*, only `nodeId` strings. Editing text does not invalidate saves.
- **There is no story-graph migration in MVP.** `docs/25` explicitly deferred save migration beyond `saveVersion: 1`. Any ID change that breaks an in-flight save is *not* recoverable by the app — it is silently treated as corrupted and reset (by design, per `docs/26` §6's non-blocking observation on silent resets). ID changes should therefore be avoided, not "fixed later."
- **`sampleStory` is a validation fixture, not production content** (`docs/19`/`docs/20` establish this, reaffirmed by `docs/23` §12 and `docs/26` §9). Its node IDs (`sample-intro`, `sample-match-01`, `sample-end-win`, `sample-end-default`) may be changed if runtime validation needs require it, but any change should be called out explicitly as "this will reset an existing sample-story save" in the PR that makes it.
- **The moment production content ships, this project needs an explicit ID-freeze policy** — i.e., a rule that once a production `storyId`/`nodeId` set has been in a released build, it is treated the same way a database migration would be: additive-only, or requires an explicit migration story that this project has decided not to build yet.

## 6. Content Complexity Budget

These are review guidelines, not hard-enforced limits — but they are meant to be used directly when reviewing a future content PR.

- One MVP story: **5–12 nodes** recommended.
- **1–3** match nodes per story.
- **0–2** choice nodes per story.
- Don't add a large volume of dialogue lines in the same PR that also touches story structure — split "structure" and "text polish" into separate PRs.
- One content PR should do **one** of: story structure, or text/dialogue polish — not both.
- Don't add many regions' worth of content in a single PR.
- Split content by **one region / one NPC / one match** per PR where possible, mirroring the small-PR discipline already used for M9–M10.

## 7. Content Authoring Workflow

This project's AI collaborators have different roles for content, matching how this project has been run so far (design/policy PRs before implementation PRs, small reviewable diffs, explicit sign-offs at each milestone boundary):

1. **ChatGPT** (or equivalent planning collaborator)
   - Decides content boundary, structure, and PR scope.
   - Judges whether a piece of content belongs in MVP or should be deferred.
   - Reviews engine/content separation before work is handed off.
   - Writes the Claude Code instruction for the implementation PR (the same pattern used for every milestone PR so far in this project).

2. **Claude** (story/dialogue drafting, not code)
   - Writes story drafts, NPC voice drafts, dialogue drafts, regional mood ideas.
   - Does **not** modify source code.
   - Output is a draft artifact (see §8's handoff format), not a diff.

3. **Claude Code** (this collaborator, implementation)
   - Implements *approved* story content into the existing schema.
   - Adds tests, validation, and doc updates.
   - Follows the code boundary defined in this document and in `docs/23`/`docs/25` — no schema changes, no new node types, no new metadata fields, unless a separate PR explicitly approves them first.

4. **Codex** (or equivalent release-facing reviewer)
   - Reviews the PR for schema misuse, persistence risk (ID stability violations per §5), and content-complexity budget overruns (§6).
   - Final review before a content PR is considered release-ready.

**Rule:** content drafted by Claude is never committed directly. It goes through planning/PM review (ChatGPT or the project owner) first, and is only implemented by Claude Code once the scope, node structure, and ID choices have been explicitly approved — following the same "plan PR, then implementation PR" discipline this project has used since M9.

## 8. Content Handoff Format

This is the format a story draft should arrive in before Claude Code implements it. **No actual handoff is written in this PR** — this section defines the shape only.

- **Story purpose** — why this story exists, what it's meant to accomplish for the player.
- **Player emotion** — the target feeling this piece of content should evoke (e.g. 안정감/몰입감/향수/여행감/인물과의 만남/성장감, or a subset).
- **Region / setting** — which `RegionId` this story is set in (opaque string only — no new region data model per §4).
- **NPC concept** — which `NpcId`(s) appear, and a short description of who they are (prose only — no new NPC data model per §4).
- **Story summary** — a short prose summary of the arc.
- **Node outline** — the proposed node graph: which nodes exist, their `type`, and how they connect via `next`/`choices`, sized against §6's budget.
- **Dialogue draft** — actual `DialogueLine` text content, per dialogue node.
- **Match purpose** — why this match exists in the story (what emotional or narrative beat it serves), and what NPC/region it maps to.
- **Choice purpose** — what each choice represents narratively, and its `UnlockCondition` (using only the four existing variants).
- **Ending variants** — the `end` node(s), and which `UnlockCondition` selects each one.
- **Constraints** — anything the draft must not do (e.g. "must not exceed 8 nodes," "must not use a fifth `UnlockCondition` type").
- **Forbidden elements** — an explicit checklist reference to §4's forbidden list, so the drafter (and reviewer) can self-check before handoff.
- **Schema mapping notes** — how each narrative element maps to an actual schema field, so Claude Code's implementation step is close to mechanical rather than requiring new judgment calls.

## 9. MVP Production Content Start Criteria

Before any production content PR begins, all of the following should hold:

- M11-PR1 content authoring boundary (this document) is approved.
- The current `StoryDefinition` schema has been reviewed and is judged sufficient for the first production story (or an explicit, separately-approved schema change has been made first).
- `storyId`/`nodeId` stability rules (§5) are accepted as project policy.
- The first production content PR's scope is agreed in advance (which region, which NPC, how many nodes — sized per §6).
- A content validation checklist exists (§11).
- A decision has been made about story selection UI — either "still deferred" (current default) or an explicit plan.
- The single-slot save assumption (`docs/25` §7) is explicitly accepted for the first production story, or revisited if it no longer holds.
- A decision has been made about whether production content replaces `sampleStory` as the default, or is added alongside it as a second registry entry (see §10 — not decided in this PR).

## 10. SampleStory Decision

- `sampleStory` remains a runtime validation fixture. It is not promoted to production content in this PR.
- It should not accumulate worldbuilding detail — its job is to exercise the schema and the runtime, not to tell a story to players.
- Production story content, when it begins, is safer as a separate file rather than an expansion of `sampleStory` — keeping the validation fixture minimal and stable protects the tests and manual-verification flows that already depend on its exact shape (`sampleStory.test.ts`, the M7–M10 Playwright verification scripts, etc.).
- However, adding a second registry entry alongside `sampleStory` reintroduces exactly the problems M9-PR4 (story selection stub) and the single-slot save assumption were deferred to avoid: with two stories registered, `App.tsx`'s "take the first catalog entry" default-story logic becomes ambiguous, and `docs/25`'s single-slot `matgo.v1.storyProgress` key can no longer assume there's only one story to save progress for.

**The first production content strategy must therefore pick one of:**

- **Option A** — Keep `sampleStory` as a validation fixture, add a first production story as a second registry entry, and change `App.tsx`'s default-story resolution to point at the production story. *Upside:* the validation fixture stays untouched and testable. *Risk:* the registry now holds two stories with no selector and no multi-slot save — `App.tsx`'s "first catalog entry" logic must be replaced with something explicit (e.g. a `status: 'production'` filter), or it will pick whichever story happens to be first in the array.
- **Option B** — Incrementally grow `sampleStory` itself into a production-like MVP story. *Upside:* avoids the selector/multi-slot problem entirely, since there's still only one story. *Risk:* mixes a test fixture with production narrative content — `sampleStory.test.ts` and any validation logic anchored to its current minimal shape would need to evolve alongside it, and the "sample" `status` label would no longer be accurate.
- **Option C** — Do not start production content yet, and do not expand `sampleStory` either. *Upside:* safest option; no new risk introduced. *Downside:* player-facing content growth is delayed further.

**This PR only documents the three options — it does not choose one.** The actual choice is deferred to a later decision point (M11-H1 or M12, per §12). **The current default recommendation is Option C**: do not start production content in M11.

## 11. Content Validation Checklist

For every future content PR, check:

- `storyId` is unique within the registry.
- `nodeId` is unique within the `StoryDefinition`.
- `startNodeId` exists among `nodes`.
- Every `next` entry (on `dialogue`/`match` nodes) refers to an existing `nodeId`.
- Every choice's `nextNodeId` refers to an existing `nodeId`.
- Every match node's `next` candidates resolve to existing nodes.
- At least one `end` node is reachable from `startNodeId`.
- No orphaned node that a player can never reach is left in the graph unintentionally.
- Node count is within the PR's stated scope (§6 budget, or an explicitly justified exception).
- No `src/engine/` import anywhere in the content file.
- No `src/components/` import anywhere in the content file.
- No `src/platform/` or `StorageService` import anywhere in the content file.
- No `storyId`/`nodeId` change without an explicit persistence-impact note (§5) in the PR description.
- No production content mixed into the same PR as a schema refactor.
- No region/NPC/art/BGM/reward metadata beyond what's explicitly approved for that PR (§4).

There is no automated validation test for these rules today — **this is a manual checklist for now**. Whether an automated content-linting test is worth adding is exactly the question M11-PR2 (§12) is scoped to answer, not something this PR should decide by building it.

## 12. Proposed M11 PR Sequence

### M11-PR1 — MVP Content Authoring Boundary
Docs only. This PR.

### M11-PR2 — Story Schema / Content Validation Review
Docs/check-only. Reviews whether the current schema is sufficient for content authoring as defined here, and judges whether an automated content-validation test (from §11's checklist) is worth adding now or should wait. No production content.

### M11-PR3 — First MVP Story Strategy Decision
Docs only, or a minimal registry-level decision. Chooses between §10's Option A / B / C for the first production (or production-like) story. No production dialogue unless explicitly approved as part of this decision.

### M11-H1 — Content Authoring Boundary Review
Sign-off before production content begins. After this, M12 may begin a first production content PR.

**Note:** M11 does not have to end in production content starting. Content writing begins in M12 only if the boundary is judged safe.

## 13. Non-Goals

This PR does not:
- Write a production regional story.
- Write NPC dialogue.
- Write actual region data.
- Write art prompts.
- Write BGM prompts.
- Write a reward system.
- Implement story selection UI.
- Change the schema.
- Change the registry.
- Change `sampleStory`.
- Change persistence.
- Change the engine.
- Add monetization-linked content unlocks.
- Add online/remote content.

## 14. Final Recommendation

- M11-PR1 proceeds docs-only.
- Production content is not written yet.
- `sampleStory` remains a validation fixture.
- The first production story strategy is decided in a separate, later PR (§10, §12).
- Region/NPC/art/BGM/reward metadata are not added yet.
- The next risk to this project is not "not enough content" — it is **adding content too quickly and blurring a structure that M9 and M10 just spent four PRs and two review sign-offs stabilizing.**

---

## 15. M11-PR2 Review Note

- `docs/28_story_schema_content_validation_review.md` reviewed the current schema against §3's content surface and this document's own rules — confirmed sufficient for a very small MVP story, insufficient for production-scale content, and **not expanded** in that PR.
- §11's content validation checklist was reclassified into four layers (graph integrity, registry integrity, boundary/import integrity, authoring policy integrity) with per-item manual-vs-automation recommendations — see `docs/28` §4–§5.
- No automated validator was implemented. `docs/28` §6 recommends a minimal Layer 1 graph-validation test (`validateStoryDefinition`) as a strong candidate for **M11-PR3**, to land before the first production content PR.
- Next: **M11-PR3 — First MVP Story Strategy Decision**, which will decide both the `sampleStory` strategy (§10's Option A/B/C) and whether/when Layer 1 validation is built relative to that strategy.

---

## 16. M11-PR3 Decision Note

- `docs/29_first_mvp_story_strategy_decision.md` decided §10's options: **Option C selected for M11** (no production content, `sampleStory` unchanged); Option A confirmed as the preferred long-term direction, gated on explicit prerequisites (Layer 1 validation, a default-story rule, a single-slot-save review, among others); Option B rejected.
- Layer 1 graph validation is decided to land before production content, as a new **M11-PR4 — Minimal Story Graph Validation**, ahead of M11-H1.

---

## 17. M11-H1 Review Note

- `docs/30_content_authoring_boundary_review.md` signed off this document alongside `docs/28`/`docs/29`/M11-PR4 — **M11 content authoring boundary approved for MVP continuation**, no blocker found.
- Production content is approved for **M12-PR1 planning only** (using this document's §8 handoff format for the first time), not for direct implementation.

---

## 18. M12-PR1 Note

- §8's handoff format was applied for the first time in `docs/31_first_production_story_scope_handoff.md`, scoping a small first production story. Implementation is not yet approved — see `docs/31` for M12-PR2/PR3 preconditions.
