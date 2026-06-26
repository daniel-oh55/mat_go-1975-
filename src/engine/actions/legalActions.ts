import type { GameAction, PlayCardAction, AiPlayCardAction } from '../types/action.js';
import type { GameState } from '../state/gameState.js';
import { findMatchingFieldCards } from '../rules/matching.js';

/**
 * Returns all legal GameActions for the current state.
 *
 * Rules by phase:
 * - 'playing'      : one PLAY_CARD (human) or AI_PLAY_CARD (ai) per card-and-
 *                    target combination. When a hand card has 2+ same-group
 *                    field cards, one action is generated per valid target
 *                    (targetFieldCardId set). When 0 or 1 match, targetFieldCardId
 *                    is omitted.
 * - 'pendingGoStop': only CHOOSE_GO and CHOOSE_STOP are legal.
 * - 'ended'        : no legal actions (empty array).
 * - 'ready'        : no legal actions (not used in MVP; newGame starts at 'playing').
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

  const actions: GameAction[] = [];
  const isAi = currentPlayer.kind === 'ai';

  for (const card of hand) {
    const matches = findMatchingFieldCards(card, state.fieldCards);

    if (matches.length < 2) {
      // 0 or 1 field match: one action, no target required
      if (isAi) {
        actions.push({ type: 'AI_PLAY_CARD', cardId: card.id } satisfies AiPlayCardAction);
      } else {
        actions.push({ type: 'PLAY_CARD', cardId: card.id } satisfies PlayCardAction);
      }
    } else {
      // 2+ field matches: one action per valid target (OD-2)
      for (const match of matches) {
        if (isAi) {
          actions.push({
            type: 'AI_PLAY_CARD',
            cardId: card.id,
            targetFieldCardId: match.id,
          } satisfies AiPlayCardAction);
        } else {
          actions.push({
            type: 'PLAY_CARD',
            cardId: card.id,
            targetFieldCardId: match.id,
          } satisfies PlayCardAction);
        }
      }
    }
  }

  return actions;
}

function getPendingGoStopActions(state: GameState): GameAction[] {
  if (state.pendingDecision === null) {
    // Defensive: invalid state (caught by validateGameState), return nothing
    return [];
  }
  return [{ type: 'CHOOSE_GO' }, { type: 'CHOOSE_STOP' }];
}
