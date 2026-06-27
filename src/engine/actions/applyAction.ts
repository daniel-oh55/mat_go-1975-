import type { Card } from '../types/card.js';
import type { PlayerId } from '../types/player.js';
import type { GameAction } from '../types/action.js';
import type { GameEvent } from '../types/event.js';
import type { GameState } from '../state/gameState.js';
import type { PlayerScoreState } from '../types/score.js';
import type { FinalResult } from '../types/result.js';
import { assertValidGameState } from '../state/stateValidation.js';
import { resolveCardAgainstField } from '../rules/captureResolution.js';
import { calculateScore } from '../scoring/scoring.js';
import { validateAction } from './actionValidation.js';
import type { EngineActionResult } from './actionResult.js';
import { ENGINE_ERROR_CODES } from './actionResult.js';

/**
 * Applies a GameAction to produce a new GameState.
 *
 * Handled actions:
 *   PLAY_CARD / AI_PLAY_CARD — core card-play turn sequence:
 *     1. Validate legality.
 *     2. Remove played card from hand.
 *     3. Resolve played card against field (match → capture, no match → field).
 *     4. Reveal drawPile[0]; remove from draw pile.
 *     5. Resolve revealed card against updated field.
 *     6. Move captured cards to current player's capturedCards.
 *     7. Recalculate score. Emit SCORE_CHANGED if score increased.
 *     8. If new score >= threshold AND score increased: emit GO_STOP_DECISION_REQUIRED,
 *        phase → pendingGoStop (turn does NOT advance).
 *        Otherwise: emit TURN_CHANGED, advance turn to opponent.
 *     9. Assert state invariants.
 *
 *   CHOOSE_GO — player declares Go; game continues:
 *     1. Validate legality (only legal in pendingGoStop phase).
 *     2. Increment goCount for the declaring player.
 *     3. Emit GO_DECLARED and TURN_CHANGED.
 *     4. Phase → playing; advance turn to opponent.
 *
 *   CHOOSE_STOP — player declares Stop; game ends:
 *     1. Validate legality.
 *     2. Determine winner by score comparison (tie → winner: null).
 *     3. Emit STOP_DECLARED and GAME_ENDED.
 *     4. Phase → ended.
 */
export function applyAction(
  state: GameState,
  action: GameAction,
): EngineActionResult {
  // ── CHOOSE_GO ─────────────────────────────────────────────────────────────
  if (action.type === 'CHOOSE_GO') {
    const validation = validateAction(state, action);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: ENGINE_ERROR_CODES.ILLEGAL_ACTION,
          message: validation.reason ?? 'CHOOSE_GO is not legal in the current state',
        },
      };
    }

    // pendingDecision is guaranteed non-null when CHOOSE_GO is legal
    const decision = state.pendingDecision!;
    const declaringPlayerId = decision.playerId;
    const opponentPlayer = state.players.find((p) => p.id !== declaringPlayerId);

    if (opponentPlayer === undefined) {
      return {
        success: false,
        error: {
          code: ENGINE_ERROR_CODES.INVALID_STATE,
          message: 'Cannot resolve opponent from state',
        },
      };
    }

    const oldGoCount = state.goStopState[declaringPlayerId]?.goCount ?? 0;
    const newGoCount = oldGoCount + 1;

    const goEvents: GameEvent[] = [
      { type: 'GO_DECLARED', playerId: declaringPlayerId, goCount: newGoCount },
      { type: 'TURN_CHANGED', fromPlayerId: declaringPlayerId, toPlayerId: opponentPlayer.id },
    ];

    const goNextState: GameState = {
      ...state,
      currentTurn: opponentPlayer.id,
      phase: 'playing',
      pendingDecision: null,
      finalResult: null,
      goStopState: {
        ...state.goStopState,
        [declaringPlayerId]: { goCount: newGoCount },
      },
    };

    assertValidGameState(goNextState);
    return { success: true, state: goNextState, events: goEvents };
  }

  // ── CHOOSE_STOP ───────────────────────────────────────────────────────────
  if (action.type === 'CHOOSE_STOP') {
    const validation = validateAction(state, action);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: ENGINE_ERROR_CODES.ILLEGAL_ACTION,
          message: validation.reason ?? 'CHOOSE_STOP is not legal in the current state',
        },
      };
    }

    const decision = state.pendingDecision!;
    const declaringPlayerId = decision.playerId;

    // Determine winner by score comparison (2-player MVP)
    const p1 = state.players[0]!;
    const p2 = state.players[1]!;
    const p1Score = state.scoreState[p1.id]?.total ?? 0;
    const p2Score = state.scoreState[p2.id]?.total ?? 0;

    let winner: PlayerId | null;
    if (p1Score > p2Score) {
      winner = p1.id;
    } else if (p2Score > p1Score) {
      winner = p2.id;
    } else {
      winner = null; // draw
    }

    const finalResult: FinalResult = {
      winner,
      scores: { ...state.scoreState } as Readonly<Record<PlayerId, PlayerScoreState>>,
      reason: 'stop',
    };

    const stopEvents: GameEvent[] = [
      { type: 'STOP_DECLARED', playerId: declaringPlayerId },
      { type: 'GAME_ENDED', result: finalResult },
    ];

    const stopNextState: GameState = {
      ...state,
      phase: 'ended',
      pendingDecision: null,
      finalResult: finalResult,
    };

    assertValidGameState(stopNextState);
    return { success: true, state: stopNextState, events: stopEvents };
  }

  // ── Guard: only PLAY_CARD and AI_PLAY_CARD beyond this point ──────────────
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

  // Trigger only when score actually increases above (or reaches) the threshold.
  // Without the `> oldScore.total` guard, a player who declared Go would retrigger
  // every subsequent turn even if their score stayed flat.
  const goStopTriggered =
    newScore.total >= state.ruleset.goStopThreshold && newScore.total > oldScore.total;

  if (goStopTriggered) {
    events.push({ type: 'GO_STOP_DECISION_REQUIRED', playerId: currentPlayer.id });
  } else {
    events.push({
      type: 'TURN_CHANGED',
      fromPlayerId: currentPlayer.id,
      toPlayerId: opponentPlayer.id,
    });
  }

  // ── Build next state (immutable) ──────────────────────────────────────────
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
    finalResult: null,
  };

  // ── Assert invariants ─────────────────────────────────────────────────────
  assertValidGameState(nextState);

  return { success: true, state: nextState, events };
}
