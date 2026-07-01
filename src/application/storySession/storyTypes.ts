/**
 * Application Layer: Story System runtime types.
 *
 * Re-exports content-schema types for Application Layer consumers, and defines
 * runtime progression types (MatchOutcome, StoryProgress) that are not part of
 * the static content schema.
 *
 * Dependency rule: may import from Content Layer (src/content/) and Shared Layer.
 * Must NOT import from src/engine/, src/components/, or src/platform/.
 */

export type {
  RegionId,
  NpcId,
  DialogueLine,
  MatchContext,
  UnlockCondition,
  StoryNode,
  StoryDefinition,
} from '../../content/schemas/storySchema.js';

/**
 * The result of a completed match as seen by the Story System.
 * Derived from the engine's FinalResult by the Application Layer.
 * Story progression rules read MatchOutcome — not FinalResult directly —
 * so the story layer is decoupled from engine result types.
 */
export interface MatchOutcome {
  readonly humanWon: boolean;
  readonly humanFinalScore: number;
  readonly aiFinalScore: number;
}

/**
 * The player's current position in a StoryDefinition.
 *
 * Invariants:
 * - Must be fully JSON-serializable: no Set, Map, class instances, or functions.
 * - visitedNodeIds is a plain array; advanceStory() must not append duplicate IDs.
 * - The engine never reads or writes StoryProgress.
 */
export interface StoryProgress {
  readonly storyId: string;
  readonly currentNodeId: string;
  /** Plain array (not Set) to remain JSON-serializable. advanceStory() ensures no duplicates. */
  readonly visitedNodeIds: ReadonlyArray<string>;
  readonly matchHistory: ReadonlyArray<MatchOutcome>;
}
