import type { Card } from '../types/card.js';
import type { GameAction } from '../types/action.js';
import type { GameEvent } from '../types/event.js';
import type { GameState } from '../state/gameState.js';
import { assertValidGameState } from '../state/stateValidation.js';
import { resolveCardAgainstField } from '../rules/captureResolution.js';
import { calculateScore } from '../scoring/scoring.js';
import { validateAction } from './actionValidation.js';
import type { EngineActionResult } from './actionResult.js';
import { ENGINE_ERROR_CODES } from './actionResult.js';

/**
 * Applies a PLAY_CARD or AI_PLAY_CARD action to produce a new GameState.
 *
 * Turn sequence:
 *  1. Validate action against getLegalActions.
 *  2. Remove played card from current player's hand.
 *  3. Resolve played card against field (match → capture, no match → field).
 *  4. Reveal drawPile[0] (the "top" card); remove it from the draw pile.
 *  5. Resolve revealed card against (potentially updated) field.
 *  6. Move all captured cards to current player's capturedCards.
 *  7. Advance currentTurn to opponent; increment turnCount.
 *  8. Assert new state invariants before returning.
 *
 * Only PLAY_CARD and AI_PLAY_CARD are handled. Any other action returns
 * success: false immediately.
 *
 * After all captures, score is recalculated via calculateScore. SCORE_CHANGED
 * is emitted if the score increased. If the new score >= goStopThreshold,
 * GO_STOP_DECISION_REQUIRED is emitted and the phase becomes 'pendingGoStop';
 * the turn does NOT advance. Otherwise TURN_CHANGED is emitted and the turn
 * passes to the opponent.
 *
 * goStopState is NOT modified here (goCount tracking deferred to M2-PR7).
 */
export function applyAction(
  state: GameState,
  action: GameAction,
): EngineActionResult {
  // ── Guard: only card-play actions in this PR ───────────────────────────────
  if (action.type !== 'PLAY_CARD' && action.type !== 'AI_PLAY_CARD') {
    return {
      success: false,
      error: {
        code: ENGINE_ERROR_CODES.ILLEGAL_ACTION,
        message: `Action type "${action.type}" is not handled yet`,
      },
    };
  }

  // ── Validate legality ──────────────────────────────────────────────────────
  const validation = validateAction(state, action);
  if (!validation.valid) {
    return {
      success: false,
      error: {
        code: ENGINE_ERROR_CODES.ILLEGAL_ACTION,
        message: validation.reason ?? 'Action is not legal in the current state',
      },
    };
  }

  // ── Resolve current player and opponent ────────────────────────────────────
  const currentPlayer = state.players.find((p) => p.id === state.currentTurn);
  const opponentPlayer = state.players.find((p) => p.id !== state.currentTurn);

  if (currentPlayer === undefined || opponentPlayer === undefined) {
    return {
      success: false,
      error: {
        code: ENGINE_ERROR_CODES.INVALID_STATE,
        message: 'Cannot resolve current player or opponent from state',
      },
    };
  }

  const { cardId } = action;
  // targetFieldCardId is CardId | undefined; handle exactOptionalPropertyTypes
  const targetFieldCardId = action.targetFieldCardId;

  const events: GameEvent[] = [];

  // ── Step 1: Remove played card from hand ───────────────────────────────────
  const currentHand = state.playerHands[currentPlayer.id] ?? [];
  const playedCard = currentHand.find((c) => c.id === cardId);
  if (playedCard === undefined) {
    return {
      success: false,
      error: {
        code: ENGINE_ERROR_CODES.CARD_NOT_IN_HAND,
        message: `Card "${cardId}" is not in the current player's hand`,
      },
    };
  }
  const newHand: ReadonlyArray<Card> = currentHand.filter((c) => c.id !== cardId);

  events.push({ type: 'CARD_PLAYED', playerId: currentPlayer.id, cardId });

  // ── Step 2: Resolve played card against field ──────────────────────────────
  const handResolution = resolveCardAgainstField(
    targetFieldCardId !== undefined
      ? {
          sourceCard: playedCard,
          fieldCards: state.fieldCards,
          isFromDrawPile: false,
          targetFieldCardId,
        }
      : {
          sourceCard: playedCard,
          fieldCards: state.fieldCards,
          isFromDrawPile: false,
        },
  );

  if (!handResolution.success) {
    return {
      success: false,
      error: {
        code: ENGINE_ERROR_CODES.ILLEGAL_ACTION,
        message: handResolution.reason,
      },
    };
  }

  let currentField = handResolution.updatedFieldCards;
  const allCaptured: Card[] = [...handResolution.capturedCards];

  // ── Step 3: Reveal and resolve top of draw pile ────────────────────────────
  const topCard = state.drawPile[0]; // Card | undefined (noUncheckedIndexedAccess)
  let newDrawPile: ReadonlyArray<Card> = state.drawPile;

  if (topCard !== undefined) {
    newDrawPile = state.drawPile.slice(1);
    events.push({ type: 'DECK_CARD_REVEALED', cardId: topCard.id });

    const drawResolution = resolveCardAgainstField({
      sourceCard: topCard,
      fieldCards: currentField,
      isFromDrawPile: true,
    });

    if (drawResolution.success) {
      currentField = drawResolution.updatedFieldCards;
      allCaptured.push(...drawResolution.capturedCards);
    }
    // If drawResolution fails (defensive - should not happen with isFromDrawPile:true),
    // the top card is effectively lost. This path is unreachable in current logic.
  }

  // ── Step 4: Move captured cards to current player's captured pile ──────────
  const existingCaptured = state.capturedCards[currentPlayer.id] ?? [];
  const newCaptured: ReadonlyArray<Card> = [...existingCaptured, ...allCaptured];

  if (allCaptured.length > 0) {
    events.push({
      type: 'CARD_CAPTURED',
      playerId: currentPlayer.id,
      cardIds: allCaptured.map((c) => c.id),
    });
  }

  // ── Step 5: Calculate score and check Go/Stop threshold ───────────────────
  const oldScore = state.scoreState[currentPlayer.id] ?? { total: 0, gwang: 0, yeol: 0, tti: 0, pi: 0 };
  const newScore = calculateScore(newCaptured);

  if (newScore.total > oldScore.total) {
    events.push({ type: 'SCORE_CHANGED', playerId: currentPlayer.id, score: newScore });
  }

  const goStopTriggered = newScore.total >= state.ruleset.goStopThreshold;

  if (goStopTriggered) {
    events.push({ type: 'GO_STOP_DECISION_REQUIRED', playerId: currentPlayer.id });
  } else {
    events.push({
      type: 'TURN_CHANGED',
      fromPlayerId: currentPlayer.id,
      toPlayerId: opponentPlayer.id,
    });
  }

  // ── Step 6: Build next state (immutable) ───────────────────────────────────
  const nextState: GameState = {
    ...state,
    playerHands: {
      ...state.playerHands,
      [currentPlayer.id]: newHand,
    },
    capturedCards: {
      ...state.capturedCards,
      [currentPlayer.id]: newCaptured,
    },
    scoreState: {
      ...state.scoreState,
      [currentPlayer.id]: newScore,
    },
    fieldCards: currentField,
    drawPile: newDrawPile,
    currentTurn: goStopTriggered ? state.currentTurn : opponentPlayer.id,
    turnCount: state.turnCount + 1,
    phase: goStopTriggered ? 'pendingGoStop' : 'playing',
    pendingDecision: goStopTriggered
      ? { type: 'goStop', playerId: currentPlayer.id }
      : null,
  };

  // ── Step 6: Assert invariants ──────────────────────────────────────────────
  assertValidGameState(nextState);

  return { success: true, state: nextState, events };
}
