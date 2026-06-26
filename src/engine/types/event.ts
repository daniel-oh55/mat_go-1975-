/**
 * Discriminated union of all events the engine can emit after processing
 * a GameAction.
 *
 * GameEvents express facts about what happened — they are NOT animation
 * commands. The UI layer observes GameEvent[] and decides how to render
 * each event. This design supports replay, logging, and testing independently
 * of any UI.
 *
 * Event payload fields will be added to each type as the implementing PRs
 * build out the engine logic (M2-PR5 through M2-PR9).
 */
export type GameEvent =
  | GameStartedEvent
  | CardPlayedEvent
  | CardMatchedEvent
  | DeckCardRevealedEvent
  | CardCapturedEvent
  | ScoreChangedEvent
  | GoStopDecisionRequiredEvent
  | GoDeclaredEvent
  | StopDeclaredEvent
  | TurnChangedEvent
  | GameEndedEvent
  | InvalidActionRejectedEvent;

/** String union of all valid event type names */
export type GameEventType = GameEvent['type'];

// ---------------------------------------------------------------------------
// Individual event types
// Payload fields are intentionally minimal here; each implementing PR will
// add the relevant data fields as the engine logic is built out.
// ---------------------------------------------------------------------------

/** Emitted once when a game session is initialised. */
export interface GameStartedEvent {
  readonly type: 'GAME_STARTED';
}

/** Emitted when the current player plays a card from their hand. */
export interface CardPlayedEvent {
  readonly type: 'CARD_PLAYED';
}

/** Emitted when a played or revealed card matches one or more field cards. */
export interface CardMatchedEvent {
  readonly type: 'CARD_MATCHED';
}

/** Emitted when the top card of the draw pile is revealed during a turn. */
export interface DeckCardRevealedEvent {
  readonly type: 'DECK_CARD_REVEALED';
}

/** Emitted when one or more cards move to a player's captured area. */
export interface CardCapturedEvent {
  readonly type: 'CARD_CAPTURED';
}

/** Emitted when a player's score changes as a result of a capture. */
export interface ScoreChangedEvent {
  readonly type: 'SCORE_CHANGED';
}

/**
 * Emitted when the current player's score reaches the Go/Stop threshold
 * and a decision is now required before the turn can continue.
 */
export interface GoStopDecisionRequiredEvent {
  readonly type: 'GO_STOP_DECISION_REQUIRED';
}

/** Emitted when the current player declares Go. */
export interface GoDeclaredEvent {
  readonly type: 'GO_DECLARED';
}

/** Emitted when the current player declares Stop. Game ends after this. */
export interface StopDeclaredEvent {
  readonly type: 'STOP_DECLARED';
}

/** Emitted when the turn passes to the opponent. */
export interface TurnChangedEvent {
  readonly type: 'TURN_CHANGED';
}

/** Emitted when the game reaches a terminal state. */
export interface GameEndedEvent {
  readonly type: 'GAME_ENDED';
}

/**
 * Emitted when the engine rejects an illegal action.
 * State is NOT mutated when this event is produced.
 */
export interface InvalidActionRejectedEvent {
  readonly type: 'INVALID_ACTION_REJECTED';
}
