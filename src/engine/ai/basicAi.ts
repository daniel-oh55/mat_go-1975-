import type { GameState } from '../state/gameState.js';
import type { RandomProvider } from '../rng/randomProvider.js';
import type { AiActionSelectionResult } from './aiResult.js';
import { getLegalActions } from '../actions/legalActions.js';

/**
 * Selects one legal action for the current game state.
 *
 * Strategy (MVP — correctness-first):
 *   pendingGoStop phase: always CHOOSE_STOP (conservative MVP default).
 *     Go strategy is deferred — the goal is game completion, not score
 *     maximisation.
 *   playing phase: verified AI turn only; uniform random selection from
 *     the AI_PLAY_CARD legal action set.
 *   ended / ready: failure — no legal actions.
 *
 * Safety:
 *   In playing phase the function checks that state.currentTurn belongs to
 *   a player with kind === 'ai'. Calling it on a human turn returns failure
 *   rather than selecting a PLAY_CARD action on the human's behalf.
 *
 * Constraints:
 *   - Never accesses hidden information (opponent hand, draw pile order).
 *   - Never mutates GameState.
 *   - Never calls the engine directly — caller submits the returned action.
 *   - Never adjusts behaviour based on difficulty or monetisation.
 */
export function selectBasicAiAction(
  state: GameState,
  randomProvider: RandomProvider,
): AiActionSelectionResult {
  // Go/Stop phase: guard that the deciding player is the AI, then always Stop
  if (state.phase === 'pendingGoStop') {
    const decision = state.pendingDecision;
    if (decision === null) {
      return {
        success: false,
        reason: 'pendingGoStop phase but pendingDecision is null',
      };
    }
    const decidingPlayer = state.players.find((p) => p.id === decision.playerId);
    if (decidingPlayer === undefined) {
      return {
        success: false,
        reason: `No player found for pendingDecision.playerId "${decision.playerId}"`,
      };
    }
    if (decidingPlayer.kind !== 'ai') {
      return {
        success: false,
        reason: 'Current player is not AI',
      };
    }
    return { success: true, action: { type: 'CHOOSE_STOP' } };
  }

  // Only the playing phase has AI_PLAY_CARD actions
  if (state.phase !== 'playing') {
    return {
      success: false,
      reason: `No legal actions available in phase "${state.phase}"`,
    };
  }

  // Guard: verify the current turn belongs to an AI player
  const currentPlayer = state.players.find((p) => p.id === state.currentTurn);
  if (currentPlayer === undefined) {
    return {
      success: false,
      reason: `No player found for currentTurn "${state.currentTurn}"`,
    };
  }
  if (currentPlayer.kind !== 'ai') {
    return {
      success: false,
      reason: 'Current player is not AI',
    };
  }

  // Collect AI_PLAY_CARD candidates (getLegalActions returns these when kind==='ai')
  const legalActions = getLegalActions(state);
  const aiActions = legalActions.filter((a) => a.type === 'AI_PLAY_CARD');

  if (aiActions.length === 0) {
    return {
      success: false,
      reason: 'No AI_PLAY_CARD actions available',
    };
  }

  // Uniform random selection
  const index = Math.floor(randomProvider.next() * aiActions.length);
  const action = aiActions[index]!;
  return { success: true, action };
}
