import { describe, it, expect } from 'vitest';
import { validateAction } from './actionValidation.js';
import { newGame } from '../state/newGame.js';
import { SeededRandomProvider } from '../rng/seededRandomProvider.js';
import { createDefaultDeck } from '../cards/deck.js';
import { defaultRuleset } from '../types/ruleset.js';
import type { EnginePlayer, GameState } from '../state/gameState.js';
import type { PendingGoStopDecision } from '../state/gameState.js';

const HUMAN: EnginePlayer = { id: 'h1', kind: 'human' };
const AI: EnginePlayer = { id: 'ai1', kind: 'ai' };

function freshState(seed = 42) {
  return newGame({ players: [HUMAN, AI], randomProvider: new SeededRandomProvider(seed) });
}

describe('validateAction', () => {
  describe('playing phase — human turn', () => {
    it('returns valid for a hand card with 0/1 field matches (no target needed)', () => {
      const state = freshState();
      const hand = state.playerHands['h1']!;
      // Find a card with at most 1 same-group field card so no targetFieldCardId needed
      const simpleCard = hand.find(
        (c) => state.fieldCards.filter((f) => f.matchingGroup === c.matchingGroup).length < 2,
      )!;
      const result = validateAction(state, { type: 'PLAY_CARD', cardId: simpleCard.id });
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

// ─── targetFieldCardId comparison tests ────────────────────────────────────────

const deckForTarget = createDefaultDeck();
const HUMAN2: EnginePlayer = { id: 'h2', kind: 'human' };
const AI2: EnginePlayer = { id: 'ai2', kind: 'ai' };

const m1t = deckForTarget.filter((c) => c.month === 1);
const m2t = deckForTarget.filter((c) => c.month === 2);
const [t_m1a, t_m1b, t_m1c] = [m1t[0]!, m1t[1]!, m1t[2]!];
const [t_m2a] = [m2t[0]!];

function buildTargetState(p1Hand: typeof m1t, fieldCards: typeof m1t): GameState {
  const usedIds = new Set([...p1Hand, ...fieldCards].map((c) => c.id));
  const remaining = deckForTarget.filter((c) => !usedIds.has(c.id));
  const ai2Hand = remaining.slice(0, 10);
  const drawPile = remaining.slice(10);
  return {
    players: [HUMAN2, AI2],
    currentTurn: HUMAN2.id,
    phase: 'playing',
    drawPile,
    fieldCards,
    playerHands: { [HUMAN2.id]: p1Hand, [AI2.id]: ai2Hand },
    capturedCards: { [HUMAN2.id]: [], [AI2.id]: [] },
    scoreState: {
      [HUMAN2.id]: { total: 0, gwang: 0, yeol: 0, tti: 0, pi: 0 },
      [AI2.id]: { total: 0, gwang: 0, yeol: 0, tti: 0, pi: 0 },
    },
    goStopState: { [HUMAN2.id]: { goCount: 0 }, [AI2.id]: { goCount: 0 } },
    pendingDecision: null,
    finalResult: null,
    turnCount: 0,
    ruleset: defaultRuleset,
  };
}

describe('validateAction — targetFieldCardId comparison', () => {
  it('valid when card has 0/1 field match and no targetFieldCardId', () => {
    // t_m1a in hand, no month-1 on field
    const state = buildTargetState(
      [t_m1a, ...deckForTarget.filter(c => c.month >= 4).slice(0, 9)],
      [t_m2a, ...deckForTarget.filter(c => c.month >= 5).slice(0, 7)],
    );
    const result = validateAction(state, { type: 'PLAY_CARD', cardId: t_m1a.id });
    expect(result.valid).toBe(true);
  });

  it('invalid when card has 2 field matches but targetFieldCardId is missing', () => {
    const state = buildTargetState(
      [t_m1a, ...deckForTarget.filter(c => c.month >= 4).slice(0, 9)],
      [t_m1b, t_m1c, ...deckForTarget.filter(c => c.month >= 5).slice(0, 6)],
    );
    const result = validateAction(state, { type: 'PLAY_CARD', cardId: t_m1a.id });
    expect(result.valid).toBe(false);
  });

  it('invalid when targetFieldCardId is an invalid field card', () => {
    const state = buildTargetState(
      [t_m1a, ...deckForTarget.filter(c => c.month >= 4).slice(0, 9)],
      [t_m1b, t_m1c, ...deckForTarget.filter(c => c.month >= 5).slice(0, 6)],
    );
    const result = validateAction(state, {
      type: 'PLAY_CARD',
      cardId: t_m1a.id,
      targetFieldCardId: t_m2a.id,
    });
    expect(result.valid).toBe(false);
  });

  it('valid when targetFieldCardId matches one of the legal targets', () => {
    const state = buildTargetState(
      [t_m1a, ...deckForTarget.filter(c => c.month >= 4).slice(0, 9)],
      [t_m1b, t_m1c, ...deckForTarget.filter(c => c.month >= 5).slice(0, 6)],
    );
    const result = validateAction(state, {
      type: 'PLAY_CARD',
      cardId: t_m1a.id,
      targetFieldCardId: t_m1b.id,
    });
    expect(result.valid).toBe(true);
  });

  it('invalid when targetFieldCardId is provided for a 0-match card (unnecessary)', () => {
    const state = buildTargetState(
      [t_m1a, ...deckForTarget.filter(c => c.month >= 4).slice(0, 9)],
      [t_m2a, ...deckForTarget.filter(c => c.month >= 5).slice(0, 7)],
    );
    // Legal action has no targetFieldCardId, but we submit one
    const result = validateAction(state, {
      type: 'PLAY_CARD',
      cardId: t_m1a.id,
      targetFieldCardId: t_m2a.id,
    });
    expect(result.valid).toBe(false);
  });
});
