/**
 * Public Application Layer boundary for the Story System.
 *
 * UI components and tests must import story types from here, never directly
 * from storyTypes.ts, content/schemas/storySchema.ts, or the engine.
 */

export type {
  StoryId,
  StoryNodeId,
  RegionId,
  NpcId,
  DialogueLine,
  MatchContext,
  UnlockCondition,
  StoryChoice,
  BaseStoryNode,
  DialogueStoryNode,
  MatchStoryNode,
  ChoiceStoryNode,
  EndStoryNode,
  StoryNode,
  StoryDefinition,
  MatchOutcome,
  StoryProgress,
} from './storyTypes.js';
