import { describe, it, expect } from 'vitest';
import { getLegalActions } from './legalActions.js';
import { newGame } from '../state/newGame.js';
import { SeededRandomProvider } from '../rng/seededRandomProvider.js';
import type { EnginePlayer, GameState } from '../state/gameState.js';
import type { PendingGoStopDecision } from '../state/gameState.js';

const HUMAN: EnginePlayer = { id: 'h1', kind: 'human' };
const AI: EnginePlayer = { id: 'ai1', kind: 'ai' };

function freshState(seed = 42) {
  return newGame({ players: [HUMAN, AI], randomProvider: new SeededRandomProvider(seed) });
}

describe('getLegalActions', () => {
  describe('playing phase — human turn', () => {
    it('newGame starts in playing phase', () => {
      expect(freshState().phase).toBe('playing');
    });

    it('returns PLAY_CARD actions equal to current player hand size', () => {
      const state = freshState();
      const actions = getLegalActions(state);
      expect(actions).toHaveLength(10); // initialHandCount = 10
      expect(actions.every((a) => a.type === 'PLAY_CARD')).toBe(true);
    });

    it('each PLAY_CARD cardId is in the current player hand', () => {
      const state = freshState();
      const handIds = new Set(state.playerHands['h1']!.map((c) => c.id));
      const actions = getLegalActions(state);
      for (const a of actions) {
        expect(a.type).toBe('PLAY_CARD');
        if (a.type === 'PLAY_CARD') {
          expect(handIds.has(a.cardId)).toBe(true);
        }
      }
    });

    it('opponent hand cards are NOT included in legal actions', () => {
      const state = freshState();
      const opponentIds = new Set(state.playerHands['ai1']!.map((c) => c.id));
      const actions = getLegalActions(state);
      for (const a of actions) {
        if (a.type === 'PLAY_CARD') {
          expect(opponentIds.has(a.cardId)).toBe(false);
        }
      }
    });

    it('has no duplicate cardIds in legal actions', () => {
      const state = freshState();
      const actions = getLegalActions(state);
      const ids = actions
        .filter((a) => a.type === 'PLAY_CARD')
        .map((a) => (a.type === 'PLAY_CARD' ? a.cardId : ''));
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('playing phase — AI turn', () => {
    it('returns AI_PLAY_CARD when currentTurn is an AI player', () => {
      const base = freshState();
      const aiTurnState: GameState = { ...base, currentTurn: 'ai1' };
      const actions = getLegalActions(aiTurnState);
      expect(actions).toHaveLength(10);
      expect(actions.every((a) => a.type === 'AI_PLAY_CARD')).toBe(true);
    });

    it('each AI_PLAY_CARD cardId is in the AI player hand', () => {
      const base = freshState();
      const aiTurnState: GameState = { ...base, currentTurn: 'ai1' };
      const aiHandIds = new Set(base.playerHands['ai1']!.map((c) => c.id));
      const actions = getLegalActions(aiTurnState);
      for (const a of actions) {
        if (a.type === 'AI_PLAY_CARD') {
          expect(aiHandIds.has(a.cardId)).toBe(true);
        }
      }
    });
  });

  describe('pendingGoStop phase', () => {
    function pendingState(): GameState {
      const base = freshState();
      const decision: PendingGoStopDecision = { type: 'goStop', playerId: 'h1' };
      return { ...base, phase: 'pendingGoStop', pendingDecision: decision };
    }

    it('returns only CHOOSE_GO and CHOOSE_STOP', () => {
      const actions = getLegalActions(pendingState());
      const types = actions.map((a) => a.type).sort();
      expect(types).toEqual(['CHOOSE_GO', 'CHOOSE_STOP'].sort());
    });

    it('returns exactly 2 actions', () => {
      expect(getLegalActions(pendingState())).toHaveLength(2);
    });

    it('returns empty array when pendingDecision is null (defensive)', () => {
      const base = freshState();
      const broken: GameState = {
        ...base,
        phase: 'pendingGoStop',
        pendingDecision: null,
      };
      expect(getLegalActions(broken)).toHaveLength(0);
    });
  });

  describe('ended phase', () => {
    it('returns empty array', () => {
      const ended: GameState = { ...freshState(), phase: 'ended' };
      expect(getLegalActions(ended)).toHaveLength(0);
    });
  });

  describe('ready phase', () => {
    it('returns empty array (not used in MVP)', () => {
      const ready: GameState = { ...freshState(), phase: 'ready' };
      expect(getLegalActions(ready)).toHaveLength(0);
    });
  });
});
