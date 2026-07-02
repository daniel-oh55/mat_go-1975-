/**
 * Application Layer: StorySession state and pure state-transition helpers.
 *
 * StorySessionState is the top-level runtime state for the Story System. It
 * tracks story position (StoryProgress) and a ready-to-render StoryViewModel,
 * plus a small amount of transition bookkeeping (status, pendingMatchContext,
 * error). It never stores a StoryDefinition (definitions are passed as an
 * argument to every helper that needs one), engine GameState, RandomProvider,
 * Ruleset, or UI animation state. StorySessionState is not a persistence
 * schema — saving it is deferred until the runtime flow is proven.
 *
 * Every helper in this file is pure: given the same inputs it returns the
 * same new StorySessionState, and it never mutates its state/definition/
 * outcome arguments.
 *
 * Error policy: calling a transition helper while the session is in the
 * wrong status, or while the current node is not the type that helper
 * handles, does NOT silently return the untouched input state. It returns a
 * new state with the same status/progress/viewModel but a non-null `error`
 * message describing the mismatch — this keeps misuse visible for debugging
 * instead of swallowing it. The one exception is selectStoryChoice with an
 * unmatched or condition-blocked choiceId: advanceStory() itself treats that
 * as a no-op (the progress is returned unchanged), so selectStoryChoice
 * mirrors that and produces no error — the session simply stays on the same
 * choice node.
 *
 * The only case that produces status: 'invalid' is when buildStoryViewModel
 * cannot resolve viewModel — i.e. the StoryDefinition and StoryProgress are
 * out of sync (currentNodeId not found in the definition).
 *
 * Dependency rule: must NOT import from src/engine/, src/platform/, or
 * src/components/. Must NOT import FinalResult or any engine type.
 * GameSession integration is deferred to M7-PR4.
 */

import type { StoryDefinition, StoryProgress, MatchOutcome, MatchContext } from './storyTypes.js';
import { buildStoryViewModel, advanceStory } from './storyProgression.js';
import type { StoryViewModel } from './storyProgression.js';

export type StorySessionStatus = 'story' | 'matchRequested' | 'completed' | 'invalid';

export interface StorySessionState {
  readonly storyId: string;
  readonly progress: StoryProgress;
  readonly viewModel: StoryViewModel | null;
  readonly status: StorySessionStatus;
  /** Only non-null while status is 'matchRequested'. */
  readonly pendingMatchContext: MatchContext | null;
  /** Non-null only for 'invalid' status or a failed transition attempt. */
  readonly error: string | null;
}

/**
 * Creates the initial StoryProgress for a fresh playthrough of `definition`.
 * Does not mutate `definition`.
 */
export function createInitialStoryProgress(definition: StoryDefinition): StoryProgress {
  return {
    storyId: definition.storyId,
    currentNodeId: definition.startNodeId,
    visitedNodeIds: [],
    matchHistory: [],
  };
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Builds a StorySessionState from a StoryProgress by deriving its StoryViewModel.
 * Returns an 'invalid' state if the definition and progress are out of sync.
 */
function buildStateFromProgress(
  definition: StoryDefinition,
  progress: StoryProgress,
): StorySessionState {
  const viewModel = buildStoryViewModel(progress, definition);
  if (viewModel === null) {
    return toInvalidStorySession(
      progress,
      `StoryProgress.currentNodeId "${progress.currentNodeId}" was not found in StoryDefinition "${definition.storyId}".`,
    );
  }
  return {
    storyId: progress.storyId,
    progress,
    viewModel,
    status: viewModel.currentNode.type === 'end' ? 'completed' : 'story',
    pendingMatchContext: null,
    error: null,
  };
}

/** Builds an 'invalid' StorySessionState — viewModel could not be resolved. */
function toInvalidStorySession(progress: StoryProgress, error: string): StorySessionState {
  return {
    storyId: progress.storyId,
    progress,
    viewModel: null,
    status: 'invalid',
    pendingMatchContext: null,
    error,
  };
}

/**
 * Returns a new state identical to `state` except for a non-null `error`
 * message. Status, progress, and viewModel are left untouched — see the
 * error policy documented at the top of this file.
 */
function withError(state: StorySessionState, error: string): StorySessionState {
  return { ...state, error };
}

// ─── Session lifecycle ───────────────────────────────────────────────────────

/**
 * Creates a fresh StorySessionState for the start of `definition`.
 */
export function createStorySession(definition: StoryDefinition): StorySessionState {
  return buildStateFromProgress(definition, createInitialStoryProgress(definition));
}

/**
 * Advances a 'dialogue' node to its next node. No-op-with-error for any other
 * node type or session status — see the error policy above.
 */
export function continueStorySession(
  state: StorySessionState,
  definition: StoryDefinition,
): StorySessionState {
  if (state.status !== 'story') {
    return withError(
      state,
      `continueStorySession called while status is "${state.status}"; expected "story".`,
    );
  }
  if (state.viewModel === null) {
    return toInvalidStorySession(state.progress, 'continueStorySession called with a null viewModel.');
  }
  if (state.viewModel.currentNode.type !== 'dialogue') {
    return withError(
      state,
      `continueStorySession called on a "${state.viewModel.currentNode.type}" node; expected "dialogue".`,
    );
  }

  const nextProgress = advanceStory(state.progress, null, definition);
  return buildStateFromProgress(definition, nextProgress);
}

/**
 * Marks the session as requesting a match, exposing the current 'match' node's
 * MatchContext as pendingMatchContext. Does not create engine state, a
 * RandomProvider, or a GameSession — the caller (M7-PR4+) is responsible for
 * mapping MatchContext to a generic match setup.
 */
export function requestStoryMatch(state: StorySessionState): StorySessionState {
  if (state.viewModel === null) {
    return toInvalidStorySession(state.progress, 'requestStoryMatch called with a null viewModel.');
  }
  if (state.viewModel.currentNode.type !== 'match') {
    return withError(
      state,
      `requestStoryMatch called on a "${state.viewModel.currentNode.type}" node; expected "match".`,
    );
  }

  return {
    ...state,
    status: 'matchRequested',
    pendingMatchContext: state.viewModel.currentNode.matchContext,
    error: null,
  };
}

/**
 * Advances story progress using an already-built MatchOutcome. This function
 * does not build MatchOutcome itself — that is buildMatchOutcome's job
 * (matchOutcomeAdapter.ts). No FinalResult or engine import here.
 */
export function completeStoryMatch(
  state: StorySessionState,
  definition: StoryDefinition,
  outcome: MatchOutcome,
): StorySessionState {
  if (state.status !== 'matchRequested') {
    return withError(
      state,
      `completeStoryMatch called while status is "${state.status}"; expected "matchRequested".`,
    );
  }
  if (state.viewModel === null) {
    return toInvalidStorySession(state.progress, 'completeStoryMatch called with a null viewModel.');
  }
  if (state.viewModel.currentNode.type !== 'match') {
    return withError(
      state,
      `completeStoryMatch called on a "${state.viewModel.currentNode.type}" node; expected "match".`,
    );
  }

  const nextProgress = advanceStory(state.progress, outcome, definition);
  return buildStateFromProgress(definition, nextProgress);
}

/**
 * Advances a 'choice' node using the player's chosen choiceId. If choiceId
 * does not match any choice, or its unlockCondition is not satisfied,
 * advanceStory() no-ops (progress unchanged) and this function mirrors that —
 * no error is produced, the session stays on the same choice node.
 */
export function selectStoryChoice(
  state: StorySessionState,
  definition: StoryDefinition,
  choiceId: string,
): StorySessionState {
  if (state.status !== 'story') {
    return withError(
      state,
      `selectStoryChoice called while status is "${state.status}"; expected "story".`,
    );
  }
  if (state.viewModel === null) {
    return toInvalidStorySession(state.progress, 'selectStoryChoice called with a null viewModel.');
  }
  if (state.viewModel.currentNode.type !== 'choice') {
    return withError(
      state,
      `selectStoryChoice called on a "${state.viewModel.currentNode.type}" node; expected "choice".`,
    );
  }

  const nextProgress = advanceStory(state.progress, null, definition, choiceId);
  return buildStateFromProgress(definition, nextProgress);
}
