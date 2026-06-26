import type { Card } from '../types/card.js';

export interface DeckValidationResult {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<string>;
}

const DECK_SIZE = 48;
const CARDS_PER_MONTH = 4;
const MIN_MONTH = 1;
const MAX_MONTH = 12;

/**
 * Validates a deck against the structural invariants required by the engine.
 *
 * Does NOT check gameplay state — only deck composition.
 * Called during tests and at game initialisation to catch configuration errors.
 */
export function validateDeck(deck: readonly Card[]): DeckValidationResult {
  const errors: string[] = [];

  // 1. Total card count
  if (deck.length !== DECK_SIZE) {
    errors.push(`Deck must contain exactly ${DECK_SIZE} cards; found ${deck.length}.`);
  }

  // 2. Unique cardIds
  const ids = deck.map((c) => c.id);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    errors.push(`Duplicate cardIds found: ${[...new Set(duplicates)].join(', ')}.`);
  }

  // 3. All months in valid range
  const outOfRange = deck.filter((c) => c.month < MIN_MONTH || c.month > MAX_MONTH);
  if (outOfRange.length > 0) {
    errors.push(
      `Cards with month out of range [${MIN_MONTH}–${MAX_MONTH}]: ${outOfRange.map((c) => c.id).join(', ')}.`,
    );
  }

  // 4. Each month has exactly CARDS_PER_MONTH cards
  for (let m = MIN_MONTH; m <= MAX_MONTH; m++) {
    const count = deck.filter((c) => c.month === m).length;
    if (count !== CARDS_PER_MONTH) {
      errors.push(`Month ${m} must have exactly ${CARDS_PER_MONTH} cards; found ${count}.`);
    }
  }

  // 5. matchingGroup is a valid month
  const badMatchingGroup = deck.filter(
    (c) => c.matchingGroup < MIN_MONTH || c.matchingGroup > MAX_MONTH,
  );
  if (badMatchingGroup.length > 0) {
    errors.push(
      `Cards with invalid matchingGroup: ${badMatchingGroup.map((c) => c.id).join(', ')}.`,
    );
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Throws if the deck fails validation.
 * Use at game initialisation to catch configuration errors early.
 */
export function assertValidDeck(deck: readonly Card[]): void {
  const result = validateDeck(deck);
  if (!result.valid) {
    throw new Error(`Invalid deck:\n${result.errors.map((e) => `  • ${e}`).join('\n')}`);
  }
}
