import type { GameAction, PlayCardAction, AiPlayCardAction } from '../types/action.js';
import type { GameState } from '../state/gameState.js';

/**
 * Returns all legal GameActions for the current state.
 *
 * Rules by phase:
 * - 'playing'      : one PLAY_CARD (human) or AI_PLAY_CARD (ai) per card in
 *                    the current player's hand.
 * - 'pendingGoStop': only CHOOSE_GO and CHOOSE_STOP are legal.
 * - 'ended'        : no legal actions (empty array).
 * - 'ready'        : no legal actions (not used in MVP; newGame starts at 'playing').
 *
 * NOTE (M2-PR5): When field matching is implemented, cards with multiple
 * same-month field candidates will include targetFieldCardId options.
 * The current implementation omits targetFieldCardId because field matching
 * is not yet available.
 */
export function getLegalActions(state: GameState): GameAction[] {
  switch (state.phase) {
    case 'playing':
      return getPlayingActions(state);
    case 'pendingGoStop':
      return getPendingGoStopActions(state);
    case 'ended':
    case 'ready':
      return [];
  }
}

function getPlayingActions(state: GameState): GameAction[] {
  const hand = state.playerHands[state.currentTurn];
  if (hand === undefined || hand.length === 0) return [];

  const currentPlayer = state.players.find((p) => p.id === state.currentTurn);
  if (currentPlayer === undefined) return [];

  if (currentPlayer.kind === 'ai') {
    return hand.map(
      (card): AiPlayCardAction => ({
        type: 'AI_PLAY_CARD',
        cardId: card.id,
      }),
    );
  }

  // human player
  return hand.map(
    (card): PlayCardAction => ({
      type: 'PLAY_CARD',
      cardId: card.id,
      // targetFieldCardId is omitted here; M2-PR5 will add it when
      // multiple same-month field cards exist (OD-2).
    }),
  );
}

function getPendingGoStopActions(state: GameState): GameAction[] {
  if (state.pendingDecision === null) {
    // Defensive: invalid state (caught by validateGameState), return nothing
    return [];
  }
  return [{ type: 'CHOOSE_GO' }, { type: 'CHOOSE_STOP' }];
}
