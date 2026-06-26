import { describe, it, expect } from 'vitest';
import { validateAction } from './actionValidation.js';
import { newGame } from '../state/newGame.js';
import { SeededRandomProvider } from '../rng/seededRandomProvider.js';
import type { EnginePlayer, GameState } from '../state/gameState.js';
import type { PendingGoStopDecision } from '../state/gameState.js';

const HUMAN: EnginePlayer = { id: 'h1', kind: 'human' };
const AI: EnginePlayer = { id: 'ai1', kind: 'ai' };

function freshState(seed = 42) {
  return newGame({ players: [HUMAN, AI], randomProvider: new SeededRandomProvider(seed) });
}

describe('validateAction', () => {
  describe('playing phase — human turn', () => {
    it('returns valid for a card in current player hand', () => {
      const state = freshState();
      const cardId = state.playerHands['h1']![0]!.id;
      const result = validateAction(state, { type: 'PLAY_CARD', cardId });
      expect(result.valid).toBe(true);
    });

    it('returns invalid for a card in opponent hand', () => {
      const state = freshState();
      const opponentCardId = state.playerHands['ai1']![0]!.id;
      const result = validateAction(state, { type: 'PLAY_CARD', cardId: opponentCardId });
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('returns invalid for a non-existent cardId', () => {
      const state = freshState();
      const result = validateAction(state, { type: 'PLAY_CARD', cardId: 'card-does-not-exist' });
      expect(result.valid).toBe(false);
    });

    it('returns invalid for AI_PLAY_CARD when current player is human', () => {
      const state = freshState();
      const cardId = state.playerHands['h1']![0]!.id;
      const result = validateAction(state, { type: 'AI_PLAY_CARD', cardId });
      expect(result.valid).toBe(false);
    });

    it('returns invalid for CHOOSE_GO in playing phase', () => {
      const state = freshState();
      const result = validateAction(state, { type: 'CHOOSE_GO' });
      expect(result.valid).toBe(false);
    });

    it('returns invalid for CHOOSE_STOP in playing phase', () => {
      const state = freshState();
      const result = validateAction(state, { type: 'CHOOSE_STOP' });
      expect(result.valid).toBe(false);
    });

    it('includes a reason string when invalid', () => {
      const state = freshState();
      const result = validateAction(state, { type: 'CHOOSE_GO' });
      expect(result.valid).toBe(false);
      expect(typeof result.reason).toBe('string');
    });
  });

  describe('playing phase — AI turn', () => {
    it('returns valid for AI_PLAY_CARD when current player is AI', () => {
      const base = freshState();
      const aiState: GameState = { ...base, currentTurn: 'ai1' };
      const cardId = base.playerHands['ai1']![0]!.id;
      const result = validateAction(aiState, { type: 'AI_PLAY_CARD', cardId });
      expect(result.valid).toBe(true);
    });

    it('returns invalid for PLAY_CARD when current player is AI', () => {
      const base = freshState();
      const aiState: GameState = { ...base, currentTurn: 'ai1' };
      const cardId = base.playerHands['ai1']![0]!.id;
      const result = validateAction(aiState, { type: 'PLAY_CARD', cardId });
      expect(result.valid).toBe(false);
    });
  });

  describe('pendingGoStop phase', () => {
    function pendingState(): GameState {
      const base = freshState();
      const decision: PendingGoStopDecision = { type: 'goStop', playerId: 'h1' };
      return { ...base, phase: 'pendingGoStop', pendingDecision: decision };
    }

    it('returns valid for CHOOSE_GO', () => {
      expect(validateAction(pendingState(), { type: 'CHOOSE_GO' }).valid).toBe(true);
    });

    it('returns valid for CHOOSE_STOP', () => {
      expect(validateAction(pendingState(), { type: 'CHOOSE_STOP' }).valid).toBe(true);
    });

    it('returns invalid for PLAY_CARD in pendingGoStop', () => {
      const state = pendingState();
      const cardId = state.playerHands['h1']![0]!.id;
      const result = validateAction(state, { type: 'PLAY_CARD', cardId });
      expect(result.valid).toBe(false);
    });

    it('returns invalid for AI_PLAY_CARD in pendingGoStop', () => {
      const state = pendingState();
      const cardId = state.playerHands['h1']![0]!.id;
      const result = validateAction(state, { type: 'AI_PLAY_CARD', cardId });
      expect(result.valid).toBe(false);
    });
  });

  describe('ended phase', () => {
    it('returns invalid for PLAY_CARD when game ended', () => {
      const state: GameState = { ...freshState(), phase: 'ended' };
      const cardId = state.playerHands['h1']![0]!.id;
      expect(validateAction(state, { type: 'PLAY_CARD', cardId }).valid).toBe(false);
    });

    it('returns invalid for CHOOSE_GO when game ended', () => {
      const state: GameState = { ...freshState(), phase: 'ended' };
      expect(validateAction(state, { type: 'CHOOSE_GO' }).valid).toBe(false);
    });

    it('returns invalid for CHOOSE_STOP when game ended', () => {
      const state: GameState = { ...freshState(), phase: 'ended' };
      expect(validateAction(state, { type: 'CHOOSE_STOP' }).valid).toBe(false);
    });

    it('reason mentions ended phase', () => {
      const state: GameState = { ...freshState(), phase: 'ended' };
      const result = validateAction(state, { type: 'CHOOSE_GO' });
      expect(result.reason).toContain('ended');
    });
  });
});
