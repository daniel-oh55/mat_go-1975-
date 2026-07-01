# Milestone 6 Story System Architecture

## 1. Purpose

The Story System gives the player a reason to play the next match.

Matgo is the gameplay vehicle, not the final emotional destination. A mechanical match loop — play cards, score, win or lose — is necessary but not sufficient for long-term engagement. The Story System wraps the match loop in context: who is the opponent, where is the match happening, what is at stake, and what changes afterward.

**Fundamental constraints that define the Story System's place in the architecture:**

- Story must sit outside the engine. The engine is world-agnostic and must remain reusable across different game worlds. It has no knowledge of NPCs, regions, or narrative state.
- Match results may advance story progression, but story must never alter shuffle, deal, scoring, AI fairness, or match outcome. A player's win or loss is determined entirely by the match, not by their position in a story.
- Story content is data, not code. Adding a new region, NPC, or episode must not require modifying engine files.
- The Application Layer mediates between match results and story state. It reads match outcomes and updates story progress. It never injects story context back into the engine.

---

## 2. MVP Scope

### Included in M6 MVP

| Deliverable | Description |
|---|---|
| Story System architecture document | This document |
| Story content data schema | TypeScript types for `StoryDefinition`, `StoryNode`, `StoryProgress`, and related concepts |
| Minimal story progress state | Track current node, visited nodes, match history within story |
| Match result to story progression flow | Application Layer logic that reads `FinalResult` and advances `StoryProgress` |
| One minimal sample story definition | Validation only — one story with 2–3 nodes to exercise the schema and progression logic |
| Unit tests for progression logic | Verify that progression rules are correct and engine-independent |

### Excluded from M6 MVP

| Category | Examples |
|---|---|
| Full 1970s Korea content | 팔도맞고 1975 world, regional stories, historical context |
| Regional roster | All 8 provinces (전국 지역) |
| NPC roster | Named opponents with personalities, backstories |
| Dialogue writing | Full Korean dialogue, regional flavour text |
| BGM / SFX | Music tracks, sound effects |
| Background images | Regional art, NPC portrait art |
| Reward / unlock animations | Visual celebrations, card unlock sequences |
| Fortune / saju integration | Horoscope, divination, seasonal events |
| Ads / monetization | AdMob, in-app purchase, billing |
| Online multiplayer | Asynchronous or real-time match modes |
| Engine rule variations | Regional rule sets, alternative scoring |

The boundary is explicit: M6 builds the foundation that M7+ content can plug into. No substantial content is written in M6.

---

## 3. Layer Boundary

### Engine Layer

The engine has no awareness of the Story System.

**Prohibited engine imports:**
- Story definitions or story node data
- NPC identifiers or NPC profiles
- Region identifiers or region data
- Dialogue content
- Story progress state
- Unlock condition data
- Any content-layer type

**Engine only provides:**
- `FinalResult` — winner, final scores, reason — after each match ends
- `GameEvent[]` — structured events emitted during the match

The engine is unchanged by M6. Any engine file modified in a Story System PR must be rejected.

---

### Application Layer

The Application Layer is the sole mediator between match results and story state.

**Responsibilities:**
- Receive `FinalResult` from the match session
- Compute the next `StoryProgress` from the current progress and the match outcome
- Produce a `StoryViewModel` for the UI to render (current node, dialogue, NPC label, region label, available choices)
- Persist updated `StoryProgress` via the Platform Layer when needed
- Map content-layer `MatchContext` to a generic engine `Ruleset` configuration before starting a match — the engine never receives content identity

**Constraints:**
- Must not inject story state into engine inputs
- Must not modify `GameState` based on story position
- Must not give the engine knowledge of which NPC is the current opponent

---

### Content Layer

Pure data — no logic, no engine imports, no platform imports.

**Content Layer holds:**
- `StoryDefinition` files — node graphs defining narrative flow
- `RegionDefinition` files — region labels, atmosphere metadata, future BGM/image references
- `NpcDefinition` files — NPC labels, personality descriptors, future portrait references
- `DialogueLine` collections — text content attached to nodes
- `UnlockCondition` declarations — what conditions gate progression
- Presentation metadata — future art, audio, visual configuration

---

### UI Layer

**Responsibilities:**
- Render the `StoryViewModel` produced by the Application Layer
- Display dialogue, region label, NPC label, match setup prompt
- Present choices to the player (when a node has branching)
- Navigate to the match screen when a match node is entered

**Prohibited UI Layer actions:**
- Directly import engine modules
- Directly mutate `StoryProgress`
- Evaluate unlock conditions
- Interpret raw `StoryDefinition` content — that is the Application Layer's job

---

### Platform Layer

**Role in M6:** Story progress persistence only.

**Constraints:**
- Must not interpret story content
- Must not evaluate progression logic
- Must not allow save data to affect match randomness or outcome

---

## 4. Core Concepts

### StoryDefinition

A complete story expressed as a directed node graph. Defines the structure and flow of a single narrative arc. Contains a start node and all nodes reachable from it. Stored as data; never imported by the engine.

### StoryNode

A single step in a story. A node has a type: `dialogue` (show text), `match` (play a game), `choice` (branch on player decision), or `end` (story is complete). Each node declares what comes next — one next node for linear flow, multiple for branches.

### StoryProgress

The player's current position in a `StoryDefinition`. Records the current node ID, the set of visited node IDs, and a summary of match results within the current story arc. This is the only piece of story state that is persisted. The engine never reads or writes this.

### RegionId

An opaque string identifier for a region defined in the Content Layer. The engine never references a `RegionId`. The Application Layer may use it to set up atmosphere or load match context metadata.

### NpcId

An opaque string identifier for an NPC defined in the Content Layer. The engine never references an `NpcId`. An NPC may appear in a story node as an opponent label, but this has no effect on how the engine runs the match.

### MatchContext

The content-layer description of a match associated with a `StoryNode` of type `match`. Specifies which NPC is the opponent, what region the match takes place in, and any presentation preferences. The Application Layer reads `MatchContext` and maps it to a generic engine configuration — the engine receives a `Ruleset`, not a `MatchContext`.

### MatchOutcome

The result of a completed match as seen by the Story System. Derived from `FinalResult` by the Application Layer. Contains: winner identity, final score delta, and whether the human player won. Story progression rules read `MatchOutcome` — not `FinalResult` directly — so the story layer is decoupled from engine result types.

### UnlockCondition

A declarative rule attached to a story node or content item that specifies when that item becomes accessible. Evaluated by the Application Layer using `StoryProgress` and `MatchOutcome`. Examples: "human won the preceding match", "node X was visited", "total games played ≥ 3". Never evaluated inside the engine.

### DialogueLine

A single line of text displayed in a dialogue node. Contains the speaker identifier, the text content, and optional presentation hints (e.g., emotion tag for future portrait animation). Stored in the Content Layer as data.

---

## 5. Data-Driven Content Model

Adding a new region, NPC, or story arc must not require modifying engine code. All content variation is expressed through data that the Application Layer reads and interprets.

The following TypeScript-like schema defines the shape of content data (implemented in M6-PR2B). `StoryNode` is a discriminated union: each node type enforces its own required fields at compile time. A `match` node cannot accidentally omit `matchContext`; an `end` node cannot accidentally add a `next` array.

```ts
// ─── Opaque string ID types ───────────────────────────────────────────────
type StoryId     = string;
type StoryNodeId = string;
type RegionId    = string;
type NpcId       = string;

// ─── Sub-types ────────────────────────────────────────────────────────────
type DialogueLine = {
  speakerId: string;    // NpcId | 'player' | 'narrator'
  text: string;
  emotionTag?: string;  // future portrait animation hint
};

type MatchContext = {
  npcId: NpcId;
  regionId: RegionId;
  presentationHints?: Record<string, string>;  // future: BGM key, bg image key
};

type UnlockCondition =
  | { type: 'humanWon' }
  | { type: 'visitedNode'; nodeId: StoryNodeId }
  | { type: 'matchesPlayed'; minimum: number }
  | { type: 'always' };

type StoryChoice = {
  choiceId: string;
  label: string;
  nextNodeId: StoryNodeId;
  unlockCondition?: UnlockCondition;
};

// ─── Discriminated StoryNode union ────────────────────────────────────────
type BaseStoryNode = {
  nodeId: StoryNodeId;
  regionId?: RegionId;
  npcId?: NpcId;
  unlockCondition?: UnlockCondition;
};

type DialogueStoryNode = BaseStoryNode & {
  type: 'dialogue';
  dialogue: DialogueLine[];   // required
  next: StoryNodeId[];        // required
};

type MatchStoryNode = BaseStoryNode & {
  type: 'match';
  matchContext: MatchContext;  // required
  next: StoryNodeId[];        // required — candidate next nodes; progression selects one
};

type ChoiceStoryNode = BaseStoryNode & {
  type: 'choice';
  choices: StoryChoice[];     // required; no top-level next
};

type EndStoryNode = BaseStoryNode & {
  type: 'end';
  // no next — terminal
};

type StoryNode =
  | DialogueStoryNode
  | MatchStoryNode
  | ChoiceStoryNode
  | EndStoryNode;

// ─── Top-level story ──────────────────────────────────────────────────────
type StoryDefinition = {
  storyId: StoryId;
  startNodeId: StoryNodeId;
  nodes: StoryNode[];
};

// ─── Runtime progression types (Application Layer) ────────────────────────
type MatchOutcome = {
  humanWon: boolean;
  humanFinalScore: number;
  aiFinalScore: number;
};

type StoryProgress = {
  storyId: string;
  currentNodeId: string;
  visitedNodeIds: string[];   // array, not Set — must be JSON-serializable
  matchHistory: MatchOutcome[];
};
```

**Key invariants this schema enforces:**

1. `StoryNode` is a discriminated union on `type` — TypeScript enforces required fields per node type. `matchContext` is guaranteed on `match` nodes; `dialogue[]` is guaranteed on `dialogue` nodes; `end` nodes have no `next` property.
2. `ChoiceStoryNode` uses `choices: StoryChoice[]` (not `next`) — branching carries the label and target in the same object.
3. `MatchContext` carries only content identifiers, never engine state.
4. `StoryProgress` is a fully JSON-serializable plain-data snapshot. `visitedNodeIds` is an array — `advanceStory()` is responsible for ensuring no duplicate node IDs are appended.
5. `UnlockCondition` is a discriminated union — all condition types are evaluatable from `StoryProgress` and `MatchOutcome` alone, with no engine access needed.

---

## 6. Match Result to Story Progression Flow

This section describes the data flow from a completed match to an updated story state.

```
Match ends
→ Engine emits FinalResult (winner, scores, reason)
→ Application Layer: buildMatchOutcome(FinalResult) → MatchOutcome
→ Application Layer: advanceStory(StoryProgress, MatchOutcome) → StoryProgress
→ Application Layer: buildStoryViewModel(StoryProgress, StoryDefinition) → StoryViewModel
→ Platform Layer: persist updated StoryProgress (if changed)
→ UI Layer: render StoryViewModel (current node, dialogue, NPC label, choices)
```

**Invariants:**

- The engine is not called during story advancement. `advanceStory` is a pure function of data.
- Story state does not feed back into the next match's engine inputs. The next match starts from a fresh `GameState` derived from `Ruleset` configuration only.
- If the current node type is `match`, the Application Layer maps `MatchContext` to a `Ruleset`-compatible engine config before starting the match. The engine receives only rule parameters — no content identity.
- A match may be replayed (if the player loses and the story requires a win) by re-entering the same node. `StoryProgress.currentNodeId` stays on the same node until the `UnlockCondition` is satisfied.

### StoryViewModel principles

`StoryViewModel` is the boundary object the Application Layer hands to the UI. It must contain enough information for the UI to render the current state without reading `StoryProgress` or `StoryDefinition` directly.

| Field | Purpose |
|---|---|
| `currentNodeId` | Identifies the current node without requiring the UI to read `currentNode.nodeId` |
| `currentNode` | Full node data (dialogue lines, match context, choices) for rendering |
| `isComplete` | True when `currentNode.type === 'end'` — UI can show end-of-story screen |
| `availableNextNodeIds` | Candidate next-node IDs, pre-computed by `getCandidateNextNodeIds(currentNode)` — UI must not derive this from raw definition |
| `visitedNodeIds` | Allows UI to mark previously-seen nodes or choices |
| `matchHistory` | Allows UI to display per-story match statistics |

`buildStoryViewModel` returns `null` only when `StoryProgress.currentNodeId` cannot be found in the `StoryDefinition`. This is a defensive guard; in a well-formed story definition it should not occur during normal play.

The UI must not:
- Call `getCandidateNextNodeIds` directly
- Inspect `StoryDefinition.nodes` to determine navigation options
- Evaluate `UnlockCondition` values

---

## 7. Story Progress State

`StoryProgress` is the only piece of story state persisted across sessions.

### Minimum viable shape

```ts
type StoryProgress = {
  storyId: string;
  currentNodeId: string;
  visitedNodeIds: ReadonlyArray<string>;   // array, not Set — must be JSON-serializable
  matchHistory: ReadonlyArray<MatchOutcome>;
};
```

`visitedNodeIds` uses an array rather than a `Set` because `Set` is not JSON-serializable. `advanceStory()` is responsible for not appending duplicate node IDs when marking a node as visited.

### Storage location

`StoryProgress` is saved by the Platform Layer, separate from `ActiveGame` save data. A match save (`ActiveGame`) represents an in-progress match. `StoryProgress` represents position in the narrative arc between matches.

### What `StoryProgress` must not contain

- Any engine state (`GameState`, `Ruleset`, `RandomProvider`)
- Any NPC profile data, dialogue text, or region art references
- Any unlock condition logic (conditions are evaluated by the Application Layer, not stored inside progress)

---

## 8. Directory Structure

M6 build target (all files created as of M6-H1):

```
src/
├─ application/
│  └─ storySession/
│     ├─ storyTypes.ts               # re-exports schema types + MatchOutcome, StoryProgress
│     ├─ storyProgression.ts         # findStoryNode(), getCandidateNextNodeIds(),
│     │                              # evaluateUnlockCondition(), buildStoryViewModel(),
│     │                              # advanceStory(); StoryViewModel interface
│     ├─ storyProgression.test.ts    # 45 tests
│     └─ index.ts                    # Public Application Layer boundary
│
└─ content/
   ├─ schemas/
   │  └─ storySchema.ts              # discriminated StoryNode union + all content types
   └─ stories/
      └─ sample/
         ├─ sampleStory.ts           # minimal sample story for M6 validation
         └─ sampleStory.test.ts      # 10 tests
```

`buildMatchOutcome()` (engine `FinalResult` → `MatchOutcome`) is intentionally absent. It requires an engine import and belongs to the integration boundary, not the pure progression layer. It will be added when match-to-story integration is wired.

The `src/engine/` tree is not touched by any M6 PR.

---

## 9. Boundary Invariants

The following rules must be enforced in every M6 PR review.

| Rule | Why |
|---|---|
| No engine file may be modified in M6 | Story System is additive — the engine is complete |
| `src/engine/` must not import from `src/content/` or `src/application/storySession/` | Engine must remain world-agnostic |
| `advanceStory()` must be a pure function with no engine imports | Story progression is data-only |
| `MatchOutcome` must be derived from `FinalResult`, not from raw engine state | Application Layer owns the translation boundary |
| `UnlockCondition` evaluation must not require engine access | Conditions are evaluated from `StoryProgress` and `MatchOutcome` only |
| Shuffle, deal, scoring, and AI strategy must be unchanged by story context | Fairness is non-negotiable |
| `StoryProgress` must be fully JSON-serializable (no `Set`, `Map`, class instances, or functions) | Platform Layer must be able to persist and restore it; `visitedNodeIds` uses `ReadonlyArray<string>` |
| `StoryNode` must remain a discriminated union — PRs that revert it to a single loose interface must be rejected | Compile-time enforcement of per-type required fields is a key correctness guarantee; a loose interface lets match nodes omit `matchContext` silently |
| Sample story content is validation data only — not final production content | Full content is M7+ |

---

## 10. Non-Goals Restated

The following are explicitly out of scope for M6 and must not appear in M6 PRs.

- Full 팔도맞고 1975 story content
- NPC personality AI or story-driven AI behavior
- Regional art, BGM, or atmosphere
- Reward and unlock animations
- Fortune / horoscope integration
- Ads, billing, analytics
- Online multiplayer
- Engine rule variations driven by story state
- Story branching beyond the minimal sample definition

---

## 11. Final Pre-Implementation Decision

### Architecture Readiness

| Check | Status |
|---|---|
| Layer boundary defined; forbidden import directions listed (§3) | ✅ |
| `StoryProgress` confirmed fully JSON-serializable — `visitedNodeIds` uses `ReadonlyArray<string>`, not `Set` (§5, §7) | ✅ |
| `advanceStory()` declared a pure function with no engine access (§6, §9) | ✅ |
| `UnlockCondition` as discriminated union — evaluatable from `StoryProgress` and `MatchOutcome` alone (§5) | ✅ |
| Engine unchanged in M6 — any engine file modified in a Story System PR must be rejected (§3, §9) | ✅ |
| Full content, NPC roster, BGM, rewards, fortune, monetization excluded from M6 scope (§2, §10) | ✅ |
| M6-PR2 and M6-PR3 scope defined in `docs/09_pr_plan.md` | ✅ |

### Decision

The Story System architecture is established. M6-PR2 implementation (story types schema) may begin.

Any PR that:
- Imports story or content types into engine files
- Evaluates unlock conditions inside the engine
- Uses `Set` or `Map` in `StoryProgress`
- Contains production content (NPC names, region text, BGM keys, dialogue)

…must be rejected as a boundary violation.

---

## 12. M6-H1 Story System Foundation Sign-off

### A. Scope Reviewed

The following PRs constitute the M6 Story System Foundation:

| PR | Title | Status |
|---|---|---|
| M6-PR1 | Story System Architecture document | Merged to main |
| M6-PR1A | StoryProgress serialization fix + M6 plan alignment | Merged to main |
| M6-PR2 | Story types schema + sample story | Merged to main |
| M6-PR2A | StoryNode discriminated union (side branch) | Closed — base was `milestone6/pr2-story-types-schema`, not `main`; changes did not reach main; superseded by PR2B |
| M6-PR2B | Discriminated StoryNode schema applied to main + `sample-` prefix cleanup | Merged to main |
| M6-PR3 | Pure story progression logic (`evaluateUnlockCondition`, `advanceStory`) | Merged to main |
| M6-PR3A | ViewModel helpers, no-advance state fix, optional unlock condition | Merged to main |
| M6-PR3B | StoryViewModel shape alignment (`currentNodeId`, `availableNextNodeIds`) | Merged to main |

---

### B. Boundary Verification

| Boundary Check | Status | Evidence | Notes |
|---|---|---|---|
| Engine imports from `src/content/` or `src/application/storySession/` | **Pass** | No M6 PR modified any engine file; `src/engine/` import tree is unchanged | Engine remains story-agnostic |
| `src/content/` or `src/application/storySession/` imports from `src/engine/` | **Pass** | `storyProgression.ts` imports only from `./storyTypes.js`; no engine type referenced | `buildMatchOutcome` (requires `FinalResult`) explicitly deferred |
| `FinalResult` import in pure story progression | **Pass** | `storyProgression.ts` does not import `FinalResult` or any engine type | `FinalResult → MatchOutcome` adapter is deferred to M7 |
| `GameState`, `Ruleset`, `RandomProvider` stored in `StoryProgress` | **Pass** | `StoryProgress` contains only `storyId`, `currentNodeId`, `visitedNodeIds`, `matchHistory` | Fully JSON-serializable plain data |
| `StoryProgress` JSON serialization | **Pass** | `visitedNodeIds: ReadonlyArray<string>` (not `Set`); `matchHistory: ReadonlyArray<MatchOutcome>` — both are plain arrays of primitives/plain objects | Verified by `sampleStory.test.ts` JSON roundtrip test |
| `StoryNode` discriminated union | **Pass** | `type` field gates required properties per node type — `matchContext` required on `match`, `dialogue` required on `dialogue`, `end` has no `next` | Compile-time enforcement; §9 rejection criterion documented |
| Sample story production-content risk | **Pass** | `sampleStory.ts` uses `sample-` prefix node IDs and placeholder NPC/region strings; no final Korean dialogue or regional art | Validation fixture only |
| UI interprets raw `StoryDefinition` directly | **Deferred** | No UI shell implemented in M6; `StoryViewModel` boundary is in place for when UI is built | M7-PR4 will consume `StoryViewModel`, not raw definition |
| `StoryProgress` persistence | **Deferred** | No `StorageService` calls from story session layer in M6 | Deferred to after M7 runtime flow is proven |
| Engine rule variation driven by story state | **Not Applicable / Forbidden** | No such mechanism exists or is planned; §3 and §9 explicitly prohibit it | Match fairness is non-negotiable |

---

### C. Final M6 Decision

**M6 Story System Foundation is approved** as a data-driven Application/Content layer foundation.

- The engine remains reusable and story-agnostic. No engine file was modified across any M6 PR.
- Story progression can react to match outcomes (`MatchOutcome`) but cannot affect match fairness, shuffle, deal, scoring, AI strategy, or final result.
- `StoryProgress` is a plain JSON-serializable snapshot — no `Set`, `Map`, class instances, or functions.
- `StoryNode` is a discriminated union enforcing per-type required fields at compile time.
- The `StoryViewModel` Application Layer boundary is in place so that future UI will not need to interpret raw `StoryDefinition` traversal data.

Full story content production, visual presentation, persistence integration, and match-to-story runtime wiring remain deferred to M7+.

---

### D. Remaining Deferred Work

The following items are explicitly out of scope for M6 and remain deferred:

| Item | Target Milestone |
|---|---|
| `buildMatchOutcome` — `FinalResult` → `MatchOutcome` adapter | M7-PR2 |
| `StoryProgress` persistence via `StorageService` | M7-PR3 or later |
| Minimal Story UI shell (render current node, navigate to match) | M7-PR4 |
| Region / NPC / dialogue production content | M7+ (content milestone) |
| 1970s regional presentation layer (art, atmosphere) | M7+ |
| BGM / SFX / background artwork | Post-M7 |
| Reward / unlock animation | Post-M7 |
| Fortune / saju / seasonal event integration | Post-M7 |
| Monetization / ads integration | Release preparation (M9) |
| Online multiplayer | Post-M9 |

---

### E. Recommended Next Milestone

**Recommended: M7 — Minimal Story Runtime Integration**

| Purpose | Detail |
|---|---|
| Connect match outcome to story progression | `buildMatchOutcome` adapter: engine `FinalResult` → Application Layer `MatchOutcome` → `advanceStory` |
| Add minimal `StorySession` shell | Tracks `StoryProgress` and current `StoryViewModel`; no full UI polish |
| Minimal Story UI (navigation only) | Render current story node; allow dialogue → match node → result → story state navigation |
| `StoryProgress` persistence | Only after the runtime flow is proven stable |
| Constraint | No regional/NPC/dialogue production content in M7; full content is a separate content milestone |

**Alternative: M7A — Game Board Visual Shell**

Use only if board readability or presentation becomes more urgent than story runtime integration before any content work can begin.

The recommended path is M7 — Minimal Story Runtime Integration.
