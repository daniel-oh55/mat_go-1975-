import { describe, it, expect } from 'vitest';
import { newGame } from './newGame.js';
import { SeededRandomProvider } from '../rng/seededRandomProvider.js';
import { defaultRuleset } from '../types/ruleset.js';
import type { EnginePlayer } from './gameState.js';

const PLAYER_1: EnginePlayer = { id: 'p1', kind: 'human' };
const PLAYER_2: EnginePlayer = { id: 'p2', kind: 'ai' };
const PLAYERS = [PLAYER_1, PLAYER_2] as const;

function makeState(seed = 42) {
  return newGame({ players: PLAYERS, randomProvider: new SeededRandomProvider(seed) });
}

describe('newGame', () => {
  describe('initial card distribution', () => {
    it('player 1 hand has 10 cards', () => {
      const state = makeState();
      expect(state.playerHands['p1']).toHaveLength(10);
    });

    it('player 2 hand has 10 cards', () => {
      const state = makeState();
      expect(state.playerHands['p2']).toHaveLength(10);
    });

    it('field has 8 cards', () => {
      const state = makeState();
      expect(state.fieldCards).toHaveLength(8);
    });

    it('draw pile has 20 cards', () => {
      const state = makeState();
      expect(state.drawPile).toHaveLength(20);
    });

    it('total cards across all zones equals 48', () => {
      const state = makeState();
      const total =
        state.playerHands['p1']!.length +
        state.playerHands['p2']!.length +
        state.fieldCards.length +
        state.drawPile.length;
      expect(total).toBe(48);
    });

    it('no card appears in two zones (no duplicates)', () => {
      const state = makeState();
      const ids = [
        ...state.playerHands['p1']!.map((c) => c.id),
        ...state.playerHands['p2']!.map((c) => c.id),
        ...state.fieldCards.map((c) => c.id),
        ...state.drawPile.map((c) => c.id),
      ];
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(48);
    });

    it('captured cards are empty for all players', () => {
      const state = makeState();
      expect(state.capturedCards['p1']).toHaveLength(0);
      expect(state.capturedCards['p2']).toHaveLength(0);
    });
  });

  describe('initial state shape', () => {
    it('phase is "ready"', () => {
      expect(makeState().phase).toBe('ready');
    });

    it('currentTurn is player 1 id', () => {
      expect(makeState().currentTurn).toBe('p1');
    });

    it('turnCount is 0', () => {
      expect(makeState().turnCount).toBe(0);
    });

    it('pendingDecision is null', () => {
      expect(makeState().pendingDecision).toBeNull();
    });

    it('scores are all 0', () => {
      const state = makeState();
      expect(state.scoreState['p1']?.total).toBe(0);
      expect(state.scoreState['p2']?.total).toBe(0);
    });

    it('goCount is 0 for all players', () => {
      const state = makeState();
      expect(state.goStopState['p1']?.goCount).toBe(0);
      expect(state.goStopState['p2']?.goCount).toBe(0);
    });

    it('players array matches config', () => {
      const state = makeState();
      expect(state.players).toHaveLength(2);
      expect(state.players[0]?.id).toBe('p1');
      expect(state.players[1]?.id).toBe('p2');
    });

    it('uses defaultRuleset when none provided', () => {
      const state = makeState();
      expect(state.ruleset).toEqual(defaultRuleset);
    });

    it('respects a custom ruleset', () => {
      const custom = { ...defaultRuleset, goStopThreshold: 5 };
      const state = newGame({
        players: PLAYERS,
        ruleset: custom,
        randomProvider: new SeededRandomProvider(1),
      });
      expect(state.ruleset.goStopThreshold).toBe(5);
    });
  });

  describe('deterministic seeding', () => {
    it('same seed produces identical card distribution', () => {
      const s1 = makeState(123);
      const s2 = makeState(123);
      expect(s1.playerHands['p1']!.map((c) => c.id)).toEqual(
        s2.playerHands['p1']!.map((c) => c.id),
      );
      expect(s1.drawPile.map((c) => c.id)).toEqual(s2.drawPile.map((c) => c.id));
    });

    it('different seeds produce different distributions', () => {
      const s1 = makeState(1);
      const s2 = makeState(2);
      // Statistically impossible for 48-card shuffle to match
      expect(s1.playerHands['p1']!.map((c) => c.id)).not.toEqual(
        s2.playerHands['p1']!.map((c) => c.id),
      );
    });
  });

  describe('validation', () => {
    it('throws if players array is not exactly 2', () => {
      expect(() =>
        newGame({
          players: [PLAYER_1],
          randomProvider: new SeededRandomProvider(1),
        }),
      ).toThrow('exactly 2 players');
    });
  });
});
