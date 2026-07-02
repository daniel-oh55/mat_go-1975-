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

export type { StoryViewModel } from './storyProgression.js';
export {
  findStoryNode,
  getCandidateNextNodeIds,
  evaluateUnlockCondition,
  buildStoryViewModel,
  advanceStory,
} from './storyProgression.js';

export { buildMatchOutcome } from './matchOutcomeAdapter.js';

export type { StorySessionStatus, StorySessionState } from './storySessionState.js';
export {
  createInitialStoryProgress,
  createStorySession,
  restoreStorySession,
  continueStorySession,
  requestStoryMatch,
  completeStoryMatch,
  selectStoryChoice,
} from './storySessionState.js';

export {
  STORY_PROGRESS_STORAGE_KEY,
  STORY_PROGRESS_SAVE_VERSION,
  serializeStoryProgress,
  validateStoryProgressSaveDocument,
  saveStoryProgress,
  loadStoryProgress,
  deleteStoryProgress,
  shouldSaveStoryProgress,
} from './storyProgressSave.js';
export type { StoryProgressSaveDocumentV1 } from './storyProgressSave.js';
