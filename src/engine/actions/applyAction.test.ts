import { describe, it, expect } from 'vitest';
import { applyAction } from './applyAction.js';
import { calculateScore } from '../scoring/scoring.js';
import { createDefaultDeck } from '../cards/deck.js';
import { defaultRuleset } from '../types/ruleset.js';
import type { Card } from '../types/card.js';
import type { EnginePlayer, GameState } from '../state/gameState.js';

const HUMAN: EnginePlayer = { id: 'h1', kind: 'human' };
const AI: EnginePlayer = { id: 'ai1', kind: 'ai' };

const deck = createDefaultDeck();

// Month groups for controlled scenarios
const month1 = deck.filter((c) => c.month === 1); // 4 cards
const month2 = deck.filter((c) => c.month === 2); // 4 cards
const month3 = deck.filter((c) => c.month === 3); // 4 cards
const month4 = deck.filter((c) => c.month === 4);
const month5 = deck.filter((c) => c.month === 5);
const month6 = deck.filter((c) => c.month === 6);
const month7 = deck.filter((c) => c.month === 7);
const month8 = deck.filter((c) => c.month === 8);
const month9 = deck.filter((c) => c.month === 9);
const month10 = deck.filter((c) => c.month === 10);
const month11 = deck.filter((c) => c.month === 11);
const month12 = deck.filter((c) => c.month === 12);

const [m1a, m1b, m1c] = [month1[0]!, month1[1]!, month1[2]!];
const [m2a, m2b] = [month2[0]!, month2[1]!];
const [m3a, m3b] = [month3[0]!, month3[1]!];
const [m4a] = [month4[0]!];
const [m5a] = [month5[0]!];
const [m6a] = [month6[0]!];
const [m7a] = [month7[0]!];
const [m8a] = [month8[0]!];
const [m9a] = [month9[0]!];
const [m10a] = [month10[0]!];
const [m11a] = [month11[0]!];
const [m12a] = [month12[0]!];

/**
 * Builds a deterministic test GameState with explicit card placements.
 * Remaining cards (not in any zone) go to the draw pile.
 * Total is always 48 (enforced by stateValidation in applyAction).
 */
function buildState(opts: {
  p1Hand: Card[];
  p2Hand: Card[];
  fieldCards: Card[];
  currentTurn?: string;
  turnCount?: number;
}): GameState {
  const { p1Hand, p2Hand, fieldCards, currentTurn = HUMAN.id, turnCount = 0 } = opts;
  const usedIds = new Set([
    ...p1Hand.map((c) => c.id),
    ...p2Hand.map((c) => c.id),
    ...fieldCards.map((c) => c.id),
  ]);
  const drawPile = deck.filter((c) => !usedIds.has(c.id));

  return {
    players: [HUMAN, AI],
    currentTurn,
    phase: 'playing',
    drawPile,
    fieldCards,
    playerHands: { [HUMAN.id]: p1Hand, [AI.id]: p2Hand },
    capturedCards: { [HUMAN.id]: [], [AI.id]: [] },
    scoreState: {
      [HUMAN.id]: { total: 0, gwang: 0, yeol: 0, tti: 0, pi: 0 },
      [AI.id]: { total: 0, gwang: 0, yeol: 0, tti: 0, pi: 0 },
    },
    goStopState: { [HUMAN.id]: { goCount: 0 }, [AI.id]: { goCount: 0 } },
    pendingDecision: null,
    turnCount,
    ruleset: defaultRuleset,
  };
}

/**
 * Builds a test GameState with pre-populated capturedCards.
 * Computes initial scoreState from calculateScore so the state is consistent.
 */
function buildScoringState(opts: {
  p1Hand: Card[];
  p2Hand: Card[];
  fieldCards: Card[];
  p1Captured?: Card[];
  p2Captured?: Card[];
  currentTurn?: string;
}): GameState {
  const {
    p1Hand, p2Hand, fieldCards,
    p1Captured = [], p2Captured = [],
    currentTurn = HUMAN.id,
  } = opts;
  const usedIds = new Set(
    [...p1Hand, ...p2Hand, ...fieldCards, ...p1Captured, ...p2Captured].map((c) => c.id),
  );
  const drawPile = deck.filter((c) => !usedIds.has(c.id));

  return {
    players: [HUMAN, AI],
    currentTurn,
    phase: 'playing',
    drawPile,
    fieldCards,
    playerHands: { [HUMAN.id]: p1Hand, [AI.id]: p2Hand },
    capturedCards: { [HUMAN.id]: p1Captured, [AI.id]: p2Captured },
    scoreState: {
      [HUMAN.id]: calculateScore(p1Captured),
      [AI.id]: calculateScore(p2Captured),
    },
    goStopState: { [HUMAN.id]: { goCount: 0 }, [AI.id]: { goCount: 0 } },
    pendingDecision: null,
    turnCount: 0,
    ruleset: defaultRuleset,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function allCardIds(state: GameState): string[] {
  const hand1 = state.playerHands[HUMAN.id] ?? [];
  const hand2 = state.playerHands[AI.id] ?? [];
  const cap1 = state.capturedCards[HUMAN.id] ?? [];
  const cap2 = state.capturedCards[AI.id] ?? [];
  return [
    ...hand1.map((c) => c.id),
    ...hand2.map((c) => c.id),
    ...state.fieldCards.map((c) => c.id),
    ...state.drawPile.map((c) => c.id),
    ...cap1.map((c) => c.id),
    ...cap2.map((c) => c.id),
  ];
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('applyAction — PLAY_CARD, 0 field matches (card goes to field)', () => {
  // m1a in hand, field has only month2/3 cards → m1a has no same-group match.
  // ALL other month-1 cards are in p2Hand so drawPile[0] is NOT month-1,
  // preventing the draw card from matching m1a after it lands on the field.
  const state = buildState({
    p1Hand: [m1a, m2a, m3a, m4a, m5a, m6a, m7a, m8a, m9a, m10a],
    p2Hand: [m11a, m12a, month1[1]!, month1[2]!, month1[3]!, month4[1]!, month5[1]!, month6[1]!, month7[1]!, month8[1]!],
    fieldCards: [m2b, m3b, month4[2]!, month5[2]!, month6[2]!, month7[2]!, month8[2]!, month9[2]!],
  });
  // drawPile[0] is the first card not in any zone — now guaranteed non-month-1

  it('returns success', () => {
    const result = applyAction(state, { type: 'PLAY_CARD', cardId: m1a.id });
    expect(result.success).toBe(true);
  });

  it('removes played card from current player hand', () => {
    const result = applyAction(state, { type: 'PLAY_CARD', cardId: m1a.id });
    if (!result.success) throw new Error('Expected success');
    const hand = result.state.playerHands[HUMAN.id] ?? [];
    expect(hand.some((c) => c.id === m1a.id)).toBe(false);
  });

  it('places played card on field (no match)', () => {
    const result = applyAction(state, { type: 'PLAY_CARD', cardId: m1a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.state.fieldCards.some((c) => c.id === m1a.id)).toBe(true);
  });

  it('total card count remains 48 after play', () => {
    const result = applyAction(state, { type: 'PLAY_CARD', cardId: m1a.id });
    if (!result.success) throw new Error('Expected success');
    expect(allCardIds(result.state)).toHaveLength(48);
  });

  it('no card appears in two zones simultaneously', () => {
    const result = applyAction(state, { type: 'PLAY_CARD', cardId: m1a.id });
    if (!result.success) throw new Error('Expected success');
    const ids = allCardIds(result.state);
    expect(new Set(ids).size).toBe(48);
  });
});

describe('applyAction — PLAY_CARD, 1 field match (capture)', () => {
  // m1a in hand, m1b on field → same group → capture
  // month1[2] and month1[3] in p2Hand so draw pile has no stray month-1 cards
  const state = buildState({
    p1Hand: [m1a, m2a, m3a, m4a, m5a, m6a, m7a, m8a, m9a, m10a],
    p2Hand: [m11a, m12a, month1[2]!, month1[3]!, month2[3]!, month4[1]!, month5[1]!, month6[1]!, month7[1]!, month8[1]!],
    fieldCards: [m1b, m3b, month4[2]!, month5[2]!, month6[2]!, month7[2]!, month8[2]!, month9[2]!],
  });

  it('captures played card and matched field card', () => {
    const result = applyAction(state, { type: 'PLAY_CARD', cardId: m1a.id });
    if (!result.success) throw new Error('Expected success');
    const captured = result.state.capturedCards[HUMAN.id] ?? [];
    const capturedIds = captured.map((c) => c.id);
    expect(capturedIds).toContain(m1a.id);
    expect(capturedIds).toContain(m1b.id);
  });

  it('removes matched field card from fieldCards', () => {
    const result = applyAction(state, { type: 'PLAY_CARD', cardId: m1a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.state.fieldCards.some((c) => c.id === m1b.id)).toBe(false);
  });

  it('scoreState.total is 0 (captured 1 gwang + 1 tti — not enough to score)', () => {
    const result = applyAction(state, { type: 'PLAY_CARD', cardId: m1a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.state.scoreState[HUMAN.id]?.total).toBe(0);
  });

  it('goStopState is unchanged', () => {
    const result = applyAction(state, { type: 'PLAY_CARD', cardId: m1a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.state.goStopState[HUMAN.id]?.goCount).toBe(0);
  });

  it('total card count remains 48', () => {
    const result = applyAction(state, { type: 'PLAY_CARD', cardId: m1a.id });
    if (!result.success) throw new Error('Expected success');
    expect(allCardIds(result.state)).toHaveLength(48);
    expect(new Set(allCardIds(result.state)).size).toBe(48);
  });
});

describe('applyAction — PLAY_CARD, 2 field matches (targetFieldCardId required)', () => {
  // m1a in hand, m1b and m1c on field → must specify target
  // month1[3] in p2Hand so draw pile has no stray month-1 cards
  const state = buildState({
    p1Hand: [m1a, m2a, m3a, m4a, m5a, m6a, m7a, m8a, m9a, m10a],
    p2Hand: [m11a, m12a, month1[3]!, month2[3]!, month3[3]!, month4[1]!, month5[1]!, month6[1]!, month7[1]!, month8[1]!],
    fieldCards: [m1b, m1c, month4[2]!, month5[2]!, month6[2]!, month7[2]!, month8[2]!, month9[2]!],
  });

  it('returns invalid when targetFieldCardId is missing', () => {
    const result = applyAction(state, { type: 'PLAY_CARD', cardId: m1a.id });
    expect(result.success).toBe(false);
  });

  it('returns invalid when targetFieldCardId is a wrong card', () => {
    const result = applyAction(state, {
      type: 'PLAY_CARD',
      cardId: m1a.id,
      targetFieldCardId: m2a.id, // not on field / wrong month
    });
    expect(result.success).toBe(false);
  });

  it('captures only the targeted field card', () => {
    const result = applyAction(state, {
      type: 'PLAY_CARD',
      cardId: m1a.id,
      targetFieldCardId: m1b.id,
    });
    if (!result.success) throw new Error('Expected success');
    const captured = result.state.capturedCards[HUMAN.id] ?? [];
    const capturedIds = captured.map((c) => c.id);
    expect(capturedIds).toContain(m1a.id);
    expect(capturedIds).toContain(m1b.id);
    expect(capturedIds).not.toContain(m1c.id);
  });

  it('leaves the non-targeted match on the field', () => {
    const result = applyAction(state, {
      type: 'PLAY_CARD',
      cardId: m1a.id,
      targetFieldCardId: m1b.id,
    });
    if (!result.success) throw new Error('Expected success');
    expect(result.state.fieldCards.some((c) => c.id === m1c.id)).toBe(true);
  });

  it('total card count remains 48', () => {
    const result = applyAction(state, {
      type: 'PLAY_CARD',
      cardId: m1a.id,
      targetFieldCardId: m1b.id,
    });
    if (!result.success) throw new Error('Expected success');
    expect(new Set(allCardIds(result.state)).size).toBe(48);
  });
});

describe('applyAction — draw pile reveal', () => {
  // m1a in hand, no field match for m1a, but we know drawPile[0] from the build helper
  const state = buildState({
    p1Hand: [m1a, m2a, m3a, m4a, m5a, m6a, m7a, m8a, m9a, m10a],
    p2Hand: [m11a, m12a, month1[3]!, month2[3]!, month3[3]!, month4[1]!, month5[1]!, month6[1]!, month7[1]!, month8[1]!],
    fieldCards: [m2b, m3b, month4[2]!, month5[2]!, month6[2]!, month7[2]!, month8[2]!, month9[2]!],
  });

  it('draw pile shrinks by 1 after a turn', () => {
    const initialDrawSize = state.drawPile.length;
    const result = applyAction(state, { type: 'PLAY_CARD', cardId: m1a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.state.drawPile.length).toBe(initialDrawSize - 1);
  });

  it('events include DECK_CARD_REVEALED', () => {
    const result = applyAction(state, { type: 'PLAY_CARD', cardId: m1a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.events.some((e) => e.type === 'DECK_CARD_REVEALED')).toBe(true);
  });

  it('revealed card is not in any zone after resolution', () => {
    const topCardId = state.drawPile[0]!.id;
    const result = applyAction(state, { type: 'PLAY_CARD', cardId: m1a.id });
    if (!result.success) throw new Error('Expected success');
    // The revealed card must now be in exactly one zone (field or captured)
    const allIds = allCardIds(result.state);
    const count = allIds.filter((id) => id === topCardId).length;
    expect(count).toBe(1);
  });
});

describe('applyAction — turn progression', () => {
  const state = buildState({
    p1Hand: [m1a, m2a, m3a, m4a, m5a, m6a, m7a, m8a, m9a, m10a],
    p2Hand: [m11a, m12a, month1[3]!, month2[3]!, month3[3]!, month4[1]!, month5[1]!, month6[1]!, month7[1]!, month8[1]!],
    fieldCards: [m2b, m3b, month4[2]!, month5[2]!, month6[2]!, month7[2]!, month8[2]!, month9[2]!],
  });

  it('currentTurn advances to opponent after play', () => {
    const result = applyAction(state, { type: 'PLAY_CARD', cardId: m1a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.state.currentTurn).toBe(AI.id);
  });

  it('turnCount increments by 1', () => {
    const result = applyAction(state, { type: 'PLAY_CARD', cardId: m1a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.state.turnCount).toBe(1);
  });

  it('phase stays playing', () => {
    const result = applyAction(state, { type: 'PLAY_CARD', cardId: m1a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.state.phase).toBe('playing');
  });

  it('pendingDecision remains null', () => {
    const result = applyAction(state, { type: 'PLAY_CARD', cardId: m1a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.state.pendingDecision).toBeNull();
  });

  it('events include CARD_PLAYED and TURN_CHANGED', () => {
    const result = applyAction(state, { type: 'PLAY_CARD', cardId: m1a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.events.some((e) => e.type === 'CARD_PLAYED')).toBe(true);
    expect(result.events.some((e) => e.type === 'TURN_CHANGED')).toBe(true);
  });
});

describe('applyAction — AI_PLAY_CARD', () => {
  const state = buildState({
    p1Hand: [m1a, m2a, m3a, m4a, m5a, m6a, m7a, m8a, m9a, m10a],
    p2Hand: [m11a, m12a, month1[3]!, month2[3]!, month3[3]!, month4[1]!, month5[1]!, month6[1]!, month7[1]!, month8[1]!],
    fieldCards: [m2b, m3b, month4[2]!, month5[2]!, month6[2]!, month7[2]!, month8[2]!, month9[2]!],
    currentTurn: AI.id,
  });

  it('AI_PLAY_CARD succeeds for a card in AI hand', () => {
    const aiCardId = m11a.id;
    const result = applyAction(state, { type: 'AI_PLAY_CARD', cardId: aiCardId });
    expect(result.success).toBe(true);
  });

  it('after AI turn, currentTurn changes to human', () => {
    const result = applyAction(state, { type: 'AI_PLAY_CARD', cardId: m11a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.state.currentTurn).toBe(HUMAN.id);
  });
});

describe('applyAction — invalid action handling', () => {
  const state = buildState({
    p1Hand: [m1a, m2a, m3a, m4a, m5a, m6a, m7a, m8a, m9a, m10a],
    p2Hand: [m11a, m12a, month1[3]!, month2[3]!, month3[3]!, month4[1]!, month5[1]!, month6[1]!, month7[1]!, month8[1]!],
    fieldCards: [m2b, m3b, month4[2]!, month5[2]!, month6[2]!, month7[2]!, month8[2]!, month9[2]!],
  });

  it('returns failure for opponent card', () => {
    const opponentCardId = m11a.id;
    const result = applyAction(state, { type: 'PLAY_CARD', cardId: opponentCardId });
    expect(result.success).toBe(false);
  });

  it('does not mutate original state on failure', () => {
    const originalHand = [...(state.playerHands[HUMAN.id] ?? [])];
    applyAction(state, { type: 'PLAY_CARD', cardId: m11a.id });
    expect(state.playerHands[HUMAN.id]).toEqual(originalHand);
  });

  it('returns failure for unsupported action type', () => {
    const result = applyAction(state, { type: 'CHOOSE_GO' });
    expect(result.success).toBe(false);
  });

  it('returns failure for START_GAME', () => {
    const result = applyAction(state, { type: 'START_GAME' });
    expect(result.success).toBe(false);
  });
});

// ─── Scoring: SCORE_CHANGED not emitted when score stays 0 ───────────────────

describe('applyAction — scoring: no SCORE_CHANGED when score stays 0', () => {
  // Play m1a (gwang, month1) with no field match → goes to field.
  // Draw card (month2[2] pi) captures m2b (month2 tti) — 1 pi + 1 tti, score stays 0.
  const state = buildState({
    p1Hand: [m1a, m2a, m3a, m4a, m5a, m6a, m7a, m8a, m9a, m10a],
    p2Hand: [m11a, m12a, month1[1]!, month1[2]!, month1[3]!, month4[1]!, month5[1]!, month6[1]!, month7[1]!, month8[1]!],
    fieldCards: [m2b, m3b, month4[2]!, month5[2]!, month6[2]!, month7[2]!, month8[2]!, month9[2]!],
  });

  it('SCORE_CHANGED is NOT emitted when captured cards do not change score', () => {
    const result = applyAction(state, { type: 'PLAY_CARD', cardId: m1a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.events.some((e) => e.type === 'SCORE_CHANGED')).toBe(false);
  });

  it('scoreState.total stays 0', () => {
    const result = applyAction(state, { type: 'PLAY_CARD', cardId: m1a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.state.scoreState[HUMAN.id]?.total).toBe(0);
  });

  it('scoreState has all category scores at 0', () => {
    const result = applyAction(state, { type: 'PLAY_CARD', cardId: m1a.id });
    if (!result.success) throw new Error('Expected success');
    const s = result.state.scoreState[HUMAN.id]!;
    expect(s.gwang).toBe(0);
    expect(s.yeol).toBe(0);
    expect(s.tti).toBe(0);
    expect(s.pi).toBe(0);
  });
});

// ─── Scoring: 3 gwang → 3 pts ──────────────────────────────────────────────

describe('applyAction — scoring: 3 gwang → 3 pts', () => {
  // Pre-captured: m1a(gwang,month1) + m3a(gwang,month3) = 2 gwang = 0 pts.
  // Play m8a(gwang,month8) → month8[1](yeol,month8) on field (1 match) → capture.
  // Draw card also captures, but gwang score = 3 pts total.
  const state3Gwang = buildScoringState({
    p1Captured: [m1a, m3a],
    p1Hand: [m8a, m2a, m4a, m5a, m6a, m7a, m9a, m10a, month3[1]!, month3[2]!],
    p2Hand: [m11a, m12a, month1[1]!, month1[2]!, month1[3]!, month2[2]!, month2[3]!, month3[3]!, month4[1]!, month4[3]!],
    fieldCards: [month8[1]!, m2b, month4[2]!, month5[2]!, month6[2]!, month7[2]!, month9[2]!, month10[2]!],
  });

  it('scoreState.gwang === 3 after capturing 3rd gwang', () => {
    const result = applyAction(state3Gwang, { type: 'PLAY_CARD', cardId: m8a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.state.scoreState[HUMAN.id]?.gwang).toBe(3);
  });

  it('scoreState.total === 3 (gwang only contributes)', () => {
    const result = applyAction(state3Gwang, { type: 'PLAY_CARD', cardId: m8a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.state.scoreState[HUMAN.id]?.total).toBe(3);
  });

  it('SCORE_CHANGED event is emitted', () => {
    const result = applyAction(state3Gwang, { type: 'PLAY_CARD', cardId: m8a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.events.some((e) => e.type === 'SCORE_CHANGED')).toBe(true);
  });

  it('SCORE_CHANGED event carries correct playerId and score', () => {
    const result = applyAction(state3Gwang, { type: 'PLAY_CARD', cardId: m8a.id });
    if (!result.success) throw new Error('Expected success');
    const evt = result.events.find((e) => e.type === 'SCORE_CHANGED');
    if (!evt || evt.type !== 'SCORE_CHANGED') throw new Error('Expected SCORE_CHANGED event');
    expect(evt.playerId).toBe(HUMAN.id);
    expect(evt.score.gwang).toBe(3);
    expect(evt.score.total).toBe(3);
  });

  it('phase stays playing (score 3 < threshold 7)', () => {
    const result = applyAction(state3Gwang, { type: 'PLAY_CARD', cardId: m8a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.state.phase).toBe('playing');
  });

  it('turn advances to opponent (no Go/Stop triggered)', () => {
    const result = applyAction(state3Gwang, { type: 'PLAY_CARD', cardId: m8a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.state.currentTurn).toBe(AI.id);
    expect(result.events.some((e) => e.type === 'TURN_CHANGED')).toBe(true);
  });
});

// ─── Go/Stop trigger ────────────────────────────────────────────────────────

describe('applyAction — Go/Stop trigger (score reaches threshold)', () => {
  // Pre-captured: 4 gwang (months 1,3,8,11) + 6 yeol (months 2,4,5,6,7,9) = 6 pts.
  // Play m10a(yeol,month10) → month10[3](pi,month10) on field (1 match) → capture.
  // Draw card also captures a month8 card, final: 4gwang + 7+yeol → score ≥ 7 → trigger.
  const goStopTestState = buildScoringState({
    p1Captured: [m1a, m3a, m8a, m11a, m2a, m4a, m5a, m6a, m7a, m9a],
    p1Hand: [m10a, month1[1]!, month1[2]!, month2[1]!, month2[2]!, month3[1]!, month3[2]!, month4[1]!, month4[2]!, month5[1]!],
    p2Hand: [m12a, month1[3]!, month2[3]!, month3[3]!, month4[3]!, month5[3]!, month6[1]!, month6[3]!, month7[1]!, month7[3]!],
    fieldCards: [month10[3]!, month5[2]!, month6[2]!, month7[2]!, month8[1]!, month9[1]!, month11[1]!, month11[2]!],
  });

  it('returns success', () => {
    const result = applyAction(goStopTestState, { type: 'PLAY_CARD', cardId: m10a.id });
    expect(result.success).toBe(true);
  });

  it('phase becomes pendingGoStop', () => {
    const result = applyAction(goStopTestState, { type: 'PLAY_CARD', cardId: m10a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.state.phase).toBe('pendingGoStop');
  });

  it('pendingDecision is set to goStop for current player', () => {
    const result = applyAction(goStopTestState, { type: 'PLAY_CARD', cardId: m10a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.state.pendingDecision).not.toBeNull();
    expect(result.state.pendingDecision?.type).toBe('goStop');
    expect(result.state.pendingDecision?.playerId).toBe(HUMAN.id);
  });

  it('GO_STOP_DECISION_REQUIRED event is emitted', () => {
    const result = applyAction(goStopTestState, { type: 'PLAY_CARD', cardId: m10a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.events.some((e) => e.type === 'GO_STOP_DECISION_REQUIRED')).toBe(true);
  });

  it('TURN_CHANGED event is NOT emitted when Go/Stop is triggered', () => {
    const result = applyAction(goStopTestState, { type: 'PLAY_CARD', cardId: m10a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.events.some((e) => e.type === 'TURN_CHANGED')).toBe(false);
  });

  it('currentTurn stays with current player (turn does not advance)', () => {
    const result = applyAction(goStopTestState, { type: 'PLAY_CARD', cardId: m10a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.state.currentTurn).toBe(HUMAN.id);
  });

  it('scoreState.total reaches threshold or above', () => {
    const result = applyAction(goStopTestState, { type: 'PLAY_CARD', cardId: m10a.id });
    if (!result.success) throw new Error('Expected success');
    expect(result.state.scoreState[HUMAN.id]!.total).toBeGreaterThanOrEqual(7);
  });

  it('SCORE_CHANGED emitted before GO_STOP_DECISION_REQUIRED', () => {
    const result = applyAction(goStopTestState, { type: 'PLAY_CARD', cardId: m10a.id });
    if (!result.success) throw new Error('Expected success');
    const scoreIdx = result.events.findIndex((e) => e.type === 'SCORE_CHANGED');
    const goStopIdx = result.events.findIndex((e) => e.type === 'GO_STOP_DECISION_REQUIRED');
    expect(scoreIdx).toBeGreaterThanOrEqual(0);
    expect(goStopIdx).toBeGreaterThan(scoreIdx);
  });

  it('total card count remains 48', () => {
    const result = applyAction(goStopTestState, { type: 'PLAY_CARD', cardId: m10a.id });
    if (!result.success) throw new Error('Expected success');
    expect(new Set(allCardIds(result.state)).size).toBe(48);
  });
});
