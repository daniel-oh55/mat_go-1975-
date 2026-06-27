/**
 * Scoring breakdown for one player.
 *
 * Each category field is the score contribution from that category —
 * not the card count. Invariant: total === gwang + yeol + tti + pi.
 *
 * Placed in types/ so both state/ and types/event.ts can import it
 * without a circular dependency.
 */
export interface PlayerScoreState {
  readonly total: number;
  readonly gwang: number;
  readonly yeol: number;
  readonly tti: number;
  readonly pi: number;
}
