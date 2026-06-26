import type { RandomProvider } from './randomProvider.js';

/**
 * Deterministic RandomProvider for tests, replays, and headless simulation.
 *
 * Uses the Mulberry32 PRNG algorithm — simple, fast, and good statistical
 * properties for non-cryptographic use.
 *
 * IMPORTANT: This provider is for tests and debug only.
 * It must NEVER be used in production to manipulate win/loss outcomes
 * or to give a player favorable or unfavorable cards.
 * Difficulty is controlled through AI strategy, not card distribution.
 */
export class SeededRandomProvider implements RandomProvider {
  private seed: number;

  constructor(seed: number) {
    // Ensure unsigned 32-bit integer
    this.seed = seed >>> 0;
  }

  /**
   * Returns the next value in the deterministic sequence.
   * Same seed always produces the same sequence of values.
   */
  next(): number {
    // Mulberry32 step
    this.seed = ((this.seed + 0x6d2b79f5) | 0) >>> 0;
    let t = Math.imul(this.seed ^ (this.seed >>> 15), 1 | this.seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}
