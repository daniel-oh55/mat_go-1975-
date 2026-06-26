import { describe, it, expect } from 'vitest';
import { resolveCardAgainstField } from './captureResolution.js';
import { createDefaultDeck } from '../cards/deck.js';

const deck = createDefaultDeck();

const month1 = deck.filter((c) => c.month === 1);
const month2 = deck.filter((c) => c.month === 2);
const [m1a, m1b, m1c] = [month1[0]!, month1[1]!, month1[2]!];
const [m2a, m2b] = [month2[0]!, month2[1]!];

describe('resolveCardAgainstField — 0 matches', () => {
  it('places sourceCard on field', () => {
    const result = resolveCardAgainstField({
      sourceCard: m1a,
      fieldCards: [m2a, m2b],
      isFromDrawPile: false,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.placedOnField).toBe(true);
    expect(result.capturedCards).toHaveLength(0);
    expect(result.updatedFieldCards).toHaveLength(3); // 2 existing + sourceCard
    expect(result.updatedFieldCards.some((c) => c.id === m1a.id)).toBe(true);
  });

  it('returns empty capturedCards', () => {
    const result = resolveCardAgainstField({
      sourceCard: m1a,
      fieldCards: [],
      isFromDrawPile: false,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.capturedCards).toHaveLength(0);
  });
});

describe('resolveCardAgainstField — 1 match', () => {
  it('captures sourceCard and matched field card', () => {
    const result = resolveCardAgainstField({
      sourceCard: m1a,
      fieldCards: [m1b, m2a],
      isFromDrawPile: false,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.placedOnField).toBe(false);
    expect(result.capturedCards).toHaveLength(2);
    const capturedIds = result.capturedCards.map((c) => c.id);
    expect(capturedIds).toContain(m1a.id);
    expect(capturedIds).toContain(m1b.id);
  });

  it('removes matched card from updatedFieldCards', () => {
    const result = resolveCardAgainstField({
      sourceCard: m1a,
      fieldCards: [m1b, m2a],
      isFromDrawPile: false,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.updatedFieldCards.some((c) => c.id === m1b.id)).toBe(false);
    expect(result.updatedFieldCards.some((c) => c.id === m2a.id)).toBe(true);
  });
});

describe('resolveCardAgainstField — 2+ matches, hand play', () => {
  it('fails when targetFieldCardId is missing', () => {
    const result = resolveCardAgainstField({
      sourceCard: m1a,
      fieldCards: [m1b, m1c],
      isFromDrawPile: false,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toContain('targetFieldCardId is required');
  });

  it('fails when targetFieldCardId is not a valid match', () => {
    const result = resolveCardAgainstField({
      sourceCard: m1a,
      fieldCards: [m1b, m1c],
      isFromDrawPile: false,
      targetFieldCardId: m2a.id, // m2a is not a same-group card
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toContain('not a valid matching field card');
  });

  it('captures sourceCard and targeted field card only', () => {
    const result = resolveCardAgainstField({
      sourceCard: m1a,
      fieldCards: [m1b, m1c],
      isFromDrawPile: false,
      targetFieldCardId: m1b.id,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    const capturedIds = result.capturedCards.map((c) => c.id);
    expect(capturedIds).toContain(m1a.id);
    expect(capturedIds).toContain(m1b.id);
    expect(capturedIds).not.toContain(m1c.id);
    expect(result.capturedCards).toHaveLength(2);
  });

  it('leaves the non-targeted match on the field', () => {
    const result = resolveCardAgainstField({
      sourceCard: m1a,
      fieldCards: [m1b, m1c],
      isFromDrawPile: false,
      targetFieldCardId: m1b.id,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.updatedFieldCards.some((c) => c.id === m1c.id)).toBe(true);
    expect(result.updatedFieldCards.some((c) => c.id === m1b.id)).toBe(false);
  });
});

describe('resolveCardAgainstField — 2+ matches, draw pile (fallback)', () => {
  it('selects first matching field card by array order', () => {
    const result = resolveCardAgainstField({
      sourceCard: m1a,
      fieldCards: [m1b, m1c],
      isFromDrawPile: true,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    const capturedIds = result.capturedCards.map((c) => c.id);
    expect(capturedIds).toContain(m1a.id);
    expect(capturedIds).toContain(m1b.id); // first match
    expect(capturedIds).not.toContain(m1c.id);
  });

  it('leaves remaining matches on field', () => {
    const result = resolveCardAgainstField({
      sourceCard: m1a,
      fieldCards: [m1b, m1c],
      isFromDrawPile: true,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.updatedFieldCards.some((c) => c.id === m1c.id)).toBe(true);
  });
});

describe('resolveCardAgainstField — immutability', () => {
  it('does not mutate the input fieldCards array', () => {
    const fieldCards = [m1b, m2a];
    const original = [...fieldCards];
    resolveCardAgainstField({ sourceCard: m1a, fieldCards, isFromDrawPile: false });
    expect(fieldCards.map((c) => c.id)).toEqual(original.map((c) => c.id));
  });
});
