import type { PlayerId } from './player.js';
import type { PlayerScoreState } from './score.js';

/** The reason a game ended. */
export type GameEndReason = 'stop';

/**
 * The final outcome of a Matgo game session.
 *
 * winner: the PlayerId of the winning player, or null for a draw.
 * scores: the final score breakdown for each player.
 * reason: why the game ended.
 */
export interface FinalResult {
  readonly winner: PlayerId | null;
  readonly scores: Readonly<Record<PlayerId, PlayerScoreState>>;
  readonly reason: GameEndReason;
}
