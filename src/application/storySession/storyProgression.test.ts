import { describe, it, expect } from 'vitest';
import {
  evaluateUnlockCondition,
  advanceStory,
  findStoryNode,
  getCandidateNextNodeIds,
  buildStoryViewModel,
} from './storyProgression.js';
import type { StoryProgress, MatchOutcome, StoryDefinition } from './storyTypes.js';

// ─── Shared fixtures ────────────────────────────────────────────────────────

function makeProgress(
  currentNodeId: string,
  visitedNodeIds: string[] = [],
  matchHistory: MatchOutcome[] = [],
): StoryProgress {
  return { storyId: 'test-01', currentNodeId, visitedNodeIds, matchHistory };
}

const winOutcome: MatchOutcome = { humanWon: true, humanFinalScore: 7, aiFinalScore: 3 };
const loseOutcome: MatchOutcome = { humanWon: false, humanFinalScore: 2, aiFinalScore: 5 };

/**
 * Minimal test definition covering all four node types:
 *   dia-1 → match-1 → end-win (humanWon) | end-default (always)
 *   choice-1 → dia-1 (choice c1) | end-default (choice c2)
 */
const testDef: StoryDefinition = {
  storyId: 'test-01',
  startNodeId: 'dia-1',
  nodes: [
    {
      nodeId: 'dia-1',
      type: 'dialogue',
      dialogue: [],
      next: ['match-1'],
    },
    {
      nodeId: 'match-1',
      type: 'match',
      matchContext: { npcId: 'npc-1', regionId: 'reg-1' },
      next: ['end-win', 'end-default'],
    },
    {
      nodeId: 'end-win',
      type: 'end',
      unlockCondition: { type: 'humanWon' },
    },
    {
      nodeId: 'end-default',
      type: 'end',
      unlockCondition: { type: 'always' },
    },
    {
      nodeId: 'choice-1',
      type: 'choice',
      choices: [
        { choiceId: 'c1', label: 'Option A', nextNodeId: 'dia-1' },
        { choiceId: 'c2', label: 'Option B', nextNodeId: 'end-default' },
      ],
    },
  ],
};

// ─── findStoryNode ───────────────────────────────────────────────────────────

describe('findStoryNode', () => {
  it('returns the node when nodeId exists in the definition', () => {
    const node = findStoryNode(testDef, 'dia-1');
    expect(node).not.toBeNull();
    expect(node?.nodeId).toBe('dia-1');
    expect(node?.type).toBe('dialogue');
  });

  it('returns null when nodeId does not exist in the definition', () => {
    expect(findStoryNode(testDef, 'does-not-exist')).toBeNull();
  });
});

// ─── getCandidateNextNodeIds ─────────────────────────────────────────────────

describe('getCandidateNextNodeIds', () => {
  it('returns next[] for a dialogue node', () => {
    const node = findStoryNode(testDef, 'dia-1');
    expect(node).not.toBeNull();
    expect(getCandidateNextNodeIds(node!)).toEqual(['match-1']);
  });

  it('returns next[] for a match node', () => {
    const node = findStoryNode(testDef, 'match-1');
    expect(node).not.toBeNull();
    expect(getCandidateNextNodeIds(node!)).toEqual(['end-win', 'end-default']);
  });

  it('returns all choice nextNodeIds for a choice node', () => {
    const node = findStoryNode(testDef, 'choice-1');
    expect(node).not.toBeNull();
    expect(getCandidateNextNodeIds(node!)).toEqual(['dia-1', 'end-default']);
  });

  it('returns an empty array for an end node', () => {
    const node = findStoryNode(testDef, 'end-win');
    expect(node).not.toBeNull();
    expect(getCandidateNextNodeIds(node!)).toEqual([]);
  });
});

// ─── evaluateUnlockCondition ─────────────────────────────────────────────────

describe('evaluateUnlockCondition', () => {
  const emptyProgress = makeProgress('dia-1');

  it('undefined condition is treated as always-true', () => {
    expect(evaluateUnlockCondition(undefined, emptyProgress, null)).toBe(true);
    expect(evaluateUnlockCondition(undefined, emptyProgress, winOutcome)).toBe(true);
  });

  it("'always' is always true regardless of outcome", () => {
    expect(evaluateUnlockCondition({ type: 'always' }, emptyProgress, null)).toBe(true);
    expect(evaluateUnlockCondition({ type: 'always' }, emptyProgress, winOutcome)).toBe(true);
    expect(evaluateUnlockCondition({ type: 'always' }, emptyProgress, loseOutcome)).toBe(true);
  });

  it("'humanWon' is true when outcome.humanWon is true", () => {
    expect(evaluateUnlockCondition({ type: 'humanWon' }, emptyProgress, winOutcome)).toBe(true);
  });

  it("'humanWon' is false when outcome.humanWon is false", () => {
    expect(evaluateUnlockCondition({ type: 'humanWon' }, emptyProgress, loseOutcome)).toBe(false);
  });

  it("'humanWon' is false when outcome is null", () => {
    expect(evaluateUnlockCondition({ type: 'humanWon' }, emptyProgress, null)).toBe(false);
  });

  it("'visitedNode' is true when the node ID is in visitedNodeIds", () => {
    const progress = makeProgress('dia-1', ['intro', 'match-1']);
    expect(
      evaluateUnlockCondition({ type: 'visitedNode', nodeId: 'match-1' }, progress, null),
    ).toBe(true);
  });

  it("'visitedNode' is false when the node ID is not in visitedNodeIds", () => {
    const progress = makeProgress('dia-1', ['intro']);
    expect(
      evaluateUnlockCondition({ type: 'visitedNode', nodeId: 'match-1' }, progress, null),
    ).toBe(false);
  });

  it("'matchesPlayed minimum:0' is true with empty history", () => {
    expect(
      evaluateUnlockCondition({ type: 'matchesPlayed', minimum: 0 }, emptyProgress, null),
    ).toBe(true);
  });

  it("'matchesPlayed minimum:1' is false with empty history", () => {
    expect(
      evaluateUnlockCondition({ type: 'matchesPlayed', minimum: 1 }, emptyProgress, null),
    ).toBe(false);
  });

  it("'matchesPlayed minimum:1' is true with one recorded match", () => {
    const progress = makeProgress('dia-1', [], [winOutcome]);
    expect(
      evaluateUnlockCondition({ type: 'matchesPlayed', minimum: 1 }, progress, null),
    ).toBe(true);
  });

  it("'matchesPlayed minimum:2' is false with one recorded match", () => {
    const progress = makeProgress('dia-1', [], [winOutcome]);
    expect(
      evaluateUnlockCondition({ type: 'matchesPlayed', minimum: 2 }, progress, null),
    ).toBe(false);
  });
});

// ─── buildStoryViewModel ─────────────────────────────────────────────────────

describe('buildStoryViewModel', () => {
  it('returns a view model for a valid current node', () => {
    const progress = makeProgress('dia-1', ['prev'], [winOutcome]);
    const vm = buildStoryViewModel(progress, testDef);
    expect(vm).not.toBeNull();
    expect(vm?.storyId).toBe('test-01');
    expect(vm?.currentNode.nodeId).toBe('dia-1');
    expect(vm?.currentNode.type).toBe('dialogue');
    expect(vm?.isComplete).toBe(false);
    expect(vm?.visitedNodeIds).toEqual(['prev']);
    expect(vm?.matchHistory).toEqual([winOutcome]);
  });

  it('returns null when currentNodeId is not found in the definition', () => {
    const progress = makeProgress('ghost-node');
    expect(buildStoryViewModel(progress, testDef)).toBeNull();
  });

  it('sets isComplete to true when the current node is an end node', () => {
    const progress = makeProgress('end-win');
    const vm = buildStoryViewModel(progress, testDef);
    expect(vm?.isComplete).toBe(true);
  });

  it('sets isComplete to false for non-end nodes', () => {
    const progress = makeProgress('match-1');
    const vm = buildStoryViewModel(progress, testDef);
    expect(vm?.isComplete).toBe(false);
  });
});

// ─── advanceStory ────────────────────────────────────────────────────────────

describe('advanceStory', () => {
  it('returns unchanged when current node is not found in definition', () => {
    const progress = makeProgress('unknown-node');
    const result = advanceStory(progress, null, testDef);
    expect(result).toBe(progress);
  });

  it('returns unchanged when current node is an end node', () => {
    const progress = makeProgress('end-win');
    const result = advanceStory(progress, winOutcome, testDef);
    expect(result).toBe(progress);
  });

  it('advances from a dialogue node to the first next node', () => {
    const progress = makeProgress('dia-1');
    const result = advanceStory(progress, null, testDef);
    expect(result.currentNodeId).toBe('match-1');
  });

  it('marks the current node as visited when advancing from a dialogue node', () => {
    const progress = makeProgress('dia-1');
    const result = advanceStory(progress, null, testDef);
    expect(result.visitedNodeIds).toContain('dia-1');
  });

  it('does not duplicate visitedNodeIds when the node was already visited', () => {
    const progress = makeProgress('dia-1', ['dia-1']);
    const result = advanceStory(progress, null, testDef);
    const count = result.visitedNodeIds.filter((id) => id === 'dia-1').length;
    expect(count).toBe(1);
  });

  it('advances from a match node to the humanWon candidate when human won', () => {
    const progress = makeProgress('match-1');
    const result = advanceStory(progress, winOutcome, testDef);
    expect(result.currentNodeId).toBe('end-win');
  });

  it('advances from a match node to the always-fallback candidate when human lost', () => {
    const progress = makeProgress('match-1');
    const result = advanceStory(progress, loseOutcome, testDef);
    expect(result.currentNodeId).toBe('end-default');
  });

  it('appends the outcome to matchHistory when advancing from a match node', () => {
    const progress = makeProgress('match-1');
    const result = advanceStory(progress, winOutcome, testDef);
    expect(result.matchHistory.length).toBe(1);
    expect(result.matchHistory[0]).toEqual(winOutcome);
  });

  it('does not append to matchHistory when advancing from a non-match node', () => {
    const progress = makeProgress('dia-1', [], [winOutcome]);
    const result = advanceStory(progress, null, testDef);
    expect(result.matchHistory.length).toBe(1);
  });

  it('records outcome in matchHistory even when no eligible next candidate exists', () => {
    // All next nodes require humanWon, but human lost — no advancement possible.
    // The match outcome must still be recorded for matchHistory tracking.
    const noFallbackDef: StoryDefinition = {
      storyId: 'test-02',
      startNodeId: 'match-1',
      nodes: [
        {
          nodeId: 'match-1',
          type: 'match',
          matchContext: { npcId: 'npc-1', regionId: 'reg-1' },
          next: ['end-win-only'],
        },
        { nodeId: 'end-win-only', type: 'end', unlockCondition: { type: 'humanWon' } },
      ],
    };
    const progress = makeProgress('match-1');
    const result = advanceStory(progress, loseOutcome, noFallbackDef);
    // Stay on same node
    expect(result.currentNodeId).toBe('match-1');
    // But outcome is recorded
    expect(result.matchHistory.length).toBe(1);
    expect(result.matchHistory[0]).toEqual(loseOutcome);
    // Not the same object reference
    expect(result).not.toBe(progress);
  });

  it('advances from a choice node when a matching choiceId is provided', () => {
    const progress = makeProgress('choice-1');
    const result = advanceStory(progress, null, testDef, 'c1');
    expect(result.currentNodeId).toBe('dia-1');
  });

  it('returns unchanged from a choice node when choiceId does not match any choice', () => {
    const progress = makeProgress('choice-1');
    const result = advanceStory(progress, null, testDef, 'nonexistent');
    expect(result).toBe(progress);
  });

  it('returns unchanged from a choice node when no choiceId is provided', () => {
    const progress = makeProgress('choice-1');
    const result = advanceStory(progress, null, testDef);
    expect(result).toBe(progress);
  });

  it('includes the current match in matchHistory when evaluating matchesPlayed conditions', () => {
    // Definition where next node requires matchesPlayed minimum:1.
    // Empty history before this call — advanceStory must count the current match.
    const matchesPlayedDef: StoryDefinition = {
      storyId: 'test-03',
      startNodeId: 'match-1',
      nodes: [
        {
          nodeId: 'match-1',
          type: 'match',
          matchContext: { npcId: 'npc-1', regionId: 'reg-1' },
          next: ['gated-end'],
        },
        {
          nodeId: 'gated-end',
          type: 'end',
          unlockCondition: { type: 'matchesPlayed', minimum: 1 },
        },
      ],
    };
    const progress = makeProgress('match-1');
    const result = advanceStory(progress, winOutcome, matchesPlayedDef);
    expect(result.currentNodeId).toBe('gated-end');
  });
});
