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
