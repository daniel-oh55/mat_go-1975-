# First Production Story Scope / Handoff Plan

## 1. Purpose

M12-PR1 defines the scope of the first production story and applies the `docs/27` §8 content handoff format to it, before any implementation begins.

This document is not content implementation. It is an approved planning artifact meant to guide a future Claude drafting pass and a future Claude Code implementation PR — the scope, tone, and constraints below are what those steps should be checked against, not something either step should re-derive from scratch.

## 2. Inputs Reviewed

- `docs/23_content_loader_architecture.md`
- `docs/24_content_loader_boundary_review.md`
- `docs/25_story_progress_persistence_plan.md`
- `docs/26_story_progress_persistence_review.md`
- `docs/27_mvp_content_authoring_boundary.md`
- `docs/28_story_schema_content_validation_review.md`
- `docs/29_first_mvp_story_strategy_decision.md`
- `docs/30_content_authoring_boundary_review.md`
- `src/content/schemas/storySchema.ts`
- `src/content/validation/storyDefinitionValidation.ts`
- `src/content/stories/sample/sampleStory.ts`
- `src/content/stories/storyRegistry.ts`
- `src/App.tsx`

## 3. Production Story Strategy Context

Per M11-H1 (`docs/30`):

- `sampleStory` remains a validation fixture.
- Option C was selected for M11 (no production content yet).
- Option A (a separate production story, `sampleStory` preserved) remains the preferred long-term direction.
- M12-PR1 may begin **planning only**.
- Production story implementation is **not** approved yet.
- A second `storyRegistry` entry is **not** approved yet.
- The default story selection risk (`App.tsx`'s "first catalog entry" logic) remains unresolved.
- The single-slot `StoryProgress` save risk (`matgo.v1.storyProgress`) remains unresolved.

## 4. First Story Scope Recommendation

Kept deliberately small:

- One region.
- One primary NPC.
- One story match.
- 5–8 nodes.
- 0–1 choice node (default: 0).
- 1–2 ending nodes.
- No region data model.
- No NPC data model.
- No art/BGM/reward metadata.
- No story selection UI.
- No multi-story save.

**Recommended direction:** the first production story is small enough to be "the first stop on a nationwide journey," not a grand introduction to the game's world.

**Recommended region:** a small bus terminal or market in 충청도 (Chungcheong).

**Reasoning:**
- Fits a quiet 1970s road-movie tone better than a dramatic opening would.
- Lower narrative weight than a symbolically loaded location like Seoul, Busan, or Jeju — nothing about this story needs to carry "this is the capital" or "this is the biggest city" expectations.
- Keeps the first story from becoming grand by accident.
- Naturally fits the core experience this project wants: "met someone while traveling, played one hand of Matgo with them."

**Note:** this PR does not write long-form dialogue. Only a planning-level summary and node outline are produced below.

## 5. Content Handoff Format Applied

Using the `docs/27` §8 format for the first time.

### Story purpose

The first production story introduces the player to the world of "팔도맞고 1975" by arriving in an unfamiliar region and meeting one person, with the story kicking off through a single hand of Matgo.

### Player emotion

- 향수 (nostalgia)
- 여행감 (a sense of travel)
- 호기심 (curiosity)
- 사람 냄새 (a human, lived-in feeling)
- 잔잔한 긴장감 (quiet tension)

### Region / setting

- `regionId` proposal: `chungcheong-terminal`
- Setting: a waiting area or market entrance near a small 1970s bus terminal in Chungcheong.

Note: `regionId` is an opaque string. No region data model is created (`docs/27` §4).

### NPC concept

- `npcId` proposal: `terminal-regular-01`
- Concept: a regular who has played Matgo near the terminal for a long time — a man of few words who plays slowly, as if testing the other player rather than rushing to win.

Note: no NPC data model is created. The NPC concept is prose only, to be expressed entirely through dialogue text (`docs/27` §4).

### Story summary

The player arrives at a worn bus terminal. While waiting for the next bus, a quiet game of Matgo is already underway in a corner of the waiting area. The local regular asks the unfamiliar traveler if they'd like to play a hand before they go. Depending on the outcome, a short exchange follows, and the player heads off toward their next destination.

### Node outline

Proposed structure (6 nodes, within the 5–8 budget):

1. `chungcheong-terminal-01-arrival` — dialogue
2. `chungcheong-terminal-01-invitation` — dialogue
3. `chungcheong-terminal-01-match` — match
4. `chungcheong-terminal-01-after-win` — dialogue, `unlockCondition: humanWon`
5. `chungcheong-terminal-01-after-default` — dialogue, `unlockCondition: always`
6. `chungcheong-terminal-01-end` — end (both branches converge here — see §5 "Ending variants")

Note: no `StoryDefinition` is implemented in this PR. The node outline is a documentation-level proposal for the eventual implementation PR to follow.

### Dialogue draft (tone sample only — not full dialogue)

- narrator: 낡은 대합실 문이 열릴 때마다 차가운 바람과 먼지 냄새가 함께 밀려왔다.
- npc: 차 기다리는 시간이 제일 길지. 한 판 치고 가겠나?
- player: 오래 걸리진 않겠죠?
- npc: 맞고 한 판이 길어지는 건 패보다 사람 마음 때문이지.

This is a tone guide for a future Claude drafting pass, not the actual dialogue to implement. Long-form dialogue is out of scope for this PR (§12).

### Match purpose

The first match is less a test of skill and more a ritual of first contact with someone from an unfamiliar region. The outcome shifts the story's mood slightly, but does not block progression — both outcomes converge on the same ending (§5 "Ending variants").

### Choice purpose

**Default recommendation for this story: no choice node.**

Reasoning:
- The first story should stay simple.
- Graph validation and `StoryProgress` persistence were only just introduced (M10, M11) — there is no need to add branching complexity while those are still being proven against real content.
- A choice node can be added in a second story or a later expansion PR, once the foundation has absorbed one real production story.

A 0–1 choice node option remains open for the eventual implementation PR to reconsider, but the default going in is **no choice node**.

### Ending variants

**Recommendation:** the win and default (loss/draw) branches use different dialogue (`chungcheong-terminal-01-after-win` vs. `chungcheong-terminal-01-after-default`), but both converge on the same single `end` node (`chungcheong-terminal-01-end`).

Reasoning: preserves an emotional difference based on the match result while keeping graph complexity — and therefore both `StoryProgress` state space and Layer 1 validation surface — low.

### Constraints

- 5–8 nodes.
- Exactly 1 match node.
- 0 choice nodes by default.
- No new schema fields.
- No region/NPC data model.
- No art/BGM/reward metadata.
- No story selection UI.
- No multi-story save.
- No implementation in this PR.

### Forbidden elements

Per `docs/27` §4, unchanged for this story specifically:
- A region data model beyond the opaque `RegionId` string.
- An NPC data model beyond the opaque `NpcId` string.
- An NPC relationship/affinity system.
- Art or BGM metadata beyond the existing unused placeholder fields.
- A reward system.
- Zodiac/사주 fortune effects influencing the match result or story branching.
- Monetization-linked content unlocks.
- Online/remote/event content.
- Branching complexity beyond this story's stated 0–1 choice node budget.

### Schema mapping notes

- Region and NPC are opaque strings only (`regionId: 'chungcheong-terminal'`, `npcId: 'terminal-regular-01'`) — no structured data beyond the ID.
- The terminal setting lives entirely in dialogue text, not in a region model.
- The NPC's personality lives entirely in dialogue text, not in an NPC model.
- The match uses `MatchStoryNode.matchContext` with `npcId`/`regionId` only — no `presentationHints` populated (still a placeholder, per `docs/27`/`docs/28`).
- Win/default branching uses `UnlockCondition` variants `humanWon` / `always`, exactly as `sampleStory` already demonstrates — no new `UnlockCondition` variant is needed.

## 6. Proposed storyId / nodeId Naming Policy

**Recommended `storyId`: `chungcheong-terminal-01`**

Considered alternative: a `prod-` prefix (e.g. `prod-chungcheong-terminal-01`) makes the sample/production distinction visually explicit, but becomes verbose once production stories are the norm rather than the exception.

**Recommendation: no `prod-` prefix.** Reasoning:
- The `storyId` should read as a content identity, not an implementation-status label.
- The sample/production distinction already has a home: `StoryCatalogEntry.status` (`'sample' | 'draft' | 'production'`).
- Keeping status out of the `storyId` itself avoids ever having to rename a `storyId` if a story's status changes later — which `docs/27` §5 already flags as something to avoid once a `storyId` has shipped with any save data depending on it.

**Node ID policy:** prefix every `nodeId` with the `storyId`:
- `chungcheong-terminal-01-arrival`
- `chungcheong-terminal-01-invitation`
- `chungcheong-terminal-01-match`
- `chungcheong-terminal-01-after-win`
- `chungcheong-terminal-01-after-default`
- `chungcheong-terminal-01-end`

Reasoning:
- Prevents `nodeId` collisions once more than one story exists in the registry.
- Makes debugging a saved `StoryProgress` document immediately legible (`currentNodeId` alone identifies which story it belongs to, even before cross-referencing `storyId`).
- Makes future story-graph-migration discussions (if this project ever needs one, which `docs/25`/`docs/27` currently avoid needing by discipline rather than tooling) easier to reason about.

## 7. Default Story Selection Risk Review

**A required precondition before M12-PR2 implementation — not resolved in this PR.**

- `App.tsx` currently resolves the default story via `getStoryCatalog()[0]` — safe only because `storyRegistry` has exactly one entry today.
- Once a first production story is added, registry order would silently decide the player-facing default unless something explicit replaces "first entry."

**Options for M12-PR2 to decide among:**

- **A.** An explicit `DEFAULT_STORY_ID` constant in the Content Layer.
- **B.** A `getDefaultStoryDefinition()` helper that prefers `status: 'production'` entries over `status: 'sample'`.
- **C.** Keep `sampleStory` registered, but hidden from the player-facing default by some other explicit rule (not order-dependent).
- **D.** Add story selection UI (this project has consistently judged this premature — `docs/24` §6, `docs/27` §9, `docs/30` §7 — and that judgment is unchanged here).

**Current recommendation: Option B** — a `getDefaultStoryDefinition()` helper that prefers `status: 'production'`, falling back to the first `status: 'sample'` entry only if no production story exists. Story selection UI (Option D) remains premature for a single production story.

**This is a recommendation, not a decision.** Per this document's scope (§12), it is recorded here as an **M12-PR2 prerequisite** to be finalized immediately before that PR begins, not settled now.

## 8. Single-Slot Save Risk Review

**A required precondition before M12-PR2 implementation — not resolved in this PR.**

- `StoryProgress` persistence currently uses the single-slot key `matgo.v1.storyProgress` — safe only because exactly one story exists today.
- With both `sampleStory` and a first production story registered simultaneously, a `storyId` mismatch causes whichever story's save is stale to be silently discarded (`docs/25` §8, `docs/29` §9) — not a crash, but a correctness/trust risk for whoever's progress gets reset.

**Options for M12-PR2 to decide among:**

- **A.** Keep the single slot, on the premise that only the production story is ever the player-facing default — `sampleStory` remains registered (and tested) but is never what a normal player sees or saves progress against.
- **B.** Move to a `storyId`-specific save key.
- **C.** Add real multi-story save slots.
- **D.** Add story selection UI with per-story progress.

**Current recommendation: Option A**, on the explicit premise that:
- `sampleStory` remains registered but is not the player-facing default (consistent with §7's Option B recommendation).
- `App.tsx` always defaults to the production story once one exists.
- Losing `sampleStory`'s own saved progress is an acceptable cost, since `sampleStory` is a validation fixture, not player-facing content (`docs/27` §10, `docs/29` §4).

**This is a recommendation, not a final decision.** The actual implementation choice must be explicitly confirmed immediately before M12-PR2 begins, not assumed from this document alone.

## 9. Claude Drafting Guardrails

Principles for whoever drafts this story's actual dialogue next (Claude, per the `docs/27` §7 workflow):

- Keep the 1970s Korean sense of daily life, without centering on major political or historical events.
- The first story is quiet and short.
- The NPC should read as a memorable ordinary person, not an eccentric "boss" character.
- Dialogue should be short and natural.
- Don't overuse regional dialect (사투리) for flavor.
- Avoid glamorizing gambling or dwelling on money in an exaggerated way.
- The match's outcome must never be described as rigged or predetermined by the narrative.
- 사주/운세 (fortune-telling) must not affect the match result — this stays a hard boundary regardless of any other feature in the broader app.
- The story must fit within 5–8 nodes.
- Exactly one match.
- No choice node by default (§5).
- Every narrative element must map onto the current `StoryDefinition` schema as-is — no new field requests as part of a drafting pass; if the schema genuinely doesn't support something, that goes back to a planning document, not into the draft.

## 10. M12-PR2 Preconditions

Required before first production story **implementation** begins:

1. M12-PR1 (this document) is approved.
2. The final `storyId`/`nodeId` set is approved (§6, subject to final review at implementation time).
3. The default story selection strategy is approved (§7 — not just recommended).
4. The single-slot save strategy is approved (§8 — not just recommended).
5. The Claude-written draft is reviewed by the project owner (or an equivalent planning collaborator) before being handed to Claude Code.
6. Implementation scope is limited to: one story content file, its `storyRegistry` registration, and a minimal default-story-selection helper if approved — nothing broader.
7. `validateStoryDefinition` passes against the finished `StoryDefinition`.
8. No schema change is required to implement the approved draft.
9. No story selection UI is added.
10. No region/NPC/art/BGM/reward data model is added.

## 11. Proposed M12 PR Sequence

### M12-PR1 — First Production Story Scope / Handoff Plan
Docs only. This PR.

### M12-PR2 — First Production Story Draft Review
Docs-only, or a content-draft artifact. A Claude-written draft is reviewed against the `docs/27` handoff format and this document's scope. No `src` implementation yet.

### M12-PR3 — Default Story Selection Decision
Docs, or a small implementation, depending on what's decided. Decides the production default and single-slot-save handling (§7, §8) for real. No production story content added unless explicitly approved as part of this decision.

### M12-PR4 — First Production Story Implementation
Adds the production story file, registers it, implements default story selection if already approved in M12-PR3. `validateStoryDefinition` must pass. No schema change.

### M12-H1 — First Production Story Review
Reviews story flow, persistence behavior, default selection, and fixture separation once the story is live.

**Note:** this sequence is a proposal. M12-PR2/PR3's relative order may adjust based on how the draft review goes, but implementation (M12-PR4) must not begin before both the draft review and the default-story/save decision are complete — mirroring the discipline this project has followed since M9.

## 12. Non-Goals

This PR does not:
- Write a production `StoryDefinition` file.
- Register a story in `storyRegistry`.
- Change `sampleStory`.
- Change `App.tsx`.
- Implement a default-story-selection helper.
- Change the `StoryProgress` save key.
- Add story selection UI.
- Add multi-story save.
- Change the schema.
- Add a region/NPC data model.
- Add art/BGM/reward metadata.
- Write actual full-length dialogue.
- Change the engine.
- Change persistence.

## 13. Final Recommendation

- M12-PR1 proceeds as docs-only planning/handoff.
- The first story's scope: a small Chungcheong bus terminal/market, one NPC, one match, 5–8 nodes.
- Proposed `storyId`: `chungcheong-terminal-01`.
- `sampleStory` remains a fixture.
- Production implementation does not happen yet.
- Default story selection and single-slot save must be explicitly re-reviewed before M12-PR2/PR3, not assumed from this document's recommendations alone.
- Next: a Claude draft review, or the default-story-selection decision — either can lead, per §11.
