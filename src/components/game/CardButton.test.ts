import { describe, it, expect } from 'vitest';
import { cardLabel, cardInteractionLabel } from './CardButton.js';
import type { Card } from '../../application/gameSession/index.js';

function makeCard(month: Card['month'], category: Card['category']): Card {
  return {
    id: `m${month}-${category}`,
    month,
    category,
    name: `test-${month}-${category}`,
    scoreRole: 'standard',
    matchingGroup: month,
  };
}

describe('cardLabel', () => {
  it('formats gwang as 광', () => {
    expect(cardLabel(makeCard(1, 'gwang'))).toBe('1월 광');
  });
  it('formats yeol as 열', () => {
    expect(cardLabel(makeCard(2, 'yeol'))).toBe('2월 열');
  });
  it('formats tti as 띠', () => {
    expect(cardLabel(makeCard(3, 'tti'))).toBe('3월 띠');
  });
  it('formats pi as 피', () => {
    expect(cardLabel(makeCard(12, 'pi'))).toBe('12월 피');
  });
});

describe('cardInteractionLabel', () => {
  it('returns 선택 불가 for none', () => {
    expect(cardInteractionLabel('none')).toBe('선택 불가');
  });
  it('returns 낼 수 있음 for legal', () => {
    expect(cardInteractionLabel('legal')).toBe('낼 수 있음');
  });
  it('returns 선택됨 for selected', () => {
    expect(cardInteractionLabel('selected')).toBe('선택됨');
  });
  it('returns 대상 선택 for target', () => {
    expect(cardInteractionLabel('target')).toBe('대상 선택');
  });
  it('returns a non-empty string for every CardHighlight value', () => {
    const highlights = ['none', 'legal', 'selected', 'target'] as const;
    for (const h of highlights) {
      const label = cardInteractionLabel(h);
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
