import { describe, it, expect } from 'vitest';
import { findMatchingFieldCards, hasMultipleMatchingFieldCards } from './matching.js';
import { createDefaultDeck } from '../cards/deck.js';

const deck = createDefaultDeck();

// Month 1 has 4 cards: m01-gwang, m01-tti, m01-pi-1, m01-pi-2
const month1 = deck.filter((c) => c.month === 1);
const [m1a, m1b, m1c, m1d] = [month1[0]!, month1[1]!, month1[2]!, month1[3]!];

// Month 2 cards (for non-matching scenarios)
const month2 = deck.filter((c) => c.month === 2);
const [m2a, m2b] = [month2[0]!, month2[1]!];

describe('findMatchingFieldCards', () => {
  it('returns empty array when field is empty', () => {
    expect(findMatchingFieldCards(m1a, [])).toHaveLength(0);
  });

  it('returns empty array when no field card shares matchingGroup', () => {
    const field = [m2a, m2b];
    expect(findMatchingFieldCards(m1a, field)).toHaveLength(0);
  });

  it('returns the one matching field card', () => {
    const field = [m1b, m2a];
    const result = findMatchingFieldCards(m1a, field);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(m1b.id);
  });

  it('returns all matching field cards when two share the group', () => {
    const field = [m1b, m1c, m2a];
    const result = findMatchingFieldCards(m1a, field);
    expect(result).toHaveLength(2);
    const ids = result.map((c) => c.id);
    expect(ids).toContain(m1b.id);
    expect(ids).toContain(m1c.id);
  });

  it('returns three matching cards when three share the group', () => {
    const field = [m1b, m1c, m1d];
    const result = findMatchingFieldCards(m1a, field);
    expect(result).toHaveLength(3);
  });

  it('does not include the source card itself when it is on the field', () => {
    // Source and field card are the same object — should NOT happen in practice
    // but the function filters by matchingGroup, not by identity
    const field = [m1a, m1b];
    const result = findMatchingFieldCards(m1a, field);
    // Both m1a and m1b have matchingGroup === 1, so both match
    expect(result).toHaveLength(2);
  });
});

describe('hasMultipleMatchingFieldCards', () => {
  it('returns false when field is empty', () => {
    expect(hasMultipleMatchingFieldCards(m1a, [])).toBe(false);
  });

  it('returns false when zero matches', () => {
    expect(hasMultipleMatchingFieldCards(m1a, [m2a])).toBe(false);
  });

  it('returns false when exactly one match', () => {
    expect(hasMultipleMatchingFieldCards(m1a, [m1b, m2a])).toBe(false);
  });

  it('returns true when two matches', () => {
    expect(hasMultipleMatchingFieldCards(m1a, [m1b, m1c])).toBe(true);
  });

  it('returns true when three matches', () => {
    expect(hasMultipleMatchingFieldCards(m1a, [m1b, m1c, m1d])).toBe(true);
  });
});
