import { describe, it, expect } from 'vitest';
import { SeededRandomProvider } from './seededRandomProvider.js';

describe('SeededRandomProvider', () => {
  it('returns values in [0, 1)', () => {
    const rng = new SeededRandomProvider(42);
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('same seed produces the same sequence', () => {
    const rng1 = new SeededRandomProvider(12345);
    const rng2 = new SeededRandomProvider(12345);
    for (let i = 0; i < 50; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('different seeds produce different sequences', () => {
    const rng1 = new SeededRandomProvider(1);
    const rng2 = new SeededRandomProvider(2);
    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());
    // The sequences should differ at some point
    expect(seq1).not.toEqual(seq2);
  });

  it('produces different values on consecutive calls', () => {
    const rng = new SeededRandomProvider(999);
    const a = rng.next();
    const b = rng.next();
    // For Mulberry32, consecutive values from the same instance differ
    expect(a).not.toBe(b);
  });

  it('seed 0 is accepted and produces a valid sequence', () => {
    const rng = new SeededRandomProvider(0);
    const v = rng.next();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });
});
