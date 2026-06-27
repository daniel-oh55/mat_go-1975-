import type { GameSessionState } from './gameSessionTypes.js';
import type { RandomProvider } from '../../engine/rng/randomProvider.js';
import { newGame } from '../../engine/state/newGame.js';
import { buildGameViewModel } from './gameViewModel.js';

export const HUMAN_PLAYER_ID = 'human';
export const AI_PLAYER_ID = 'ai';

/**
 * Creates a new active game session with human vs. AI players.
 *
 * The human player always goes first (player[0] in the engine convention).
 * Returns the initial session state with a live game ready to play.
 */
export function createGameSession(randomProvider: RandomProvider): GameSessionState {
  const gameState = newGame({
    players: [
      { id: HUMAN_PLAYER_ID, kind: 'human' },
      { id: AI_PLAYER_ID, kind: 'ai' },
    ],
    randomProvider,
  });

  return {
    gameState,
    lastEvents: [],
    allEvents: [],
    lastEventMessages: [],
    phase: 'playing',
    viewModel: buildGameViewModel(gameState, HUMAN_PLAYER_ID, AI_PLAYER_ID),
    error: null,
  };
}

/**
 * Creates an idle session state with no active game.
 * This is the initial state before the player starts a game.
 */
export function createIdleSession(): GameSessionState {
  return {
    gameState: null,
    lastEvents: [],
    allEvents: [],
    lastEventMessages: [],
    phase: 'idle',
    viewModel: null,
    error: null,
  };
}
