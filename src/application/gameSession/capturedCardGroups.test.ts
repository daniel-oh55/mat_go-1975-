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
  it('returns empty array for empty input', () => {
    expect(groupCapturedCards([])).toEqual([]);
  });

  it('preserves category order: gwang → yeol → tti → pi', () => {
    const cards = [
      card('p', 'pi'),
      card('t', 'tti'),
      card('y', 'yeol'),
      card('g', 'gwang'),
    ];
    const groups = groupCapturedCards(cards);
    expect(groups.map((g) => g.category)).toEqual(['gwang', 'yeol', 'tti', 'pi']);
  });

  it('omits categories with zero cards', () => {
    const cards = [card('g', 'gwang'), card('p', 'pi')];
    const groups = groupCapturedCards(cards);
    expect(groups.map((g) => g.category)).toEqual(['gwang', 'pi']);
  });

  it('places all same-category cards into one group', () => {
    const cards = [card('p1', 'pi'), card('p2', 'pi'), card('p3', 'pi')];
    const groups = groupCapturedCards(cards);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.cards).toHaveLength(3);
  });

  it('preserves card insertion order within each group', () => {
    const cards = [card('p1', 'pi'), card('p2', 'pi')];
    const groups = groupCapturedCards(cards);
    expect(groups[0]?.cards.map((c) => c.id)).toEqual(['p1', 'p2']);
  });

  it('assigns correct Korean labels', () => {
    const cards = [
      card('g', 'gwang'),
      card('y', 'yeol'),
      card('t', 'tti'),
      card('p', 'pi'),
    ];
    const groups = groupCapturedCards(cards);
    const byCategory = Object.fromEntries(groups.map((g) => [g.category, g.label]));
    expect(byCategory['gwang']).toBe('광');
    expect(byCategory['yeol']).toBe('열');
    expect(byCategory['tti']).toBe('띠');
    expect(byCategory['pi']).toBe('피');
  });

  it('handles a single gwang-only capture', () => {
    const groups = groupCapturedCards([card('g', 'gwang')]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.category).toBe('gwang');
    expect(groups[0]?.label).toBe('광');
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
