import type { PlayerId } from './player.js';

/**
 * The logical zone a card can occupy during a game.
 * - hand: a player's private hand (not visible to the opponent)
 * - field: face-up cards visible to all players
 * - drawPile: the face-down draw stack
 * - captured: a player's captured card collection
 */
export type CardZone = 'hand' | 'field' | 'drawPile' | 'captured';

/**
 * Precise location of a card within the game, including owner for
 * player-owned zones (hand, captured).
 *
 * Discriminated union allows exhaustive handling of all zones:
 *   - hand / captured: require an owner PlayerId
 *   - field / drawPile: no owner; shared zones
 */
export type CardLocation =
  | { readonly zone: 'hand'; readonly owner: PlayerId }
  | { readonly zone: 'captured'; readonly owner: PlayerId }
  | { readonly zone: 'field' }
  | { readonly zone: 'drawPile' };
