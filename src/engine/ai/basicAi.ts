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
 *   playing phase: select uniformly at random from the legal action set.
 *
 * Constraints:
 *   - Never accesses hidden information (opponent hand, draw pile order).
 *   - Never mutates GameState.
 *   - Never calls the engine directly — caller submits the returned action.
 *   - Never adjusts behaviour based on player kind, difficulty, or monetisation.
 */
export function selectBasicAiAction(
  state: GameState,
  randomProvider: RandomProvider,
): AiActionSelectionResult {
  // Go/Stop phase: always Stop in MVP (conservative default)
  if (state.phase === 'pendingGoStop') {
    return { success: true, action: { type: 'CHOOSE_STOP' } };
  }

  const legalActions = getLegalActions(state);

  if (legalActions.length === 0) {
    return {
      success: false,
      reason: `No legal actions available in phase "${state.phase}"`,
    };
  }

  // Uniform random selection
  const index = Math.floor(randomProvider.next() * legalActions.length);
  const action = legalActions[index]!;
  return { success: true, action };
}
