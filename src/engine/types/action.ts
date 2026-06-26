import type { CardId } from './card.js';

/**
 * Discriminated union of all possible actions a player (human or AI) can submit.
 *
 * GameAction represents intent — it is produced by the Application layer
 * from UI events or AI decisions, then submitted to the engine for validation.
 *
 * A UI click event is NOT a GameAction. The Application layer converts UI
 * events into a GameAction before passing it to the engine.
 * AI actions go through the same validation path as human actions.
 */
export type GameAction =
  | StartGameAction
  | PlayCardAction
  | AiPlayCardAction
  | ChooseGoAction
  | ChooseStopAction
  | ResolvePendingDecisionAction;

/** String union of all valid action type names */
export type GameActionType = GameAction['type'];

// ---------------------------------------------------------------------------
// Individual action types
// ---------------------------------------------------------------------------

/** Initialise a new game. Submitted once per session before any card play. */
export interface StartGameAction {
  readonly type: 'START_GAME';
}

/**
 * A human player plays a card from their hand.
 *
 * targetFieldCardId is required when two or more field cards share the same
 * month as the played card (OD-2 resolution). The engine validates that the
 * selected target is a legal same-month field card.
 * For a single match, targetFieldCardId may be omitted; the engine captures
 * the only matching card automatically.
 */
export interface PlayCardAction {
  readonly type: 'PLAY_CARD';
  /** The card being played from the player's hand */
  readonly cardId: CardId;
  /** Required when multiple same-month field cards exist (OD-2) */
  readonly targetFieldCardId?: CardId;
}

/**
 * The AI plays a card from its hand.
 * Structurally identical to PlayCardAction; separated to make
 * the source of the action explicit in the event log.
 */
export interface AiPlayCardAction {
  readonly type: 'AI_PLAY_CARD';
  readonly cardId: CardId;
  readonly targetFieldCardId?: CardId;
}

/** The current player (human or AI) declares Go — the game continues. */
export interface ChooseGoAction {
  readonly type: 'CHOOSE_GO';
}

/** The current player (human or AI) declares Stop — the game ends. */
export interface ChooseStopAction {
  readonly type: 'CHOOSE_STOP';
}

/**
 * Resolves a multi-step pending decision if the engine requires an
 * explicit resolution step beyond CHOOSE_GO / CHOOSE_STOP.
 * Reserved for future use.
 */
export interface ResolvePendingDecisionAction {
  readonly type: 'RESOLVE_PENDING_DECISION';
}
