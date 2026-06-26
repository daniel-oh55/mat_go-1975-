import type { Card } from '../types/card.js';
import type { PlayerId, PlayerKind } from '../types/player.js';
import type { Ruleset } from '../types/ruleset.js';

export type GamePhase = 'ready' | 'playing' | 'pendingGoStop' | 'ended';

export interface EnginePlayer {
  readonly id: PlayerId;
  readonly kind: PlayerKind;
}

export interface PlayerScoreState {
  readonly total: number;
}

export interface PlayerGoStopState {
  readonly goCount: number;
}

export interface PendingGoStopDecision {
  readonly type: 'goStop';
  readonly playerId: PlayerId;
}

export type PendingDecision = PendingGoStopDecision;

/**
 * The complete, serializable state of one Matgo game session.
 *
 * Rules:
 * - No class instances, no functions, no platform/UI references.
 * - All card zones hold full Card objects for self-contained serialization.
 * - Card identity across zones is determined by Card.id; no card may appear
 *   in two zones simultaneously (enforced by validateGameState).
 */
export interface GameState {
  readonly players: ReadonlyArray<EnginePlayer>;
  readonly currentTurn: PlayerId;
  readonly phase: GamePhase;
  readonly drawPile: ReadonlyArray<Card>;
  readonly fieldCards: ReadonlyArray<Card>;
  readonly playerHands: Readonly<Record<PlayerId, ReadonlyArray<Card>>>;
  readonly capturedCards: Readonly<Record<PlayerId, ReadonlyArray<Card>>>;
  readonly scoreState: Readonly<Record<PlayerId, PlayerScoreState>>;
  readonly goStopState: Readonly<Record<PlayerId, PlayerGoStopState>>;
  readonly pendingDecision: PendingDecision | null;
  readonly turnCount: number;
  readonly ruleset: Ruleset;
}
