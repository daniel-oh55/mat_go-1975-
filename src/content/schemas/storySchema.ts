/**
 * Content Layer: Story System schema types.
 *
 * These types define the shape of story content data. StoryNode is a
 * discriminated union so each node type enforces its own required fields
 * at compile time — no optional-that-should-be-required ambiguity.
 *
 * Dependency rule: this file must NOT import from src/engine/,
 * src/application/, src/components/, or src/platform/.
 */

/** Opaque identifier for a complete story arc. */
export type StoryId = string;

/** Opaque identifier for a single node within a story. */
export type StoryNodeId = string;

/** Opaque identifier for a geographical region defined in the Content Layer. */
export type RegionId = string;

/** Opaque identifier for an NPC defined in the Content Layer. */
export type NpcId = string;

// ─── Shared sub-types ────────────────────────────────────────────────────────

/** A single line of dialogue attached to a dialogue node. */
export interface DialogueLine {
  /** NpcId, 'player', or 'narrator'. */
  readonly speakerId: string;
  readonly text: string;
  /** Future: portrait emotion animation hint (e.g. 'happy', 'wary'). */
  readonly emotionTag?: string;
}

/**
 * Content-layer description of a match within a story node.
 * The Application Layer maps this to a generic Ruleset before starting a
 * match — the engine receives only rule parameters, never MatchContext.
 */
export interface MatchContext {
  readonly npcId: NpcId;
  readonly regionId: RegionId;
  /** Future: BGM key, background image key, etc. */
  readonly presentationHints?: Readonly<Record<string, string>>;
}

/**
 * Declarative condition that must be satisfied before a node can be entered.
 * Evaluated by the Application Layer from StoryProgress and MatchOutcome —
 * never evaluated inside the engine.
 */
export type UnlockCondition =
  | { readonly type: 'humanWon' }
  | { readonly type: 'visitedNode'; readonly nodeId: StoryNodeId }
  | { readonly type: 'matchesPlayed'; readonly minimum: number }
  | { readonly type: 'always' };

/**
 * A single branch option within a 'choice' node.
 * The player selects one; its unlockCondition gates visibility or availability.
 */
export interface StoryChoice {
  readonly choiceId: string;
  readonly label: string;
  readonly nextNodeId: StoryNodeId;
  readonly unlockCondition?: UnlockCondition;
}

// ─── Discriminated StoryNode union ───────────────────────────────────────────

/** Fields shared by every node type. */
export interface BaseStoryNode {
  readonly nodeId: StoryNodeId;
  readonly regionId?: RegionId;
  readonly npcId?: NpcId;
  readonly unlockCondition?: UnlockCondition;
}

/** Shows one or more dialogue lines, then advances to the next node. */
export interface DialogueStoryNode extends BaseStoryNode {
  readonly type: 'dialogue';
  readonly dialogue: ReadonlyArray<DialogueLine>;
  readonly next: ReadonlyArray<StoryNodeId>;
}

/** Triggers a match against the specified NPC, then branches based on outcome. */
export interface MatchStoryNode extends BaseStoryNode {
  readonly type: 'match';
  readonly matchContext: MatchContext;
  /** Candidate next-node IDs. Progression logic selects one based on unlockConditions. */
  readonly next: ReadonlyArray<StoryNodeId>;
}

/** Presents the player with labelled choices; each choice carries its own nextNodeId. */
export interface ChoiceStoryNode extends BaseStoryNode {
  readonly type: 'choice';
  readonly choices: ReadonlyArray<StoryChoice>;
}

/** Terminal node — the story arc is complete. */
export interface EndStoryNode extends BaseStoryNode {
  readonly type: 'end';
}

/**
 * A single step in a story arc.
 * Using a discriminated union means TypeScript enforces required fields per
 * node type — `dialogue` nodes must have `dialogue[]`, `match` nodes must have
 * `matchContext`, etc.
 */
export type StoryNode =
  | DialogueStoryNode
  | MatchStoryNode
  | ChoiceStoryNode
  | EndStoryNode;

// ─── Top-level story ─────────────────────────────────────────────────────────

/**
 * A complete story expressed as a directed node graph.
 * The Application Layer traverses the graph using StoryProgress as the cursor.
 * Never imported by the engine.
 */
export interface StoryDefinition {
  readonly storyId: StoryId;
  readonly startNodeId: StoryNodeId;
  readonly nodes: ReadonlyArray<StoryNode>;
}
