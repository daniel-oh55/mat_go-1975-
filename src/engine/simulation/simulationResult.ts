import type { GameState } from '../state/gameState.js';

/**
 * The final status of a headless simulation run.
 *
 * 'completed'              — Game reached phase 'ended' within the action limit.
 * 'maxTurnsReached'        — Simulation hit maxActions without the game ending.
 * 'actionSelectionFailed'  — AI selector returned failure for the current state.
 * 'actionApplicationFailed'— applyAction rejected an AI-selected action.
 * 'invalidState'           — (reserved) state invariant violation detected outside applyAction.
 */
export type SimulationStatus =
  | 'completed'
  | 'maxTurnsReached'
  | 'actionSelectionFailed'
  | 'actionApplicationFailed'
  | 'invalidState';

export interface HeadlessSimulationResult {
  readonly status: SimulationStatus;
  readonly finalState: GameState;
  readonly turnCount: number;
  readonly actionCount: number;
  readonly errors: ReadonlyArray<string>;
}
