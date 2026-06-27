import { describe, it, expect } from 'vitest';
import { selectBasicAiAction } from './basicAi.js';
import { newGame } from '../state/newGame.js';
import { SeededRandomProvider } from '../rng/seededRandomProvider.js';
import { getLegalActions } from '../actions/legalActions.js';
import { validateAction } from '../actions/actionValidation.js';
import { applyAction } from '../actions/applyAction.js';
import type { EnginePlayer, GameState } from '../state/gameState.js';
import type { PendingGoStopDecision } from '../state/gameState.js';

const HUMAN: EnginePlayer = { id: 'h1', kind: 'human' };
const AI: EnginePlayer = { id: 'ai1', kind: 'ai' };

/** AI is player-1, so currentTurn starts at AI.id from a fresh game. */
function freshAiTurnState(seed = 42): GameState {
  return newGame({ players: [AI, HUMAN], randomProvider: new SeededRandomProvider(seed) });
}

/** Human-first state (currentTurn = HUMAN.id). */
function freshHumanTurnState(seed = 42): GameState {
  return newGame({ players: [HUMAN, AI], randomProvider: new SeededRandomProvider(seed) });
}

/** pendingGoStop state with AI as the deciding player. */
function pendingGoStopState(gameSeed = 42): GameState {
  const base = freshAiTurnState(gameSeed);
  const decision: PendingGoStopDecision = { type: 'goStop', playerId: AI.id };
  return { ...base, phase: 'pendingGoStop', pendingDecision: decision };
}

// ─── playing phase — AI turn ──────────────────────────────────────────────────

describe('selectBasicAiAction — playing phase (AI turn)', () => {
  it('returns success', () => {
    const state = freshAiTurnState();
    const result = selectBasicAiAction(state, new SeededRandomProvider(1));
    expect(result.success).toBe(true);
  });

  it('returned action type is AI_PLAY_CARD (not PLAY_CARD)', () => {
    const state = freshAiTurnState();
    const result = selectBasicAiAction(state, new SeededRandomProvider(1));
    if (!result.success) throw new Error('Expected success');
    expect(result.action.type).toBe('AI_PLAY_CARD');
  });

  it('returned action is in the legal action set', () => {
    const state = freshAiTurnState();
    const result = selectBasicAiAction(state, new SeededRandomProvider(5));
    if (!result.success) throw new Error('Expected success');
    const legalActions = getLegalActions(state);
    const found = legalActions.some(
      (a) => JSON.stringify(a) === JSON.stringify(result.action),
    );
    expect(found).toBe(true);
  });

  it('returned action passes validateAction check', () => {
    const state = freshAiTurnState();
    const result = selectBasicAiAction(state, new SeededRandomProvider(3));
    if (!result.success) throw new Error('Expected success');
    expect(validateAction(state, result.action).valid).toBe(true);
  });

  it('returned action cardId is in the AI hand', () => {
    const state = freshAiTurnState();
    const result = selectBasicAiAction(state, new SeededRandomProvider(7));
    if (!result.success) throw new Error('Expected success');
    if (result.action.type !== 'AI_PLAY_CARD') throw new Error('Expected AI_PLAY_CARD');
    const aiHandIds = (state.playerHands[AI.id] ?? []).map((c) => c.id);
    expect(aiHandIds).toContain(result.action.cardId);
  });

  it('selected action can be applied to produce a valid next state', () => {
    const state = freshAiTurnState();
    const result = selectBasicAiAction(state, new SeededRandomProvider(2));
    if (!result.success) throw new Error('Expected success');
    const applied = applyAction(state, result.action);
    expect(applied.success).toBe(true);
  });

  it('returned action does NOT reference an opponent hand card', () => {
    const state = freshAiTurnState();
    const result = selectBasicAiAction(state, new SeededRandomProvider(9));
    if (!result.success) throw new Error('Expected success');
    if (result.action.type !== 'AI_PLAY_CARD') throw new Error('Expected AI_PLAY_CARD');
    const humanHandIds = new Set((state.playerHands[HUMAN.id] ?? []).map((c) => c.id));
    expect(humanHandIds.has(result.action.cardId)).toBe(false);
  });
});

// ─── pendingGoStop phase — AI Go/Stop decision ────────────────────────────────

describe('selectBasicAiAction — pendingGoStop phase', () => {
  it('returns success', () => {
    const state = pendingGoStopState();
    const result = selectBasicAiAction(state, new SeededRandomProvider(1));
    expect(result.success).toBe(true);
  });

  it('always returns CHOOSE_STOP, never CHOOSE_GO', () => {
    // Run multiple seeds to confirm conservative default is constant
    for (const seed of [0, 1, 2, 3, 42, 99, 999, 12345]) {
      const state = pendingGoStopState(seed % 50);
      const result = selectBasicAiAction(state, new SeededRandomProvider(seed));
      if (!result.success) throw new Error(`Expected success for seed ${seed}`);
      expect(result.action.type).toBe('CHOOSE_STOP');
    }
  });

  it('CHOOSE_STOP passes validateAction check', () => {
    const state = pendingGoStopState();
    const result = selectBasicAiAction(state, new SeededRandomProvider(1));
    if (!result.success) throw new Error('Expected success');
    expect(validateAction(state, result.action).valid).toBe(true);
  });

  it('CHOOSE_STOP can be applied to produce a valid ended state', () => {
    const state = pendingGoStopState();
    const result = selectBasicAiAction(state, new SeededRandomProvider(1));
    if (!result.success) throw new Error('Expected success');
    const applied = applyAction(state, result.action);
    if (!applied.success) throw new Error('Expected applyAction success');
    expect(applied.state.phase).toBe('ended');
  });
});

// ─── ended phase ──────────────────────────────────────────────────────────────

describe('selectBasicAiAction — ended phase', () => {
  it('returns failure when game is ended', () => {
    const base = freshAiTurnState();
    const endedState: GameState = {
      ...base,
      phase: 'ended',
      pendingDecision: null,
      finalResult: { winner: null, scores: base.scoreState, reason: 'stop' },
    };
    const result = selectBasicAiAction(endedState, new SeededRandomProvider(1));
    expect(result.success).toBe(false);
  });

  it('failure reason mentions the phase', () => {
    const base = freshAiTurnState();
    const endedState: GameState = {
      ...base,
      phase: 'ended',
      pendingDecision: null,
      finalResult: { winner: null, scores: base.scoreState, reason: 'stop' },
    };
    const result = selectBasicAiAction(endedState, new SeededRandomProvider(1));
    if (result.success) throw new Error('Expected failure');
    expect(result.reason).toContain('ended');
  });
});

// ─── ready phase ──────────────────────────────────────────────────────────────

describe('selectBasicAiAction — ready phase (not used in MVP)', () => {
  it('returns failure when phase is ready', () => {
    const readyState: GameState = { ...freshAiTurnState(), phase: 'ready' };
    const result = selectBasicAiAction(readyState, new SeededRandomProvider(1));
    expect(result.success).toBe(false);
  });

  it('failure reason mentions the phase', () => {
    const readyState: GameState = { ...freshAiTurnState(), phase: 'ready' };
    const result = selectBasicAiAction(readyState, new SeededRandomProvider(1));
    if (result.success) throw new Error('Expected failure');
    expect(result.reason).toContain('ready');
  });
});

// ─── determinism ─────────────────────────────────────────────────────────────

describe('selectBasicAiAction — determinism', () => {
  it('same seed produces the same action', () => {
    const state = freshAiTurnState(42);
    const r1 = selectBasicAiAction(state, new SeededRandomProvider(7));
    const r2 = selectBasicAiAction(state, new SeededRandomProvider(7));
    if (!r1.success || !r2.success) throw new Error('Expected success');
    expect(r1.action).toEqual(r2.action);
  });

  it('different seeds produce different selections (statistical)', () => {
    // 10 cards in hand → 10 distinct AI_PLAY_CARD actions.
    // With 20 seeds, the probability that all select the same card is (1/10)^19 ≈ 0.
    const state = freshAiTurnState(42);
    const selections = new Set<string>();
    for (let seed = 0; seed < 20; seed++) {
      const result = selectBasicAiAction(state, new SeededRandomProvider(seed));
      if (result.success) selections.add(JSON.stringify(result.action));
    }
    expect(selections.size).toBeGreaterThan(1);
  });
});

// ─── human-turn state — AI does not generate PLAY_CARD actions ────────────────
//
// The AI selector is a pure function and does not check player kind itself.
// When called on a human-turn state, getLegalActions returns PLAY_CARD actions.
// This verifies the selector faithfully returns legal actions even in that case —
// enforcing that it's the caller's responsibility to only invoke AI on AI turns.

describe('selectBasicAiAction — called on human-turn state (caller responsibility)', () => {
  it('returns a PLAY_CARD action (since those are the legal ones on human turn)', () => {
    const state = freshHumanTurnState();
    const result = selectBasicAiAction(state, new SeededRandomProvider(1));
    if (!result.success) throw new Error('Expected success');
    expect(result.action.type).toBe('PLAY_CARD');
  });
});
