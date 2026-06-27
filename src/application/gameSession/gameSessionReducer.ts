import type { GameSessionState } from './gameSessionTypes.js';
import type { SessionPhase } from './gameSessionTypes.js';
import type { GameAction } from '../../engine/types/action.js';
import type { RandomProvider } from '../../engine/rng/randomProvider.js';
import { applyAction } from '../../engine/actions/applyAction.js';
import { selectBasicAiAction } from '../../engine/ai/basicAi.js';
import { buildGameViewModel } from './gameViewModel.js';
import { createGameSession, HUMAN_PLAYER_ID, AI_PLAYER_ID } from './createGameSession.js';
import type { GamePhase } from '../../engine/state/gameState.js';

/**
 * Actions the Application Layer can dispatch to update session state.
 *
 * 'START_GAME'          — Start a new game. Resets any existing session.
 * 'SUBMIT_HUMAN_ACTION' — Submit a human player's action to the engine.
 *                         Caller is responsible for only dispatching this when
 *                         it is actually the human's turn.
 * 'ADVANCE_AI'          — Trigger the AI to take one action. The React layer
 *                         dispatches this in a useEffect loop until the turn
 *                         returns to the human (or the game ends).
 */
export type GameSessionReducerAction =
  | { readonly type: 'START_GAME'; readonly randomProvider: RandomProvider }
  | { readonly type: 'SUBMIT_HUMAN_ACTION'; readonly action: GameAction }
  | { readonly type: 'ADVANCE_AI'; readonly randomProvider: RandomProvider };

function toSessionPhase(enginePhase: GamePhase): SessionPhase {
  if (enginePhase === 'ended') return 'ended';
  if (enginePhase === 'pendingGoStop') return 'pendingGoStop';
  return 'playing';
}

/**
 * Pure reducer for game session state.
 *
 * This is the Application Layer boundary — all engine calls originate here.
 * UI components must never call applyAction or selectBasicAiAction directly.
 *
 * START_GAME:
 *   Creates a fresh game session. Any in-progress game is discarded.
 *
 * SUBMIT_HUMAN_ACTION:
 *   Passes the action to the engine for validation and application.
 *   Returns an error state if no game is active, the game is over,
 *   or the engine rejects the action.
 *
 * ADVANCE_AI:
 *   Asks the basic AI to select and submit one action.
 *   Returns an error state if selection or application fails.
 *   No-op if the game has already ended.
 */
export function gameSessionReducer(
  state: GameSessionState,
  action: GameSessionReducerAction,
): GameSessionState {
  switch (action.type) {
    case 'START_GAME': {
      return createGameSession(action.randomProvider);
    }

    case 'SUBMIT_HUMAN_ACTION': {
      if (state.gameState === null) {
        return { ...state, lastEvents: [], error: 'No active game session' };
      }
      if (state.phase === 'ended') {
        return { ...state, lastEvents: [], error: 'Game is already over' };
      }

      const enginePhase = state.gameState.phase;

      if (enginePhase === 'playing') {
        if (state.gameState.currentTurn !== HUMAN_PLAYER_ID) {
          return { ...state, lastEvents: [], error: 'Not human turn' };
        }
        if (action.action.type !== 'PLAY_CARD') {
          return {
            ...state,
            lastEvents: [],
            error: 'Human can only submit PLAY_CARD during playing phase',
          };
        }
      } else if (enginePhase === 'pendingGoStop') {
        if (state.gameState.pendingDecision?.playerId !== HUMAN_PLAYER_ID) {
          return {
            ...state,
            lastEvents: [],
            error: 'Not human pendingGoStop decision',
          };
        }
        if (action.action.type !== 'CHOOSE_GO' && action.action.type !== 'CHOOSE_STOP') {
          return {
            ...state,
            lastEvents: [],
            error: 'Human can only submit CHOOSE_GO or CHOOSE_STOP during pendingGoStop phase',
          };
        }
      }

      const result = applyAction(state.gameState, action.action);
      if (!result.success) {
        return { ...state, lastEvents: [], error: result.error.message };
      }

      const nextState = result.state;
      return {
        gameState: nextState,
        lastEvents: result.events,
        allEvents: [...state.allEvents, ...result.events],
        phase: toSessionPhase(nextState.phase),
        viewModel: buildGameViewModel(nextState, HUMAN_PLAYER_ID, AI_PLAYER_ID),
        error: null,
      };
    }

    case 'ADVANCE_AI': {
      if (state.gameState === null) {
        return { ...state, lastEvents: [], error: 'No active game session' };
      }
      if (state.phase === 'ended') {
        return state;
      }

      const aiEnginePhase = state.gameState.phase;

      // No-op when it is not the AI's turn — the UI useEffect guards already
      // prevent this in normal flow; the no-op here is a safe fallback.
      if (aiEnginePhase === 'playing') {
        if (state.gameState.currentTurn === HUMAN_PLAYER_ID) {
          return state;
        }
      } else if (aiEnginePhase === 'pendingGoStop') {
        if (state.gameState.pendingDecision?.playerId === HUMAN_PLAYER_ID) {
          return state;
        }
      }

      const selection = selectBasicAiAction(state.gameState, action.randomProvider);
      if (!selection.success) {
        return { ...state, lastEvents: [], error: `AI selection failed: ${selection.reason}` };
      }

      const result = applyAction(state.gameState, selection.action);
      if (!result.success) {
        return {
          ...state,
          lastEvents: [],
          error: `AI action failed: ${result.error.message}`,
        };
      }

      const nextState = result.state;
      return {
        gameState: nextState,
        lastEvents: result.events,
        allEvents: [...state.allEvents, ...result.events],
        phase: toSessionPhase(nextState.phase),
        viewModel: buildGameViewModel(nextState, HUMAN_PLAYER_ID, AI_PLAYER_ID),
        error: null,
      };
    }
  }
}
