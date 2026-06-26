import { describe, it, expect } from 'vitest';
import { shuffleDeck } from './shuffleDeck.js';
import { createDefaultDeck } from '../cards/deck.js';
import { SeededRandomProvider } from '../rng/seededRandomProvider.js';

describe('shuffleDeck', () => {
  it('does not mutate the input deck', () => {
    const original = createDefaultDeck();
    const originalIds = original.map((c) => c.id);
    shuffleDeck(original, new SeededRandomProvider(1));
    expect(original.map((c) => c.id)).toEqual(originalIds);
  });

  it('returns a new array reference', () => {
    const deck = createDefaultDeck();
    const shuffled = shuffleDeck(deck, new SeededRandomProvider(1));
    expect(shuffled).not.toBe(deck);
  });

  it('preserves exactly 48 cards', () => {
    const deck = createDefaultDeck();
    const shuffled = shuffleDeck(deck, new SeededRandomProvider(7));
    expect(shuffled).toHaveLength(48);
  });

  it('preserves the exact set of cardIds', () => {
    const deck = createDefaultDeck();
    const shuffled = shuffleDeck(deck, new SeededRandomProvider(7));
    const originalIds = new Set(deck.map((c) => c.id));
    const shuffledIds = new Set(shuffled.map((c) => c.id));
    expect(shuffledIds).toEqual(originalIds);
  });

  it('produces a deterministic result with the same seed', () => {
    const deck = createDefaultDeck();
    const result1 = shuffleDeck(deck, new SeededRandomProvider(42));
    const result2 = shuffleDeck(deck, new SeededRandomProvider(42));
    expect(result1.map((c) => c.id)).toEqual(result2.map((c) => c.id));
  });

  it('produces different orderings with different seeds', () => {
    const deck = createDefaultDeck();
    const result1 = shuffleDeck(deck, new SeededRandomProvider(1));
    const result2 = shuffleDeck(deck, new SeededRandomProvider(2));
    // It is astronomically unlikely (1/48!) for two fair shuffles to be identical
    expect(result1.map((c) => c.id)).not.toEqual(result2.map((c) => c.id));
  });

  it('generally produces a different order from the original', () => {
    const deck = createDefaultDeck();
    const shuffled = shuffleDeck(deck, new SeededRandomProvider(99));
    // With 48 cards, a fair shuffle staying in original order has probability 1/48!
    expect(shuffled.map((c) => c.id)).not.toEqual(deck.map((c) => c.id));
  });
});
