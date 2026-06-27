import { describe, it, expect } from 'vitest';
import { calculateScore } from './scoring.js';
import { createDefaultDeck } from '../cards/deck.js';

const deck = createDefaultDeck();
const gwangCards = deck.filter((c) => c.category === 'gwang'); // 5 cards: months 1,3,8,11,12
const yeolCards = deck.filter((c) => c.category === 'yeol');   // 9 cards
const ttiCards = deck.filter((c) => c.category === 'tti');     // 10 cards
const piCards = deck.filter((c) => c.category === 'pi');       // 24 cards

describe('calculateScore — empty', () => {
  it('returns all zeros for empty capturedCards', () => {
    const result = calculateScore([]);
    expect(result).toEqual({ total: 0, gwang: 0, yeol: 0, tti: 0, pi: 0 });
  });
});

describe('calculateScore — gwang', () => {
  it('0 gwang → 0 pts', () => {
    expect(calculateScore([]).gwang).toBe(0);
  });

  it('1 gwang → 0 pts', () => {
    expect(calculateScore([gwangCards[0]!]).gwang).toBe(0);
  });

  it('2 gwang → 0 pts', () => {
    expect(calculateScore(gwangCards.slice(0, 2)).gwang).toBe(0);
  });

  it('3 gwang → 3 pts', () => {
    expect(calculateScore(gwangCards.slice(0, 3)).gwang).toBe(3);
  });

  it('4 gwang → 4 pts', () => {
    expect(calculateScore(gwangCards.slice(0, 4)).gwang).toBe(4);
  });

  it('5 gwang → 15 pts', () => {
    expect(calculateScore(gwangCards).gwang).toBe(15);
  });

  it('비광 (month 12 gwang) counted as 1 gwang — no special treatment in MVP', () => {
    const biGwang = gwangCards.find((c) => c.month === 12)!;
    const twoGwang = gwangCards.filter((c) => c.month !== 12).slice(0, 2);
    expect(calculateScore([...twoGwang, biGwang]).gwang).toBe(3);
  });
});

describe('calculateScore — yeol', () => {
  it('0 yeol → 0 pts', () => {
    expect(calculateScore([]).yeol).toBe(0);
  });

  it('4 yeol → 0 pts', () => {
    expect(calculateScore(yeolCards.slice(0, 4)).yeol).toBe(0);
  });

  it('5 yeol → 1 pt', () => {
    expect(calculateScore(yeolCards.slice(0, 5)).yeol).toBe(1);
  });

  it('6 yeol → 2 pts', () => {
    expect(calculateScore(yeolCards.slice(0, 6)).yeol).toBe(2);
  });

  it('9 yeol (all) → 5 pts', () => {
    expect(calculateScore(yeolCards).yeol).toBe(5);
  });
});

describe('calculateScore — tti', () => {
  it('0 tti → 0 pts', () => {
    expect(calculateScore([]).tti).toBe(0);
  });

  it('4 tti → 0 pts', () => {
    expect(calculateScore(ttiCards.slice(0, 4)).tti).toBe(0);
  });

  it('5 tti → 1 pt', () => {
    expect(calculateScore(ttiCards.slice(0, 5)).tti).toBe(1);
  });

  it('6 tti → 2 pts', () => {
    expect(calculateScore(ttiCards.slice(0, 6)).tti).toBe(2);
  });

  it('10 tti (all) → 6 pts', () => {
    expect(calculateScore(ttiCards).tti).toBe(6);
  });
});

describe('calculateScore — pi', () => {
  it('0 pi → 0 pts', () => {
    expect(calculateScore([]).pi).toBe(0);
  });

  it('9 pi → 0 pts', () => {
    expect(calculateScore(piCards.slice(0, 9)).pi).toBe(0);
  });

  it('10 pi → 1 pt', () => {
    expect(calculateScore(piCards.slice(0, 10)).pi).toBe(1);
  });

  it('11 pi → 2 pts', () => {
    expect(calculateScore(piCards.slice(0, 11)).pi).toBe(2);
  });
});

describe('calculateScore — total', () => {
  it('3 gwang + 5 yeol = 3 + 1 = 4 pts', () => {
    const cards = [...gwangCards.slice(0, 3), ...yeolCards.slice(0, 5)];
    const result = calculateScore(cards);
    expect(result.gwang).toBe(3);
    expect(result.yeol).toBe(1);
    expect(result.total).toBe(4);
  });

  it('4 gwang + 6 yeol = 4 + 2 = 6 pts', () => {
    const cards = [...gwangCards.slice(0, 4), ...yeolCards.slice(0, 6)];
    const result = calculateScore(cards);
    expect(result.gwang).toBe(4);
    expect(result.yeol).toBe(2);
    expect(result.total).toBe(6);
  });

  it('4 gwang + 7 yeol = 4 + 3 = 7 pts', () => {
    const cards = [...gwangCards.slice(0, 4), ...yeolCards.slice(0, 7)];
    const result = calculateScore(cards);
    expect(result.total).toBe(7);
  });

  it('total === gwang + yeol + tti + pi', () => {
    const cards = [...gwangCards.slice(0, 3), ...yeolCards.slice(0, 5), ...ttiCards.slice(0, 5), ...piCards.slice(0, 10)];
    const result = calculateScore(cards);
    expect(result.total).toBe(result.gwang + result.yeol + result.tti + result.pi);
  });

  it('mixed card types — only scoring categories contribute', () => {
    // 3 gwang(3pts) + 4 yeol(0pts) + 4 tti(0pts) + 9 pi(0pts) = 3pts
    const cards = [...gwangCards.slice(0, 3), ...yeolCards.slice(0, 4), ...ttiCards.slice(0, 4), ...piCards.slice(0, 9)];
    const result = calculateScore(cards);
    expect(result.total).toBe(3);
    expect(result.gwang).toBe(3);
  });
});
