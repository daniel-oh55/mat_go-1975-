import { describe, it, expect } from 'vitest';
import { validateGameState, assertValidGameState } from './stateValidation.js';
import { newGame } from './newGame.js';
import { SeededRandomProvider } from '../rng/seededRandomProvider.js';
import { createDefaultDeck } from '../cards/deck.js';
import type { GameState } from './gameState.js';
import type { EnginePlayer } from './gameState.js';

const PLAYER_1: EnginePlayer = { id: 'p1', kind: 'human' };
const PLAYER_2: EnginePlayer = { id: 'p2', kind: 'ai' };
const PLAYERS = [PLAYER_1, PLAYER_2] as const;

function freshState() {
  return newGame({ players: PLAYERS, randomProvider: new SeededRandomProvider(42) });
}

describe('validateGameState', () => {
  it('returns valid for a fresh newGame state', () => {
    const result = validateGameState(freshState());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects incorrect total card count', () => {
    const state = freshState();
    // Remove one card from drawPile
    const trimmed: GameState = {
      ...state,
      drawPile: state.drawPile.slice(0, -1),
    };
    const result = validateGameState(trimmed);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Total card count'))).toBe(true);
  });

  it('detects duplicate card in two zones', () => {
    const state = freshState();
    const extraCard = state.drawPile[0]!;
    // Add the same card to field as well
    const withDuplicate: GameState = {
      ...state,
      fieldCards: [...state.fieldCards, extraCard],
    };
    const result = validateGameState(withDuplicate);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate card'))).toBe(true);
  });

  it('detects missing playerHands entry', () => {
    const state = freshState();
    const withoutP1Hand: GameState = {
      ...state,
      playerHands: { p2: state.playerHands['p2']! },
    };
    const result = validateGameState(withoutP1Hand);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('playerHands missing'))).toBe(true);
  });

  it('detects missing capturedCards entry', () => {
    const state = freshState();
    const withoutP2Captured: GameState = {
      ...state,
      capturedCards: { p1: state.capturedCards['p1']! },
    };
    const result = validateGameState(withoutP2Captured);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('capturedCards missing'))).toBe(true);
  });

  it('detects invalid currentTurn', () => {
    const state = freshState();
    const withBadTurn: GameState = {
      ...state,
      currentTurn: 'unknown-player',
    };
    const result = validateGameState(withBadTurn);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('currentTurn'))).toBe(true);
  });

  it('detects missing scoreState entry', () => {
    const state = freshState();
    const withoutScore: GameState = {
      ...state,
      scoreState: { p2: state.scoreState['p2']! },
    };
    const result = validateGameState(withoutScore);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('scoreState missing'))).toBe(true);
  });

  it('detects missing goStopState entry', () => {
    const state = freshState();
    const withoutGoStop: GameState = {
      ...state,
      goStopState: { p2: state.goStopState['p2']! },
    };
    const result = validateGameState(withoutGoStop);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('goStopState missing'))).toBe(true);
  });

  it('accumulates multiple errors', () => {
    const state = freshState();
    const broken: GameState = {
      ...state,
      drawPile: state.drawPile.slice(0, -2), // 2 missing cards
      currentTurn: 'nobody',
    };
    const result = validateGameState(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe('validateGameState — phase/pendingDecision consistency', () => {
  it('detects duplicate player IDs', () => {
    const state = freshState();
    const duplicatePlayers = [state.players[0]!, state.players[0]!];
    const broken: GameState = { ...state, players: duplicatePlayers };
    const result = validateGameState(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate player IDs'))).toBe(true);
  });

  it('detects pendingGoStop phase with null pendingDecision', () => {
    const state = freshState();
    const broken: GameState = {
      ...state,
      phase: 'pendingGoStop',
      pendingDecision: null,
    };
    const result = validateGameState(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('pendingGoStop'))).toBe(true);
  });

  it('detects playing phase with non-null pendingDecision', () => {
    const state = freshState();
    const broken: GameState = {
      ...state,
      phase: 'playing',
      pendingDecision: { type: 'goStop', playerId: 'p1' },
    };
    const result = validateGameState(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('"playing"'))).toBe(true);
  });
});

describe('validateGameState — finalResult/phase consistency', () => {
  it('detects ended phase with null finalResult', () => {
    const state = freshState();
    const broken: GameState = {
      ...state,
      phase: 'ended',
      pendingDecision: null,
      finalResult: null,
    };
    const result = validateGameState(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('finalResult'))).toBe(true);
  });

  it('detects playing phase with non-null finalResult', () => {
    const state = freshState();
    const broken: GameState = {
      ...state,
      phase: 'playing',
      finalResult: { winner: 'p1', scores: state.scoreState, reason: 'stop' },
    };
    const result = validateGameState(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('finalResult'))).toBe(true);
  });

  it('detects pendingGoStop phase with non-null finalResult', () => {
    const state = freshState();
    const broken: GameState = {
      ...state,
      phase: 'pendingGoStop',
      pendingDecision: { type: 'goStop', playerId: 'p1' },
      finalResult: { winner: 'p1', scores: state.scoreState, reason: 'stop' },
    };
    const result = validateGameState(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('finalResult'))).toBe(true);
  });

  it('accepts ended phase with a valid FinalResult (draw)', () => {
    const state = freshState();
    const ended: GameState = {
      ...state,
      phase: 'ended',
      pendingDecision: null,
      finalResult: { winner: null, scores: state.scoreState, reason: 'stop' },
    };
    const result = validateGameState(ended);
    expect(result.valid).toBe(true);
  });
});

describe('validateGameState — turnCount and goCount invariants', () => {
  it('detects negative turnCount', () => {
    const state = freshState();
    const broken: GameState = { ...state, turnCount: -1 };
    const result = validateGameState(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('turnCount'))).toBe(true);
  });

  it('accepts turnCount of 0', () => {
    const state = freshState();
    expect(validateGameState({ ...state, turnCount: 0 }).valid).toBe(true);
  });

  it('detects negative goCount for a player', () => {
    const state = freshState();
    const broken: GameState = {
      ...state,
      goStopState: { p1: { goCount: -1 }, p2: state.goStopState['p2']! },
    };
    const result = validateGameState(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('goCount'))).toBe(true);
  });

  it('accepts goCount of 0', () => {
    const state = freshState();
    expect(validateGameState(state).valid).toBe(true);
  });
});

describe('validateGameState — finalResult scores and winner consistency', () => {
  const ZERO_SCORE = { total: 0, gwang: 0, yeol: 0, tti: 0, pi: 0 };
  const HIGH_SCORE = { total: 5, gwang: 3, yeol: 2, tti: 0, pi: 0 };

  function endedState(overrides: Partial<GameState>): GameState {
    const base = freshState();
    return {
      ...base,
      phase: 'ended',
      pendingDecision: null,
      ...overrides,
    };
  }

  it('accepts ended state with winner null when scores are equal', () => {
    const state = endedState({
      finalResult: { winner: null, scores: { p1: ZERO_SCORE, p2: ZERO_SCORE }, reason: 'stop' },
      scoreState: { p1: ZERO_SCORE, p2: ZERO_SCORE },
    });
    expect(validateGameState(state).valid).toBe(true);
  });

  it('accepts ended state with winner whose score is strictly higher', () => {
    const state = endedState({
      scoreState: { p1: HIGH_SCORE, p2: ZERO_SCORE },
      finalResult: { winner: 'p1', scores: { p1: HIGH_SCORE, p2: ZERO_SCORE }, reason: 'stop' },
    });
    expect(validateGameState(state).valid).toBe(true);
  });

  it('detects finalResult.scores.total mismatch with scoreState.total', () => {
    const state = endedState({
      scoreState: { p1: ZERO_SCORE, p2: ZERO_SCORE },
      finalResult: { winner: null, scores: { p1: HIGH_SCORE, p2: ZERO_SCORE }, reason: 'stop' },
    });
    const result = validateGameState(state);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('finalResult.scores.total'))).toBe(true);
  });

  it('detects finalResult.winner with equal scores (tie should be null)', () => {
    const state = endedState({
      scoreState: { p1: ZERO_SCORE, p2: ZERO_SCORE },
      finalResult: { winner: 'p1', scores: { p1: ZERO_SCORE, p2: ZERO_SCORE }, reason: 'stop' },
    });
    const result = validateGameState(state);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('finalResult.winner'))).toBe(true);
  });

  it('detects finalResult.winner with lower score than opponent', () => {
    const state = endedState({
      scoreState: { p1: ZERO_SCORE, p2: HIGH_SCORE },
      finalResult: { winner: 'p1', scores: { p1: ZERO_SCORE, p2: HIGH_SCORE }, reason: 'stop' },
    });
    const result = validateGameState(state);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('finalResult.winner'))).toBe(true);
  });

  it('detects finalResult.scores missing an entry', () => {
    const state = endedState({
      scoreState: { p1: ZERO_SCORE, p2: ZERO_SCORE },
      finalResult: {
        winner: null,
        scores: { p1: ZERO_SCORE } as Readonly<Record<string, typeof ZERO_SCORE>>,
        reason: 'stop',
      },
    });
    const result = validateGameState(state);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('finalResult.scores missing'))).toBe(true);
  });
});

describe('assertValidGameState', () => {
  it('does not throw for a valid state', () => {
    expect(() => assertValidGameState(freshState())).not.toThrow();
  });

  it('throws with error details for an invalid state', () => {
    const state = freshState();
    const invalid: GameState = {
      ...state,
      currentTurn: 'ghost',
    };
    expect(() => assertValidGameState(invalid)).toThrow('Invalid GameState');
  });

  it('message includes the specific error', () => {
    const state = freshState();
    const invalid: GameState = {
      ...state,
      currentTurn: 'ghost',
    };
    try {
      assertValidGameState(invalid);
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as Error).message).toContain('currentTurn');
    }
  });
});
