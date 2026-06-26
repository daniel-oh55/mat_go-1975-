import { describe, it, expect } from 'vitest';
import { createDefaultDeck } from './deck.js';
import { validateDeck } from './deckValidation.js';

describe('createDefaultDeck', () => {
  it('returns exactly 48 cards', () => {
    const deck = createDefaultDeck();
    expect(deck).toHaveLength(48);
  });

  it('has no duplicate cardIds', () => {
    const deck = createDefaultDeck();
    const ids = deck.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(48);
  });

  it('contains all 12 months', () => {
    const deck = createDefaultDeck();
    const months = new Set(deck.map((c) => c.month));
    expect(months.size).toBe(12);
    for (let m = 1; m <= 12; m++) {
      expect(months.has(m as 1)).toBe(true);
    }
  });

  it('has exactly 4 cards per month', () => {
    const deck = createDefaultDeck();
    for (let m = 1; m <= 12; m++) {
      const count = deck.filter((c) => c.month === m).length;
      expect(count, `month ${m}`).toBe(4);
    }
  });

  it('contains exactly 5 gwang cards', () => {
    const deck = createDefaultDeck();
    expect(deck.filter((c) => c.category === 'gwang')).toHaveLength(5);
  });

  it('contains exactly 9 yeol cards', () => {
    const deck = createDefaultDeck();
    expect(deck.filter((c) => c.category === 'yeol')).toHaveLength(9);
  });

  it('contains exactly 10 tti cards', () => {
    const deck = createDefaultDeck();
    expect(deck.filter((c) => c.category === 'tti')).toHaveLength(10);
  });

  it('contains exactly 24 pi cards', () => {
    const deck = createDefaultDeck();
    expect(deck.filter((c) => c.category === 'pi')).toHaveLength(24);
  });

  it('has matchingGroup equal to month for all cards in basic rules', () => {
    const deck = createDefaultDeck();
    for (const card of deck) {
      expect(card.matchingGroup, card.id).toBe(card.month);
    }
  });

  it('contains no image paths, story data, or content-layer fields', () => {
    const deck = createDefaultDeck();
    for (const card of deck) {
      expect(card).not.toHaveProperty('imagePath');
      expect(card).not.toHaveProperty('storyText');
      expect(card).not.toHaveProperty('npcMeaning');
      expect(card).not.toHaveProperty('regionLore');
    }
  });
});

describe('validateDeck', () => {
  it('returns valid for the default deck', () => {
    const result = validateDeck(createDefaultDeck());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns invalid when deck has fewer than 48 cards', () => {
    const deck = createDefaultDeck().slice(0, 47);
    const result = validateDeck(deck);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('48'))).toBe(true);
  });

  it('returns invalid when deck has more than 48 cards', () => {
    const base = createDefaultDeck();
    const extra = { ...base[0]! };
    const deck = [...base, extra];
    const result = validateDeck(deck);
    expect(result.valid).toBe(false);
  });

  it('returns invalid when there is a duplicate cardId', () => {
    const deck = createDefaultDeck();
    // Replace last card's id with first card's id
    const dup = { ...deck[deck.length - 1]!, id: deck[0]!.id };
    const modified = [...deck.slice(0, -1), dup];
    const result = validateDeck(modified);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('duplicate'))).toBe(true);
  });

  it('returns invalid when a card has month 0', () => {
    const deck = createDefaultDeck();
    const bad = { ...deck[0]!, month: 0 as unknown as 1, matchingGroup: 0 as unknown as 1 };
    const result = validateDeck([bad, ...deck.slice(1)]);
    expect(result.valid).toBe(false);
  });

  it('returns invalid when a month is missing', () => {
    // Remove all month-12 cards and replace with month-1 duplicates (same count, wrong months)
    const deck = createDefaultDeck();
    const noMonth12 = deck.filter((c) => c.month !== 12);
    const extras = deck.filter((c) => c.month === 1).map((c, i) => ({
      ...c,
      id: `extra-${i}`,
    }));
    const result = validateDeck([...noMonth12, ...extras]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('12'))).toBe(true);
  });
});
