import type { Card } from '../types/card.js';

/**
 * Returns all field cards whose matchingGroup equals the source card's
 * matchingGroup. In the default MVP deck, matchingGroup === month, so
 * this is equivalent to same-month matching.
 *
 * The function operates on matchingGroup (not month) so that custom decks
 * or future variant rules can control grouping independently of month.
 */
export function findMatchingFieldCards(
  card: Card,
  fieldCards: ReadonlyArray<Card>,
): Card[] {
  return fieldCards.filter((f) => f.matchingGroup === card.matchingGroup);
}

/**
 * Returns true when two or more field cards share the source card's
 * matchingGroup. Used to determine whether the player must specify a
 * targetFieldCardId (OD-2).
 */
export function hasMultipleMatchingFieldCards(
  card: Card,
  fieldCards: ReadonlyArray<Card>,
): boolean {
  return findMatchingFieldCards(card, fieldCards).length >= 2;
}
