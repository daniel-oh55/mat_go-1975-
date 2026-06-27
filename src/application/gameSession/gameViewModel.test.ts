import { describe, it, expect } from 'vitest';
import { SeededRandomProvider } from '../../engine/rng/seededRandomProvider.js';
import { newGame } from '../../engine/state/newGame.js';
import { buildGameViewModel } from './gameViewModel.js';

const HUMAN_ID = 'human';
const AI_ID = 'ai';

function freshState(seed = 42) {
  return newGame({
    players: [
      { id: HUMAN_ID, kind: 'human' },
      { id: AI_ID, kind: 'ai' },
    ],
    randomProvider: new SeededRandomProvider(seed),
  });
}

describe('buildGameViewModel — card counts', () => {
  it('humanHand has 10 cards at game start', () => {
    const vm = buildGameViewModel(freshState(), HUMAN_ID, AI_ID);
    expect(vm.humanHand).toHaveLength(10);
  });

  it('aiHandCount is 10 at game start', () => {
    const vm = buildGameViewModel(freshState(), HUMAN_ID, AI_ID);
    expect(vm.aiHandCount).toBe(10);
  });

  it('drawPileCount is 20 at game start', () => {
    const vm = buildGameViewModel(freshState(), HUMAN_ID, AI_ID);
    expect(vm.drawPileCount).toBe(20);
  });

  it('fieldCards has 8 cards at game start', () => {
    const vm = buildGameViewModel(freshState(), HUMAN_ID, AI_ID);
    expect(vm.fieldCards).toHaveLength(8);
  });
});

describe('buildGameViewModel — scores', () => {
  it('humanScore starts at 0', () => {
    const vm = buildGameViewModel(freshState(), HUMAN_ID, AI_ID);
    expect(vm.humanScore).toBe(0);
  });

  it('aiScore starts at 0', () => {
    const vm = buildGameViewModel(freshState(), HUMAN_ID, AI_ID);
    expect(vm.aiScore).toBe(0);
  });
});

describe('buildGameViewModel — turn state', () => {
  it('isHumanTurn is true when currentTurn is human', () => {
    const state = freshState(); // human always goes first
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    expect(vm.isHumanTurn).toBe(true);
    expect(vm.currentTurn).toBe('human');
  });

  it('isHumanTurn is false when currentTurn is AI', () => {
    const state = { ...freshState(), currentTurn: AI_ID };
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    expect(vm.isHumanTurn).toBe(false);
    expect(vm.currentTurn).toBe('ai');
  });
});

describe('buildGameViewModel — legal actions', () => {
  it('legalCardIds is non-empty when it is the human turn', () => {
    const state = freshState(); // human goes first
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    expect(vm.legalCardIds.size).toBeGreaterThan(0);
  });

  it('legalPlayActions is non-empty when it is the human turn', () => {
    const state = freshState();
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    expect(vm.legalPlayActions.length).toBeGreaterThan(0);
  });

  it('every legalPlayAction cardId is in legalCardIds', () => {
    const state = freshState();
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    for (const action of vm.legalPlayActions) {
      expect(vm.legalCardIds.has(action.cardId)).toBe(true);
    }
  });

  it('legalCardIds is empty when it is the AI turn', () => {
    const state = { ...freshState(), currentTurn: AI_ID };
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    expect(vm.legalCardIds.size).toBe(0);
  });

  it('legalPlayActions is empty when it is the AI turn', () => {
    const state = { ...freshState(), currentTurn: AI_ID };
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    expect(vm.legalPlayActions).toHaveLength(0);
  });
});

describe('buildGameViewModel — pendingGoStop', () => {
  it('isPendingGoStopDecisionForHuman is false at game start', () => {
    const vm = buildGameViewModel(freshState(), HUMAN_ID, AI_ID);
    expect(vm.isPendingGoStopDecisionForHuman).toBe(false);
  });

  it('isPendingGoStopDecisionForHuman is true when human has pending decision', () => {
    const state = {
      ...freshState(),
      phase: 'pendingGoStop' as const,
      pendingDecision: { type: 'goStop' as const, playerId: HUMAN_ID },
    };
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    expect(vm.isPendingGoStopDecisionForHuman).toBe(true);
  });

  it('isPendingGoStopDecisionForHuman is false when AI has pending decision', () => {
    const state = {
      ...freshState(),
      phase: 'pendingGoStop' as const,
      pendingDecision: { type: 'goStop' as const, playerId: AI_ID },
    };
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    expect(vm.isPendingGoStopDecisionForHuman).toBe(false);
  });
});

describe('buildGameViewModel — phase and finalResult', () => {
  it('phase is "playing" at game start', () => {
    const vm = buildGameViewModel(freshState(), HUMAN_ID, AI_ID);
    expect(vm.phase).toBe('playing');
  });

  it('finalResult is null at game start', () => {
    const vm = buildGameViewModel(freshState(), HUMAN_ID, AI_ID);
    expect(vm.finalResult).toBeNull();
  });
});
