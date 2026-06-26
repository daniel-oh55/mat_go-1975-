/**
 * Unique identifier for each of the 48 cards in a Hanafuda deck.
 * Format is implementation-defined (e.g., "jan-gwang", "feb-pi-1").
 */
export type CardId = string;

/**
 * The month (suit) of a card. Cards match each other by month.
 * Values 1–12 correspond to January through December.
 */
export type CardMonth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/**
 * The scoring category of a card.
 * - gwang: bright card (5 total in the deck)
 * - yeol: animal/high-value card
 * - tti: ribbon card
 * - pi: chaff (lowest value)
 */
export type CardCategory = 'gwang' | 'yeol' | 'tti' | 'pi';

/**
 * The role a card plays within its scoring group.
 * Used for advanced scoring calculations (deferred to Ruleset expansion).
 * - standard: no special role within the group
 * - godori: one of the three godori animal cards
 * - ribbon-red: hongdan ribbon
 * - ribbon-blue: cheongdan ribbon
 * - ribbon-plant: chodan ribbon
 * - double-pi: counts as two pi
 * - bi-gwang: the rain bright (special handling in some rule sets)
 */
export type CardScoreRole =
  | 'standard'
  | 'godori'
  | 'ribbon-red'
  | 'ribbon-blue'
  | 'ribbon-plant'
  | 'double-pi'
  | 'bi-gwang';

/**
 * Optional flags for advanced rule handling.
 * Not used in MVP core rules; reserved for Ruleset expansion.
 */
export type CardFlag = 'bi-gwang' | 'double-pi';

/**
 * Engine representation of a Hanafuda card.
 * Contains only rule-relevant metadata.
 *
 * Must NOT include: image paths, story descriptions, NPC meanings,
 * lore text, or any content-layer data.
 */
export interface Card {
  /** Unique identifier for this specific card */
  readonly id: CardId;
  /** Month/suit of the card (1–12) — determines which cards match */
  readonly month: CardMonth;
  /** Scoring category */
  readonly category: CardCategory;
  /** Short label for logging and debugging */
  readonly name: string;
  /** Role within the scoring group; drives advanced score calculation */
  readonly scoreRole: CardScoreRole;
  /**
   * The group this card belongs to for capture matching.
   * In basic rules, matchingGroup === month.
   * Reserved as a separate field to allow future rule variants.
   */
  readonly matchingGroup: CardMonth;
  /** Optional flags for advanced rule handling (deferred) */
  readonly flags?: ReadonlyArray<CardFlag>;
}
