import type { GameAction } from '../types/action.js';
import type { GameState } from '../state/gameState.js';
import { getLegalActions } from './legalActions.js';

export interface ActionValidationResult {
  readonly valid: boolean;
  /** Present only when valid is false. Describes why the action is illegal. */
  readonly reason?: string;
}

/**
 * Validates whether a GameAction is legal in the given state.
 *
 * Delegates to getLegalActions to determine the current legal set, then
 * checks if the submitted action is a member of that set.
 *
 * Comparison rules:
 * - PLAY_CARD / AI_PLAY_CARD: matched by type + cardId + targetFieldCardId
 *   (both absent = match; mismatched or one missing = no match)
 * - CHOOSE_GO / CHOOSE_STOP: matched by type only
 * - START_GAME / RESOLVE_PENDING_DECISION: matched by type only
 */
export function validateAction(
  state: GameState,
  action: GameAction,
): ActionValidationResult {
  const legal = getLegalActions(state);

  if (legal.length === 0) {
    return {
      valid: false,
      reason: `No legal actions in phase "${state.phase}"`,
    };
  }

  const matched = legal.some((candidate) => actionsMatch(candidate, action));
  if (matched) return { valid: true };

  return {
    valid: false,
    reason: `Action ${action.type} is not legal in phase "${state.phase}"`,
  };
}

function actionsMatch(a: GameAction, b: GameAction): boolean {
  if (a.type !== b.type) return false;

  if (a.type === 'PLAY_CARD' && b.type === 'PLAY_CARD') {
    return a.cardId === b.cardId && a.targetFieldCardId === b.targetFieldCardId;
  }

  if (a.type === 'AI_PLAY_CARD' && b.type === 'AI_PLAY_CARD') {
    return a.cardId === b.cardId && a.targetFieldCardId === b.targetFieldCardId;
  }

  // For type-only actions (CHOOSE_GO, CHOOSE_STOP, START_GAME,
  // RESOLVE_PENDING_DECISION), matching on type is sufficient.
  return true;
}
