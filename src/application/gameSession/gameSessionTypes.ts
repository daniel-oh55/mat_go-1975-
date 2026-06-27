import type { GameState } from '../../engine/state/gameState.js';
import type { GameEvent } from '../../engine/types/event.js';
import type { GameViewModel } from './gameViewModel.js';

/**
 * The phase of the game session from the Application Layer's perspective.
 *
 * 'idle'          — No active game. Waiting for the player to start.
 * 'playing'       — Game is active; the current player selects a card.
 * 'pendingGoStop' — Score threshold reached; awaiting a Go/Stop decision.
 * 'ended'         — Game is over. FinalResult is available in the view model.
 */
export type SessionPhase = 'idle' | 'playing' | 'pendingGoStop' | 'ended';

/**
 * Application-layer session state.
 *
 * Wraps the engine's GameState with application concerns: event history,
 * a pre-computed UI view model, and error reporting.
 *
 * UI components interact only with this type — never directly with GameState.
 */
export interface GameSessionState {
  /** Underlying engine state. Null when phase is 'idle'. */
  readonly gameState: GameState | null;
  /** Events produced by the most recent engine action. */
  readonly lastEvents: ReadonlyArray<GameEvent>;
  /** All events accumulated since game start. */
  readonly allEvents: ReadonlyArray<GameEvent>;
  /** Application-layer phase derived from gameState.phase. */
  readonly phase: SessionPhase;
  /** Pre-computed UI view model. Null when phase is 'idle'. */
  readonly viewModel: GameViewModel | null;
  /** Last error message if an action failed. Null when no error. */
  readonly error: string | null;
}
