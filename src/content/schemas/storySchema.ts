/**
 * Content Layer: Story System schema types.
 *
 * These types define the shape of story content data — the structure of story
 * definitions, nodes, dialogue, and unlock conditions. They are pure data
 * contracts; no logic lives here.
 *
 * Dependency rule: this file must NOT import from src/engine/, src/application/,
 * src/components/, or src/platform/. It may import from src/shared/ (Shared Layer)
 * if needed in the future.
 */

/** Opaque identifier for a geographical region defined in the Content Layer. */
export type RegionId = string;

/** Opaque identifier for an NPC defined in the Content Layer. */
export type NpcId = string;

/** A single line of dialogue attached to a dialogue node. */
export interface DialogueLine {
  /** NpcId, 'player', or 'narrator'. */
  readonly speakerId: string;
  readonly text: string;
  /** Future: portrait emotion animation hint. */
  readonly emotionTag?: string;
}

/**
 * Content-layer description of a match within a story node.
 * The Application Layer maps this to a generic Ruleset before starting a match —
 * the engine receives only rule parameters, never MatchContext directly.
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
  | { readonly type: 'visitedNode'; readonly nodeId: string }
  | { readonly type: 'matchesPlayed'; readonly minimum: number }
  | { readonly type: 'always' };

/**
 * A single step in a story.
 *
 * - 'dialogue': show one or more DialogueLines, then advance
 * - 'match':    play a game against the specified NpcId
 * - 'choice':   present the player with branching options (next has multiple entries)
 * - 'end':      story arc is complete
 */
export interface StoryNode {
  readonly nodeId: string;
  readonly type: 'dialogue' | 'match' | 'choice' | 'end';
  readonly regionId?: RegionId;
  readonly npcId?: NpcId;
  readonly dialogue?: ReadonlyArray<DialogueLine>;
  /** Present on 'match' nodes. Absent on all other types. */
  readonly matchContext?: MatchContext;
  /** Condition that must be true for this node to be entered. Omit or use 'always' for unconditional. */
  readonly unlockCondition?: UnlockCondition;
  /**
   * Node IDs to advance to after this node.
   * Linear nodes: one entry. Branching choice nodes: multiple entries, each with its own
   * unlockCondition on the target node. 'end' nodes: omit or leave empty.
   */
  readonly next?: ReadonlyArray<string>;
}

/**
 * A complete story expressed as a directed node graph.
 * The Application Layer traverses the graph using StoryProgress as the cursor.
 * Never imported by the engine.
 */
export interface StoryDefinition {
  readonly storyId: string;
  readonly startNodeId: string;
  readonly nodes: ReadonlyArray<StoryNode>;
}
