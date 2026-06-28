export type { SessionPhase, GameSessionState } from './gameSessionTypes.js';
export type { GameViewModel, LegalPlayAction, GameStatusKind, GameStatusDisplay, PlayerScoreBreakdown } from './gameViewModel.js';
export { buildGameViewModel } from './gameViewModel.js';
export {
  HUMAN_PLAYER_ID,
  AI_PLAYER_ID,
  createGameSession,
  createIdleSession,
} from './createGameSession.js';
export type { GameSessionReducerAction } from './gameSessionReducer.js';
export { gameSessionReducer } from './gameSessionReducer.js';
export { formatGameEvents } from './gameEventMessages.js';
export {
  ACTIVE_GAME_KEY,
  serializeActiveGame,
  saveActiveGame,
  deleteActiveGame,
  validateActiveGameDoc,
  loadActiveGame,
} from './activeGameSave.js';
export type { ActiveGameDoc } from './activeGameSave.js';
// Re-exported so UI components import from the Application Layer boundary only.
export type { Card } from '../../engine/types/card.js';
