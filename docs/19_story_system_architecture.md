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

M6 build target (all files created as of M6-PR3):

```
src/
├─ application/
│  └─ storySession/
│     ├─ storyTypes.ts               # re-exports schema types + MatchOutcome, StoryProgress
│     ├─ storyProgression.ts         # evaluateUnlockCondition(), advanceStory()
│     ├─ storyProgression.test.ts    # 24 tests
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
