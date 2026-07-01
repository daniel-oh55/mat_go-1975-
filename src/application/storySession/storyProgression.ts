/**
 * Application Layer: Story System progression logic.
 *
 * Pure functions that advance StoryProgress based on a StoryDefinition and an
 * optional MatchOutcome. These functions have no side effects and no engine imports.
 *
 * Dependency rule: may import from Content Layer (src/content/) and from
 * storyTypes.ts in the same directory. Must NOT import from src/engine/,
 * src/components/, or src/platform/.
 *
 * buildMatchOutcome() — translating engine FinalResult to MatchOutcome — is
 * intentionally NOT included here. That function belongs to the integration
 * boundary and must be implemented where FinalResult is available (M6-H1+).
 */

import type { UnlockCondition, StoryDefinition } from '../../content/schemas/storySchema.js';
import type { StoryProgress, MatchOutcome } from './storyTypes.js';

/**
 * Returns true when the given condition is satisfied by the current progress and
 * (optionally) the outcome of the most recently completed match.
 *
 * Condition semantics:
 * - 'always'        — always true
 * - 'humanWon'      — true only when outcome is non-null and humanWon is true
 * - 'visitedNode'   — true when nodeId is present in progress.visitedNodeIds
 * - 'matchesPlayed' — true when progress.matchHistory.length >= minimum;
 *                     if called from advanceStory this count already includes
 *                     the current match (see advanceStory implementation)
 */
export function evaluateUnlockCondition(
  condition: UnlockCondition,
  progress: StoryProgress,
  outcome: MatchOutcome | null,
): boolean {
  switch (condition.type) {
    case 'always':
      return true;
    case 'humanWon':
      return outcome !== null && outcome.humanWon;
    case 'visitedNode':
      return progress.visitedNodeIds.includes(condition.nodeId);
    case 'matchesPlayed':
      return progress.matchHistory.length >= condition.minimum;
  }
}

/**
 * Advances StoryProgress by one step and returns the updated progress.
 * Returns the original progress unchanged when advancement is not possible.
 *
 * Advancement rules by current node type:
 * - 'dialogue' : advance to next[0] (linear; next must be non-empty)
 * - 'match'    : append outcome to matchHistory, then pick the first candidate
 *                in next[] whose unlockCondition is satisfied
 * - 'choice'   : advance to the choice whose choiceId matches the provided
 *                choiceId argument, if that choice's unlockCondition is met
 * - 'end'      : terminal; return unchanged
 *
 * In all cases the current node is added to visitedNodeIds (deduplicated).
 * For 'matchesPlayed' conditions on next-node candidates, the updated
 * matchHistory (including the current outcome) is used for evaluation.
 *
 * @param progress   - current story position
 * @param outcome    - result of the match that just ended, or null for non-match transitions
 * @param definition - the story graph being traversed
 * @param choiceId   - required when the current node is a 'choice' node
 */
export function advanceStory(
  progress: StoryProgress,
  outcome: MatchOutcome | null,
  definition: StoryDefinition,
  choiceId?: string,
): StoryProgress {
  const currentNode = definition.nodes.find((n) => n.nodeId === progress.currentNodeId);

  // Node not found in definition, or already at a terminal node: no-op
  if (currentNode === undefined || currentNode.type === 'end') {
    return progress;
  }

  // Mark current node as visited (deduplicated)
  const nextVisitedNodeIds: ReadonlyArray<string> = progress.visitedNodeIds.includes(
    currentNode.nodeId,
  )
    ? progress.visitedNodeIds
    : [...progress.visitedNodeIds, currentNode.nodeId];

  // Append match outcome when advancing FROM a match node
  const nextMatchHistory: ReadonlyArray<MatchOutcome> =
    currentNode.type === 'match' && outcome !== null
      ? [...progress.matchHistory, outcome]
      : progress.matchHistory;

  // Build the progress snapshot used when evaluating next-node conditions.
  // Using the post-update state ensures 'matchesPlayed' counts the current match.
  const progressForEval: StoryProgress = {
    storyId: progress.storyId,
    currentNodeId: progress.currentNodeId,
    visitedNodeIds: nextVisitedNodeIds,
    matchHistory: nextMatchHistory,
  };

  let nextNodeId: string | undefined;

  if (currentNode.type === 'dialogue') {
    // Linear flow: advance to the first listed next node
    nextNodeId = currentNode.next[0];
  } else if (currentNode.type === 'match') {
    // Pick the first candidate whose unlock condition is satisfied
    for (const candidateId of currentNode.next) {
      const candidate = definition.nodes.find((n) => n.nodeId === candidateId);
      if (candidate === undefined) continue;
      const condition: UnlockCondition = candidate.unlockCondition ?? { type: 'always' };
      if (evaluateUnlockCondition(condition, progressForEval, outcome)) {
        nextNodeId = candidateId;
        break;
      }
    }
  } else if (currentNode.type === 'choice') {
    // Advance to the chosen option's target if its condition is met
    const chosen = currentNode.choices.find((c) => c.choiceId === choiceId);
    if (chosen !== undefined) {
      const condition: UnlockCondition = chosen.unlockCondition ?? { type: 'always' };
      if (evaluateUnlockCondition(condition, progressForEval, null)) {
        nextNodeId = chosen.nextNodeId;
      }
    }
  }

  if (nextNodeId === undefined) {
    return progress;
  }

  return {
    storyId: progress.storyId,
    currentNodeId: nextNodeId,
    visitedNodeIds: nextVisitedNodeIds,
    matchHistory: nextMatchHistory,
  };
}
