/**
 * Application Layer: Story System progression logic.
 *
 * Pure functions that advance StoryProgress based on a StoryDefinition and an
 * optional MatchOutcome. These functions have no side effects and no engine imports.
 *
 * Dependency rule: may import from storyTypes.ts (same directory) which re-exports
 * Content Layer types. Must NOT import from src/engine/, src/components/, or
 * src/platform/.
 *
 * buildMatchOutcome() — translating engine FinalResult to MatchOutcome — is
 * intentionally NOT included here. That function belongs to the integration
 * boundary and must be implemented where FinalResult is available (M6-H1+).
 */

import type {
  UnlockCondition,
  StoryDefinition,
  StoryNode,
  StoryNodeId,
  StoryProgress,
  MatchOutcome,
} from './storyTypes.js';

// ─── Lookup helpers ──────────────────────────────────────────────────────────

/**
 * Returns the StoryNode with the given nodeId, or null if not found.
 */
export function findStoryNode(
  definition: StoryDefinition,
  nodeId: StoryNodeId,
): StoryNode | null {
  return definition.nodes.find((n) => n.nodeId === nodeId) ?? null;
}

/**
 * Returns all node IDs that this node can lead to, regardless of unlock conditions.
 *
 * - dialogue / match: their next[] array
 * - choice: the nextNodeId of every choice option
 * - end: empty array (terminal)
 */
export function getCandidateNextNodeIds(node: StoryNode): ReadonlyArray<StoryNodeId> {
  if (node.type === 'dialogue' || node.type === 'match') {
    return node.next;
  }
  if (node.type === 'choice') {
    return node.choices.map((c) => c.nextNodeId);
  }
  return [];
}

// ─── Condition evaluation ────────────────────────────────────────────────────

/**
 * Returns true when the given condition is satisfied by the current progress and
 * (optionally) the outcome of the most recently completed match.
 *
 * A missing (undefined) condition is treated as 'always' — omitting unlockCondition
 * on a node means the node is unconditionally accessible.
 *
 * Condition semantics:
 * - undefined / 'always' — always true
 * - 'humanWon'           — true only when outcome is non-null and humanWon is true
 * - 'visitedNode'        — true when nodeId is present in progress.visitedNodeIds
 * - 'matchesPlayed'      — true when progress.matchHistory.length >= minimum;
 *                          if called from advanceStory this count already includes
 *                          the current match (see advanceStory implementation)
 */
export function evaluateUnlockCondition(
  condition: UnlockCondition | undefined,
  progress: StoryProgress,
  outcome: MatchOutcome | null,
): boolean {
  if (condition === undefined) return true;
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

// ─── Story view model ────────────────────────────────────────────────────────

/**
 * A read-only snapshot of the current story state, ready for the UI layer to render.
 * Produced by buildStoryViewModel; the UI must not directly read StoryProgress or
 * StoryDefinition.
 */
export interface StoryViewModel {
  readonly storyId: string;
  readonly currentNode: StoryNode;
  readonly isComplete: boolean;
  readonly visitedNodeIds: ReadonlyArray<string>;
  readonly matchHistory: ReadonlyArray<MatchOutcome>;
}

/**
 * Derives a StoryViewModel from the current progress and story definition.
 * Returns null if currentNodeId is not found in the definition (defensive guard).
 */
export function buildStoryViewModel(
  progress: StoryProgress,
  definition: StoryDefinition,
): StoryViewModel | null {
  const currentNode = findStoryNode(definition, progress.currentNodeId);
  if (currentNode === null) return null;
  return {
    storyId: progress.storyId,
    currentNode,
    isComplete: currentNode.type === 'end',
    visitedNodeIds: progress.visitedNodeIds,
    matchHistory: progress.matchHistory,
  };
}

// ─── Progression ─────────────────────────────────────────────────────────────

/**
 * Advances StoryProgress by one step and returns the updated progress.
 *
 * Advancement rules by current node type:
 * - 'dialogue' : advance to next[0] (linear; next must be non-empty)
 * - 'match'    : append outcome to matchHistory, then pick the first candidate
 *                in next[] whose unlockCondition is satisfied; if no candidate
 *                qualifies, stay on the match node but still record the outcome
 * - 'choice'   : advance to the choice whose choiceId matches the provided
 *                choiceId argument, if that choice's unlockCondition is met
 * - 'end'      : terminal; return unchanged
 *
 * The current node is always added to visitedNodeIds when any state update occurs.
 * For 'matchesPlayed' conditions on next-node candidates, the updated matchHistory
 * (including the current outcome) is used during evaluation.
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
  const currentNode = findStoryNode(definition, progress.currentNodeId);

  // Node not found in definition, or already at a terminal node: no-op
  if (currentNode === null || currentNode.type === 'end') {
    return progress;
  }

  // Mark current node as visited (deduplicated)
  const nextVisitedNodeIds: ReadonlyArray<string> = progress.visitedNodeIds.includes(
    currentNode.nodeId,
  )
    ? progress.visitedNodeIds
    : [...progress.visitedNodeIds, currentNode.nodeId];

  // Append match outcome when leaving a match node
  const nextMatchHistory: ReadonlyArray<MatchOutcome> =
    currentNode.type === 'match' && outcome !== null
      ? [...progress.matchHistory, outcome]
      : progress.matchHistory;

  // Progress snapshot used when evaluating next-node conditions.
  // Using the post-update state ensures 'matchesPlayed' counts the current match.
  const progressForEval: StoryProgress = {
    storyId: progress.storyId,
    currentNodeId: progress.currentNodeId,
    visitedNodeIds: nextVisitedNodeIds,
    matchHistory: nextMatchHistory,
  };

  let nextNodeId: StoryNodeId | undefined;

  if (currentNode.type === 'dialogue') {
    // Linear flow: advance to the first listed next node
    nextNodeId = currentNode.next[0];
  } else if (currentNode.type === 'match') {
    // Pick the first candidate whose unlock condition is satisfied
    for (const candidateId of currentNode.next) {
      const candidate = findStoryNode(definition, candidateId);
      if (candidate === null) continue;
      if (evaluateUnlockCondition(candidate.unlockCondition, progressForEval, outcome)) {
        nextNodeId = candidateId;
        break;
      }
    }
  } else if (currentNode.type === 'choice') {
    // Advance to the chosen option's target if its condition is met
    const chosen = currentNode.choices.find((c) => c.choiceId === choiceId);
    if (chosen !== undefined) {
      if (evaluateUnlockCondition(chosen.unlockCondition, progressForEval, null)) {
        nextNodeId = chosen.nextNodeId;
      }
    }
  }

  if (nextNodeId === undefined) {
    // Match node special case: record the outcome even when no advancement was possible,
    // so replay attempts are tracked in matchHistory and matchesPlayed conditions update.
    if (currentNode.type === 'match' && outcome !== null) {
      return {
        storyId: progress.storyId,
        currentNodeId: progress.currentNodeId,
        visitedNodeIds: nextVisitedNodeIds,
        matchHistory: nextMatchHistory,
      };
    }
    return progress;
  }

  return {
    storyId: progress.storyId,
    currentNodeId: nextNodeId,
    visitedNodeIds: nextVisitedNodeIds,
    matchHistory: nextMatchHistory,
  };
}
