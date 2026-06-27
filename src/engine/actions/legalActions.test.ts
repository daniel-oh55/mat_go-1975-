import { describe, it, expect } from 'vitest';
import { getLegalActions } from './legalActions.js';
import { newGame } from '../state/newGame.js';
import { SeededRandomProvider } from '../rng/seededRandomProvider.js';
import { createDefaultDeck } from '../cards/deck.js';
import { defaultRuleset } from '../types/ruleset.js';
import type { Card } from '../types/card.js';
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

    it('every hand card has at least one PLAY_CARD action', () => {
      const state = freshState();
      const hand = state.playerHands['h1']!;
      const actions = getLegalActions(state).filter((a) => a.type === 'PLAY_CARD');
      for (const card of hand) {
        const hasAction = actions.some((a) => a.type === 'PLAY_CARD' && a.cardId === card.id);
        expect(hasAction).toBe(true);
      }
    });

    it('all PLAY_CARD cardIds reference hand cards', () => {
      const state = freshState();
      const handIds = new Set(state.playerHands['h1']!.map((c) => c.id));
      const actions = getLegalActions(state);
      for (const a of actions) {
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

    it('card with 0/1 field matches produces exactly 1 action (no targetFieldCardId)', () => {
      const state = freshState();
      const hand = state.playerHands['h1']!;
      // Find any hand card with ≤1 same-group field card
      const simpleCard = hand.find(
        (c) => state.fieldCards.filter((f) => f.matchingGroup === c.matchingGroup).length < 2,
      );
      expect(simpleCard).toBeDefined();
      const actions = getLegalActions(state).filter(
        (a) => a.type === 'PLAY_CARD' && a.cardId === simpleCard!.id,
      );
      expect(actions).toHaveLength(1);
      if (actions[0]?.type === 'PLAY_CARD') {
        expect(actions[0].targetFieldCardId).toBeUndefined();
      }
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

// ─── Multi-match (targetFieldCardId) tests ────────────────────────────────────

const deckForMulti = createDefaultDeck();
const m1Cards = deckForMulti.filter((c) => c.month === 1);
const m2Cards = deckForMulti.filter((c) => c.month === 2);
const [m1a, m1b, m1c] = [m1Cards[0]!, m1Cards[1]!, m1Cards[2]!];
const [m2a, m3a, m4a, m5a, m6a, m7a, m8a, m9a, m10a, m11a] = [
  m2Cards[0]!,
  deckForMulti.filter((c) => c.month === 3)[0]!,
  deckForMulti.filter((c) => c.month === 4)[0]!,
  deckForMulti.filter((c) => c.month === 5)[0]!,
  deckForMulti.filter((c) => c.month === 6)[0]!,
  deckForMulti.filter((c) => c.month === 7)[0]!,
  deckForMulti.filter((c) => c.month === 8)[0]!,
  deckForMulti.filter((c) => c.month === 9)[0]!,
  deckForMulti.filter((c) => c.month === 10)[0]!,
  deckForMulti.filter((c) => c.month === 11)[0]!,
];

function buildMultiMatchState(
  p1Hand: Card[],
  fieldCards: Card[],
  currentTurn = 'h1',
): GameState {
  const usedIds = new Set([...p1Hand, ...fieldCards].map((c) => c.id));
  const drawPile = deckForMulti.filter((c) => !usedIds.has(c.id));
  const remaining = drawPile.slice(0, 10); // AI hand
  const actualDrawPile = drawPile.slice(10);
  return {
    players: [HUMAN, AI],
    currentTurn,
    phase: 'playing',
    drawPile: actualDrawPile,
    fieldCards,
    playerHands: { [HUMAN.id]: p1Hand, [AI.id]: remaining },
    capturedCards: { [HUMAN.id]: [], [AI.id]: [] },
    scoreState: {
      [HUMAN.id]: { total: 0, gwang: 0, yeol: 0, tti: 0, pi: 0 },
      [AI.id]: { total: 0, gwang: 0, yeol: 0, tti: 0, pi: 0 },
    },
    goStopState: { [HUMAN.id]: { goCount: 0 }, [AI.id]: { goCount: 0 } },
    pendingDecision: null,
    turnCount: 0,
    ruleset: defaultRuleset,
  };
}

describe('getLegalActions — multi-match targetFieldCardId', () => {
  it('card with 0 field matches produces 1 action, no targetFieldCardId', () => {
    // m1a in hand, no month-1 cards on field
    const state = buildMultiMatchState(
      [m1a, m2a, m3a, m4a, m5a, m6a, m7a, m8a, m9a, m10a],
      [m1Cards[3]!], // only m1d on field — wait, that IS a match...
    );
    // Actually use a field with no m1 cards
    const state2 = buildMultiMatchState(
      [m1a, m2a, m3a, m4a, m5a, m6a, m7a, m8a, m9a, m10a],
      [m2Cards[1]!, m2Cards[2]!, m2Cards[3]!, deckForMulti.filter(c => c.month === 3)[1]!,
       deckForMulti.filter(c => c.month === 4)[1]!, deckForMulti.filter(c => c.month === 5)[1]!,
       deckForMulti.filter(c => c.month === 6)[1]!, deckForMulti.filter(c => c.month === 7)[1]!],
    );
    const actions = getLegalActions(state2).filter(
      (a) => a.type === 'PLAY_CARD' && a.cardId === m1a.id,
    );
    expect(actions).toHaveLength(1);
    if (actions[0]?.type === 'PLAY_CARD') {
      expect(actions[0].targetFieldCardId).toBeUndefined();
    }
  });

  it('card with 2 field matches produces 2 actions with distinct targetFieldCardIds', () => {
    // m1a in hand, m1b and m1c both on field
    const state = buildMultiMatchState(
      [m1a, m2a, m3a, m4a, m5a, m6a, m7a, m8a, m9a, m10a],
      [m1b, m1c, deckForMulti.filter(c => c.month === 4)[1]!,
       deckForMulti.filter(c => c.month === 5)[1]!, deckForMulti.filter(c => c.month === 6)[1]!,
       deckForMulti.filter(c => c.month === 7)[1]!, deckForMulti.filter(c => c.month === 8)[1]!,
       deckForMulti.filter(c => c.month === 9)[1]!],
    );
    const actions = getLegalActions(state).filter(
      (a) => a.type === 'PLAY_CARD' && a.cardId === m1a.id,
    );
    expect(actions).toHaveLength(2);
    const targets = actions.map((a) => (a.type === 'PLAY_CARD' ? a.targetFieldCardId : undefined));
    expect(targets).toContain(m1b.id);
    expect(targets).toContain(m1c.id);
  });

  it('AI card with 2 field matches produces 2 AI_PLAY_CARD actions', () => {
    // Setup: field has m1a (month1[0]) and m1_3 (month1[3]) — 2 month-1 cards.
    // p1Hand (HUMAN) uses months 3–12 first cards so does NOT include month-1.
    // Then remaining deck cards go to AI hand: m1b (m01-tti, index 1) and
    // m1c (m01-pi-1, index 2) land in AI hand first since m01-gwang and m01-pi-2 are on field.
    const m1_3 = m1Cards[3]!;
    const humanHand = [
      deckForMulti.filter(c => c.month === 3)[0]!, deckForMulti.filter(c => c.month === 4)[0]!,
      deckForMulti.filter(c => c.month === 5)[0]!, deckForMulti.filter(c => c.month === 6)[0]!,
      deckForMulti.filter(c => c.month === 7)[0]!, deckForMulti.filter(c => c.month === 8)[0]!,
      deckForMulti.filter(c => c.month === 9)[0]!, deckForMulti.filter(c => c.month === 10)[0]!,
      deckForMulti.filter(c => c.month === 11)[0]!, deckForMulti.filter(c => c.month === 12)[0]!,
    ];
    const fieldCards = [
      m1a, m1_3,
      deckForMulti.filter(c => c.month === 3)[1]!, deckForMulti.filter(c => c.month === 4)[1]!,
      deckForMulti.filter(c => c.month === 5)[1]!, deckForMulti.filter(c => c.month === 6)[1]!,
      deckForMulti.filter(c => c.month === 7)[1]!, deckForMulti.filter(c => c.month === 8)[1]!,
    ];
    const state = buildMultiMatchState(humanHand, fieldCards, AI.id);
    // AI hand = remaining cards from deck in order: m01-tti (m1b), m01-pi-1 (m1c), then month-2 cards...
    const actions = getLegalActions(state).filter(
      (a) => a.type === 'AI_PLAY_CARD' && a.cardId === m1b.id,
    );
    expect(actions).toHaveLength(2);
    const targets = actions.map(a => a.type === 'AI_PLAY_CARD' ? a.targetFieldCardId : undefined);
    expect(targets).toContain(m1a.id);
    expect(targets).toContain(m1_3.id);
  });
});
