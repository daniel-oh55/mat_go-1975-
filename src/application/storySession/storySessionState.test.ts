import { describe, it, expect } from 'vitest';
import {
  createInitialStoryProgress,
  createStorySession,
  continueStorySession,
  requestStoryMatch,
  completeStoryMatch,
  selectStoryChoice,
} from './storySessionState.js';
import type { StorySessionState } from './storySessionState.js';
import { sampleStory } from '../../content/stories/sample/sampleStory.js';
import type {
  StoryDefinition,
  DialogueStoryNode,
  MatchStoryNode,
  ChoiceStoryNode,
  EndStoryNode,
  MatchOutcome,
} from './storyTypes.js';

// sampleStory (dialogue -> match -> end) has no choice node, so this local
// fixture exercises selectStoryChoice without touching production content.
const choiceIntro: DialogueStoryNode = {
  nodeId: 'choice-intro',
  type: 'dialogue',
  dialogue: [{ speakerId: 'narrator', text: 'intro' }],
  next: ['choice-fork'],
};

const fork: ChoiceStoryNode = {
  nodeId: 'choice-fork',
  type: 'choice',
  choices: [
    { choiceId: 'left', label: 'Go left', nextNodeId: 'choice-end-left' },
    { choiceId: 'right', label: 'Go right', nextNodeId: 'choice-end-right' },
  ],
};

const endLeft: EndStoryNode = { nodeId: 'choice-end-left', type: 'end' };
const endRight: EndStoryNode = { nodeId: 'choice-end-right', type: 'end' };

const choiceStory: StoryDefinition = {
  storyId: 'choice-story-01',
  startNodeId: 'choice-intro',
  nodes: [choiceIntro, fork, endLeft, endRight],
};

function winOutcome(): MatchOutcome {
  return { humanWon: true, humanFinalScore: 10, aiFinalScore: 2 };
}

function loseOutcome(): MatchOutcome {
  return { humanWon: false, humanFinalScore: 2, aiFinalScore: 10 };
}

function snapshot(state: StorySessionState): unknown {
  return JSON.parse(JSON.stringify(state));
}

describe('createInitialStoryProgress', () => {
  it('sets storyId from definition.storyId', () => {
    expect(createInitialStoryProgress(sampleStory).storyId).toBe(sampleStory.storyId);
  });

  it('sets currentNodeId from definition.startNodeId', () => {
    expect(createInitialStoryProgress(sampleStory).currentNodeId).toBe(sampleStory.startNodeId);
  });

  it('starts with an empty visitedNodeIds array', () => {
    expect(createInitialStoryProgress(sampleStory).visitedNodeIds).toEqual([]);
  });

  it('starts with an empty matchHistory array', () => {
    expect(createInitialStoryProgress(sampleStory).matchHistory).toEqual([]);
  });

  it('does not mutate the definition', () => {
    const before = JSON.parse(JSON.stringify(sampleStory));
    createInitialStoryProgress(sampleStory);
    expect(sampleStory).toEqual(before);
  });
});

describe('createStorySession', () => {
  it('sets status "story" when the start node is a dialogue node', () => {
    expect(createStorySession(sampleStory).status).toBe('story');
  });

  it('sets status "completed" when the start node is an end node', () => {
    const endOnly: StoryDefinition = {
      storyId: 'end-only',
      startNodeId: 'only-end',
      nodes: [{ nodeId: 'only-end', type: 'end' }],
    };
    expect(createStorySession(endOnly).status).toBe('completed');
  });

  it('builds a non-null viewModel pointing at the start node', () => {
    const session = createStorySession(sampleStory);
    expect(session.viewModel).not.toBeNull();
    expect(session.viewModel?.currentNodeId).toBe(sampleStory.startNodeId);
  });

  it('does not store the StoryDefinition on the state', () => {
    const session = createStorySession(sampleStory) as unknown as Record<string, unknown>;
    expect(session.definition).toBeUndefined();
    expect(session.storyDefinition).toBeUndefined();
  });

  it('does not store a GameState on the state', () => {
    const session = createStorySession(sampleStory) as unknown as Record<string, unknown>;
    expect(session.gameState).toBeUndefined();
  });

  it('returns invalid status, null viewModel, and a non-null error for an unresolvable startNodeId', () => {
    const broken: StoryDefinition = {
      storyId: 'broken',
      startNodeId: 'does-not-exist',
      nodes: [{ nodeId: 'only-end', type: 'end' }],
    };
    const session = createStorySession(broken);
    expect(session.status).toBe('invalid');
    expect(session.viewModel).toBeNull();
    expect(session.error).not.toBeNull();
  });
});

describe('continueStorySession', () => {
  it('advances a dialogue node to its next node', () => {
    const session = createStorySession(sampleStory);
    const next = continueStorySession(session, sampleStory);
    expect(next.progress.currentNodeId).toBe('sample-match-01');
    expect(next.status).toBe('story');
  });

  it('adds the dialogue node to visitedNodeIds', () => {
    const session = createStorySession(sampleStory);
    const next = continueStorySession(session, sampleStory);
    expect(next.progress.visitedNodeIds).toContain('sample-intro');
  });

  it('does not mutate the input state', () => {
    const session = createStorySession(sampleStory);
    const before = snapshot(session);
    continueStorySession(session, sampleStory);
    expect(session).toEqual(before);
  });

  it('does not advance a non-dialogue node and reports an error', () => {
    const session = createStorySession(sampleStory);
    const atMatch = continueStorySession(session, sampleStory); // now on the match node
    const attempted = continueStorySession(atMatch, sampleStory);
    expect(attempted.progress.currentNodeId).toBe(atMatch.progress.currentNodeId);
    expect(attempted.error).not.toBeNull();
  });
});

function atMatchNode(): StorySessionState {
  const session = createStorySession(sampleStory);
  return continueStorySession(session, sampleStory);
}

describe('requestStoryMatch', () => {
  it('sets status to matchRequested on a match node', () => {
    expect(requestStoryMatch(atMatchNode()).status).toBe('matchRequested');
  });

  it('exposes the current node matchContext as pendingMatchContext', () => {
    const matchState = atMatchNode();
    const matchNode = matchState.viewModel!.currentNode as MatchStoryNode;
    const requested = requestStoryMatch(matchState);
    expect(requested.pendingMatchContext).toEqual(matchNode.matchContext);
  });

  it('does not change progress', () => {
    const matchState = atMatchNode();
    const requested = requestStoryMatch(matchState);
    expect(requested.progress).toEqual(matchState.progress);
  });

  it('does not create a GameState', () => {
    const requested = requestStoryMatch(atMatchNode()) as unknown as Record<string, unknown>;
    expect(requested.gameState).toBeUndefined();
  });

  it('reports an error when called on a non-match node', () => {
    const dialogueState = createStorySession(sampleStory);
    const attempted = requestStoryMatch(dialogueState);
    expect(attempted.status).not.toBe('matchRequested');
    expect(attempted.error).not.toBeNull();
  });
});

function requestedMatchState(): StorySessionState {
  return requestStoryMatch(atMatchNode());
}

describe('completeStoryMatch', () => {
  it('records the outcome in matchHistory', () => {
    const completed = completeStoryMatch(requestedMatchState(), sampleStory, winOutcome());
    expect(completed.progress.matchHistory).toHaveLength(1);
    expect(completed.progress.matchHistory[0]).toEqual(winOutcome());
  });

  it('advances to the win end node on a winning outcome', () => {
    const completed = completeStoryMatch(requestedMatchState(), sampleStory, winOutcome());
    expect(completed.progress.currentNodeId).toBe('sample-end-win');
    expect(completed.status).toBe('completed');
  });

  it('advances to the default end node on a losing outcome', () => {
    const completed = completeStoryMatch(requestedMatchState(), sampleStory, loseOutcome());
    expect(completed.progress.currentNodeId).toBe('sample-end-default');
    expect(completed.status).toBe('completed');
  });

  it('clears pendingMatchContext after completion', () => {
    const completed = completeStoryMatch(requestedMatchState(), sampleStory, winOutcome());
    expect(completed.pendingMatchContext).toBeNull();
  });

  it('does not mutate the input state', () => {
    const requested = requestedMatchState();
    const before = snapshot(requested);
    completeStoryMatch(requested, sampleStory, winOutcome());
    expect(requested).toEqual(before);
  });

  it('reports an error when called while status is not matchRequested', () => {
    const dialogueState = createStorySession(sampleStory);
    const attempted = completeStoryMatch(dialogueState, sampleStory, winOutcome());
    expect(attempted.error).not.toBeNull();
  });
});

describe('selectStoryChoice', () => {
  function atChoiceNode(): StorySessionState {
    const session = createStorySession(choiceStory);
    return continueStorySession(session, choiceStory);
  }

  it('advances to the chosen node', () => {
    const next = selectStoryChoice(atChoiceNode(), choiceStory, 'left');
    expect(next.progress.currentNodeId).toBe('choice-end-left');
    expect(next.status).toBe('completed');
  });

  it('advances to a different node for a different choice', () => {
    const next = selectStoryChoice(atChoiceNode(), choiceStory, 'right');
    expect(next.progress.currentNodeId).toBe('choice-end-right');
  });

  it('does not advance for an unmatched choiceId (mirrors advanceStory no-op)', () => {
    const state = atChoiceNode();
    const next = selectStoryChoice(state, choiceStory, 'does-not-exist');
    expect(next.progress.currentNodeId).toBe(state.progress.currentNodeId);
    expect(next.error).toBeNull();
  });

  it('does not mutate the input state', () => {
    const state = atChoiceNode();
    const before = snapshot(state);
    selectStoryChoice(state, choiceStory, 'left');
    expect(state).toEqual(before);
  });
});
