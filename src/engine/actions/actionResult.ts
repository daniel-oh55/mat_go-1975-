import type { GameState } from '../state/gameState.js';
import type { GameEvent } from '../types/event.js';

/**
 * A structured error produced by the engine when an action fails.
 *
 * Codes are stable string constants that the Application layer can
 * switch on without parsing the message string.
 */
export interface EngineError {
  /** Machine-readable error code. */
  readonly code: string;
  /** Human-readable description (for logging / debug; not shown to players). */
  readonly message: string;
}

/**
 * The result of applying a GameAction to a GameState.
 *
 * On success:
 *   - success: true
 *   - state: the new GameState after the action
 *   - events: ordered list of events that describe what happened
 *
 * On failure:
 *   - success: false
 *   - error: why the action was rejected
 *   - state and events are absent (the state is unchanged)
 *
 * NOTE: The actual applyAction reducer is not yet implemented (M2-PR5+).
 * This type is defined here so that the Application layer can be written
 * against a stable interface before the engine logic is complete.
 */
export type EngineActionResult = EngineActionSuccess | EngineActionFailure;

export interface EngineActionSuccess {
  readonly success: true;
  readonly state: GameState;
  readonly events: ReadonlyArray<GameEvent>;
}

export interface EngineActionFailure {
  readonly success: false;
  readonly error: EngineError;
}

// ---------------------------------------------------------------------------
// Predefined error codes
// ---------------------------------------------------------------------------

export const ENGINE_ERROR_CODES = {
  ILLEGAL_ACTION: 'ILLEGAL_ACTION',
  WRONG_TURN: 'WRONG_TURN',
  CARD_NOT_IN_HAND: 'CARD_NOT_IN_HAND',
  INVALID_STATE: 'INVALID_STATE',
} as const;

export type EngineErrorCode =
  (typeof ENGINE_ERROR_CODES)[keyof typeof ENGINE_ERROR_CODES];
