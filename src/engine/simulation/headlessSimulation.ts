import type { EnginePlayer, GameState } from '../state/gameState.js';
import type { RandomProvider } from '../rng/randomProvider.js';
import type { HeadlessSimulationResult } from './simulationResult.js';
import { newGame } from '../state/newGame.js';
import { applyAction } from '../actions/applyAction.js';
import { selectBasicAiAction } from '../ai/basicAi.js';

const DEFAULT_MAX_ACTIONS = 500;

export interface HeadlessSimulationConfig {
  /**
   * Players for the game. All players must have kind 'ai' — the simulation
   * uses selectBasicAiAction, which returns failure on human-player turns.
   */
  readonly players: ReadonlyArray<EnginePlayer>;
  readonly randomProvider: RandomProvider;
  /**
   * Hard upper bound on the number of actions applied before aborting.
   * A valid 2-player Matgo game completes in ≤ 60 actions; the default
   * of 500 guards against engine bugs without constraining real games.
   */
  readonly maxActions?: number;
}

/**
 * Runs a complete Matgo game from newGame() to phase 'ended' without any UI.
 *
 * Each iteration:
 *   1. Select an action via selectBasicAiAction.
 *   2. Apply it via applyAction.
 *   3. Advance state.
 *
 * Terminates when the game phase reaches 'ended' (Stop or draw-pile
 * exhaustion) or when the maxActions ceiling is hit.
 */
export function runHeadlessSimulation(
  config: HeadlessSimulationConfig,
): HeadlessSimulationResult {
  const maxActions = config.maxActions ?? DEFAULT_MAX_ACTIONS;

  let state: GameState = newGame({
    players: config.players,
    randomProvider: config.randomProvider,
  });

  let actionCount = 0;

  while (state.phase !== 'ended') {
    if (actionCount >= maxActions) {
      return {
        status: 'maxTurnsReached',
        finalState: state,
        turnCount: state.turnCount,
        actionCount,
        errors: [`Simulation reached the ${maxActions}-action limit without completing`],
      };
    }

    const selection = selectBasicAiAction(state, config.randomProvider);
    if (!selection.success) {
      return {
        status: 'actionSelectionFailed',
        finalState: state,
        turnCount: state.turnCount,
        actionCount,
        errors: [selection.reason],
      };
    }

    const applied = applyAction(state, selection.action);
    if (!applied.success) {
      return {
        status: 'actionApplicationFailed',
        finalState: state,
        turnCount: state.turnCount,
        actionCount,
        errors: [applied.error.message],
      };
    }

    state = applied.state;
    actionCount++;
  }

  return {
    status: 'completed',
    finalState: state,
    turnCount: state.turnCount,
    actionCount,
    errors: [],
  };
}
