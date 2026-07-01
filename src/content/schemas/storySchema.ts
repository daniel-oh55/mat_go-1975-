/**
 * Content Layer: Story System schema types.
 *
 * These types define the shape of story content data — the structure of story
 * definitions, nodes, dialogue, and unlock conditions. They are pure data
 * contracts; no logic lives here.
 *
 * StoryNode is a discriminated union: each node type enforces its own required
 * fields at compile time. A 'match' node cannot accidentally omit matchContext;
 * an 'end' node cannot accidentally add a next array.
 *
 * Dependency rule: this file must NOT import from src/engine/, src/application/,
 * src/components/, or src/platform/. It may import from src/shared/ (Shared Layer)
 * if needed in the future.
 */

/** Opaque identifier for a story, used in StoryProgress. */
export type StoryId = string;

/** Opaque identifier for a node within a StoryDefinition. */
export type StoryNodeId = string;

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
  | { readonly type: 'visitedNode'; readonly nodeId: StoryNodeId }
  | { readonly type: 'matchesPlayed'; readonly minimum: number }
  | { readonly type: 'always' };

/**
 * A single choice option presented to the player in a ChoiceStoryNode.
 */
export interface StoryChoice {
  readonly choiceId: string;
  readonly label: string;
  readonly nextNodeId: StoryNodeId;
  readonly unlockCondition?: UnlockCondition;
}

/**
 * Fields shared by all StoryNode types.
 */
export interface BaseStoryNode {
  readonly nodeId: StoryNodeId;
  readonly regionId?: RegionId;
  readonly npcId?: NpcId;
  readonly unlockCondition?: UnlockCondition;
}

/**
 * Show one or more DialogueLines, then advance to next nodes.
 * 'next' must have at least one entry (linear flow uses exactly one).
 */
export interface DialogueStoryNode extends BaseStoryNode {
  readonly type: 'dialogue';
  readonly dialogue: ReadonlyArray<DialogueLine>;
  readonly next: ReadonlyArray<StoryNodeId>;
}

/**
 * Play a match against the NPC specified in matchContext.
 * 'next' lists candidate next nodes; the Application Layer selects one
 * based on match outcome and unlockConditions.
 */
export interface MatchStoryNode extends BaseStoryNode {
  readonly type: 'match';
  readonly matchContext: MatchContext;
  readonly next: ReadonlyArray<StoryNodeId>;
}

/**
 * Present the player with branching options.
 * Uses 'choices' (not 'next') — each choice carries its own label and target.
 */
export interface ChoiceStoryNode extends BaseStoryNode {
  readonly type: 'choice';
  readonly choices: ReadonlyArray<StoryChoice>;
}

/**
 * Terminal node — story arc is complete.
 * No 'next' property; the graph ends here.
 */
export interface EndStoryNode extends BaseStoryNode {
  readonly type: 'end';
}

/**
 * A single step in a story. Discriminated on 'type'.
 * TypeScript narrows to the concrete type in any type-guarded branch.
 */
export type StoryNode =
  | DialogueStoryNode
  | MatchStoryNode
  | ChoiceStoryNode
  | EndStoryNode;

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
