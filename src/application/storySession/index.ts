/**
 * Public Application Layer boundary for the Story System.
 *
 * UI components and tests must import story types from here, never directly
 * from storyTypes.ts, content/schemas/storySchema.ts, or the engine.
 */

export type {
  RegionId,
  NpcId,
  DialogueLine,
  MatchContext,
  UnlockCondition,
  StoryNode,
  StoryDefinition,
  MatchOutcome,
  StoryProgress,
} from './storyTypes.js';
