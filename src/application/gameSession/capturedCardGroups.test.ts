import { describe, it, expect } from 'vitest';
import { groupCapturedCards, CAPTURED_GROUP_LABEL } from './capturedCardGroups.js';
import type { Card } from '../../engine/types/card.js';

function card(id: string, category: Card['category']): Card {
  return {
    id,
    month: 1,
    category,
    name: id,
    scoreRole: 'standard',
    matchingGroup: 1,
  };
}

describe('groupCapturedCards', () => {
  it('returns all four groups for empty input', () => {
    const groups = groupCapturedCards([]);
    expect(groups).toHaveLength(4);
    expect(groups.map((g) => g.category)).toEqual(['gwang', 'yeol', 'tti', 'pi']);
    for (const group of groups) {
      expect(group.cards).toHaveLength(0);
    }
  });

  it('always returns exactly 4 groups in gwang → yeol → tti → pi order', () => {
    const cards = [
      card('p', 'pi'),
      card('t', 'tti'),
      card('y', 'yeol'),
      card('g', 'gwang'),
    ];
    const groups = groupCapturedCards(cards);
    expect(groups).toHaveLength(4);
    expect(groups.map((g) => g.category)).toEqual(['gwang', 'yeol', 'tti', 'pi']);
  });

  it('includes categories with zero cards', () => {
    const cards = [card('g', 'gwang'), card('p', 'pi')];
    const groups = groupCapturedCards(cards);
    expect(groups).toHaveLength(4);
    const byCount = Object.fromEntries(groups.map((g) => [g.category, g.cards.length]));
    expect(byCount['gwang']).toBe(1);
    expect(byCount['yeol']).toBe(0);
    expect(byCount['tti']).toBe(0);
    expect(byCount['pi']).toBe(1);
  });

  it('places all same-category cards into one group', () => {
    const cards = [card('p1', 'pi'), card('p2', 'pi'), card('p3', 'pi')];
    const groups = groupCapturedCards(cards);
    expect(groups).toHaveLength(4);
    const piGroup = groups.find((g) => g.category === 'pi');
    expect(piGroup?.cards).toHaveLength(3);
  });

  it('preserves card insertion order within each group', () => {
    const cards = [card('p1', 'pi'), card('p2', 'pi')];
    const groups = groupCapturedCards(cards);
    const piGroup = groups.find((g) => g.category === 'pi');
    expect(piGroup?.cards.map((c) => c.id)).toEqual(['p1', 'p2']);
  });

  it('assigns correct Korean labels', () => {
    const groups = groupCapturedCards([
      card('g', 'gwang'),
      card('y', 'yeol'),
      card('t', 'tti'),
      card('p', 'pi'),
    ]);
    const byCategory = Object.fromEntries(groups.map((g) => [g.category, g.label]));
    expect(byCategory['gwang']).toBe('광');
    expect(byCategory['yeol']).toBe('열');
    expect(byCategory['tti']).toBe('띠');
    expect(byCategory['pi']).toBe('피');
  });

  it('handles a single gwang-only capture — other groups present with 0 cards', () => {
    const groups = groupCapturedCards([card('g', 'gwang')]);
    expect(groups).toHaveLength(4);
    const gwangGroup = groups.find((g) => g.category === 'gwang');
    expect(gwangGroup?.cards).toHaveLength(1);
    expect(gwangGroup?.label).toBe('광');
    const nonGwang = groups.filter((g) => g.category !== 'gwang');
    for (const g of nonGwang) {
      expect(g.cards).toHaveLength(0);
    }
  });
});

describe('CAPTURED_GROUP_LABEL', () => {
  it('covers all four categories', () => {
    const cats = ['gwang', 'yeol', 'tti', 'pi'] as const;
    for (const cat of cats) {
      expect(typeof CAPTURED_GROUP_LABEL[cat]).toBe('string');
      expect(CAPTURED_GROUP_LABEL[cat].length).toBeGreaterThan(0);
    }
  });
});
