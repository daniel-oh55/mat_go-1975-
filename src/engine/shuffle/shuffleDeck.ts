import type { Card } from '../types/card.js';
import type { RandomProvider } from '../rng/randomProvider.js';

/**
 * Shuffles a deck of cards using the Fisher-Yates algorithm.
 *
 * Guarantees:
 * - The input deck is never mutated.
 * - The returned deck is a new array containing the same cards.
 * - All 48 unique cardIds are preserved.
 * - Randomness is sourced exclusively from the injected RandomProvider;
 *   Math.random() is never called directly.
 *
 * This is the only shuffle entry point in the engine.
 * It must never be used to produce biased distributions that favor
 * or disadvantage a specific player.
 */
export function shuffleDeck(deck: readonly Card[], randomProvider: RandomProvider): Card[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(randomProvider.next() * (i + 1));
    // i ∈ [1, length-1] and j ∈ [0, i] — both indices are guaranteed in-bounds
    const a = result[i] as Card;
    const b = result[j] as Card;
    result[i] = b;
    result[j] = a;
  }
  return result;
}
