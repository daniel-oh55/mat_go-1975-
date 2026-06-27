import type { EnginePlayer, GameState } from '../state/gameState.js';
import type { RandomProvider } from '../rng/randomProvider.js';
import type { AiActionSelectionResult } from '../ai/aiResult.js';
import type { HeadlessSimulationResult } from './simulationResult.js';
import { newGame } from '../state/newGame.js';
import { applyAction } from '../actions/applyAction.js';
import { getLegalActions } from '../actions/legalActions.js';
import { selectBasicAiAction } from '../ai/basicAi.js';

const DEFAULT_MAX_ACTIONS = 500;

export interface HeadlessSimulationConfig {
  /**
   * Players for the game. Supports both human and AI player kinds.
   * Human turns use a uniform-random PLAY_CARD selection strategy
   * so the simulation can run without any UI.
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
 * Simulation-internal action selector.
 *
 * Supports both AI and human player kinds so the simulation can run
 * without any UI:
 *
 *   pendingGoStop  — always CHOOSE_STOP (conservative default for all
 *                    player kinds; Go strategy is not needed for engine
 *                    verification).
 *   playing, AI    — delegates to selectBasicAiAction (AI_PLAY_CARD,
 *                    uniform random from legal set).
 *   playing, human — selects uniformly from PLAY_CARD legal actions via
 *                    randomProvider so the human turn advances without UI.
 *   other phases   — failure (game should not be in these phases during
 *                    an active simulation loop).
 */
function selectActionForHeadlessSimulation(
  state: GameState,
  randomProvider: RandomProvider,
): AiActionSelectionResult {
  // pendingGoStop: always CHOOSE_STOP regardless of player kind
  if (state.phase === 'pendingGoStop') {
    if (state.pendingDecision === null) {
      return { success: false, reason: 'pendingGoStop phase but pendingDecision is null' };
    }
    return { success: true, action: { type: 'CHOOSE_STOP' } };
  }

  if (state.phase !== 'playing') {
    return { success: false, reason: `No legal actions available in phase "${state.phase}"` };
  }

  const currentPlayer = state.players.find((p) => p.id === state.currentTurn);
  if (currentPlayer === undefined) {
    return { success: false, reason: `No player found for currentTurn "${state.currentTurn}"` };
  }

  // AI turn: delegate to selectBasicAiAction (returns AI_PLAY_CARD)
  if (currentPlayer.kind === 'ai') {
    return selectBasicAiAction(state, randomProvider);
  }

  // Human turn: select uniformly from PLAY_CARD legal actions
  const legalActions = getLegalActions(state);
  const playActions = legalActions.filter((a) => a.type === 'PLAY_CARD');

  if (playActions.length === 0) {
    return { success: false, reason: 'No PLAY_CARD actions available for human player' };
  }

  const index = Math.floor(randomProvider.next() * playActions.length);
  const action = playActions[index]!;
  return { success: true, action };
}

/**
 * Runs a complete Matgo game from newGame() to phase 'ended' without any UI.
 *
 * Supports human+AI and AI+AI player configurations. Human players use a
 * uniform-random PLAY_CARD strategy (via selectActionForHeadlessSimulation)
 * so the simulation can run end-to-end without UI input.
 *
 * Each iteration:
 *   1. Select an action via selectActionForHeadlessSimulation.
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

    const selection = selectActionForHeadlessSimulation(state, config.randomProvider);
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
