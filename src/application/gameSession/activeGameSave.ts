import type { GameState } from '../../engine/state/gameState.js';
import type { StorageService } from '../storage/StorageService.js';
import type { GameSessionState } from './gameSessionTypes.js';
import { validateGameState } from '../../engine/state/stateValidation.js';
import { buildGameViewModel } from './gameViewModel.js';
import { HUMAN_PLAYER_ID, AI_PLAYER_ID } from './createGameSession.js';

/** Storage key for the Category A active game document. */
export const ACTIVE_GAME_STORAGE_KEY = 'matgo.v1.activeGame';

/** Current schema version. Increment on breaking field changes. */
export const ACTIVE_GAME_SAVE_VERSION = 1 as const;

/** Session phases that are valid for saving. 'idle' and 'ended' are never saved. */
export type ActiveGameSessionPhase = 'playing' | 'pendingGoStop';

/**
 * Category A persistent document — schema version 1.
 *
 * Never contains GameViewModel or derived view state.
 * GameViewModel is re-derived from gameState on restore.
 */
export interface ActiveGameSaveDocumentV1 {
  readonly saveVersion: 1;
  readonly savedAt: string;
  readonly sessionPhase: ActiveGameSessionPhase;
  readonly gameState: GameState;
}

/**
 * Builds the Category A document from game state and session phase.
 * Pure function — does not write to storage.
 */
export function serializeActiveGame(
  gameState: GameState,
  sessionPhase: ActiveGameSessionPhase,
): ActiveGameSaveDocumentV1 {
  return {
    saveVersion: ACTIVE_GAME_SAVE_VERSION,
    savedAt: new Date().toISOString(),
    sessionPhase,
    gameState,
  };
}

/**
 * Writes the active game to storage from the current session.
 *
 * No-op when session.phase is 'idle' or 'ended' — only active sessions are saved.
 * Fire-and-forget: catches and logs write failures; the game always continues.
 */
export async function saveActiveGame(
  storage: StorageService,
  session: GameSessionState,
): Promise<void> {
  const { phase, gameState } = session;
  if (phase !== 'playing' && phase !== 'pendingGoStop') return;
  if (gameState === null) return;

  const doc = serializeActiveGame(gameState, phase);
  try {
    await storage.write(ACTIVE_GAME_STORAGE_KEY, JSON.stringify(doc));
  } catch (err) {
    console.error('[activeGameSave] save failed — game continues:', err);
  }
}

/**
 * Removes the active game document from storage.
 *
 * Called when the game ends or the player starts a new game.
 * Catches and logs delete failures.
 */
export async function deleteActiveGame(storage: StorageService): Promise<void> {
  try {
    await storage.delete(ACTIVE_GAME_STORAGE_KEY);
  } catch (err) {
    console.error('[activeGameSave] delete failed:', err);
  }
}

/**
 * Validates an unknown value as an ActiveGameSaveDocumentV1.
 *
 * Returns the typed document on success, null on any failure.
 *
 * Rejection criteria:
 * - saveVersion not a positive integer, or from a newer app version
 * - sessionPhase not 'playing' or 'pendingGoStop'
 * - sessionPhase does not match gameState.phase (consistency guard)
 * - gameState missing required fields
 * - gameState fails engine invariant validation
 */
export function validateActiveGameDoc(raw: unknown): ActiveGameSaveDocumentV1 | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const obj = raw as Record<string, unknown>;

  // saveVersion: positive integer, not from the future
  const saveVersion = obj['saveVersion'];
  if (typeof saveVersion !== 'number' || !Number.isInteger(saveVersion) || saveVersion < 1) {
    return null;
  }
  if (saveVersion > ACTIVE_GAME_SAVE_VERSION) return null;

  // savedAt: ISO 8601 string
  const savedAt = obj['savedAt'];
  if (typeof savedAt !== 'string') return null;

  // sessionPhase: must be an active-game phase
  const sessionPhase = obj['sessionPhase'];
  if (sessionPhase !== 'playing' && sessionPhase !== 'pendingGoStop') return null;

  // gameState: non-null object with required top-level fields
  const gs = obj['gameState'];
  if (typeof gs !== 'object' || gs === null) return null;

  const gsr = gs as Record<string, unknown>;
  const players = gsr['players'];
  const currentTurn = gsr['currentTurn'];
  const enginePhase = gsr['phase'];
  const drawPile = gsr['drawPile'];
  const fieldCards = gsr['fieldCards'];
  const playerHands = gsr['playerHands'];
  const capturedCards = gsr['capturedCards'];
  const scoreState = gsr['scoreState'];
  const goStopState = gsr['goStopState'];
  const turnCount = gsr['turnCount'];
  const ruleset = gsr['ruleset'];
  const pendingDecision = gsr['pendingDecision'];
  const finalResult = gsr['finalResult'];

  if (!Array.isArray(players)) return null;
  if (typeof currentTurn !== 'string') return null;
  if (typeof enginePhase !== 'string') return null;
  if (!Array.isArray(drawPile)) return null;
  if (!Array.isArray(fieldCards)) return null;
  if (typeof playerHands !== 'object' || playerHands === null) return null;
  if (typeof capturedCards !== 'object' || capturedCards === null) return null;
  if (typeof scoreState !== 'object' || scoreState === null) return null;
  if (typeof goStopState !== 'object' || goStopState === null) return null;
  if (typeof turnCount !== 'number') return null;
  if (typeof ruleset !== 'object' || ruleset === null) return null;
  if (pendingDecision !== null && typeof pendingDecision !== 'object') return null;
  if (finalResult !== null && typeof finalResult !== 'object') return null;

  // sessionPhase must match gameState.phase — a mismatch means a corrupt save
  if (enginePhase !== sessionPhase) return null;

  // Full engine invariant check
  const engineValidation = validateGameState(gs as GameState);
  if (!engineValidation.valid) return null;

  return {
    saveVersion: 1,
    savedAt,
    sessionPhase,
    gameState: gs as GameState,
  };
}

/**
 * Reads, validates, and restores the active game from storage.
 *
 * On success, returns a GameSessionState with a freshly derived GameViewModel —
 * the UI receives the same shape as after a live turn; no special resume mode.
 *
 * Returns null when:
 * - The key does not exist (first run, or deleted on game end)
 * - The stored JSON is malformed
 * - The document fails shape, phase-consistency, or engine validation
 * - The document is from a newer app version
 *
 * Deletes corrupted or invalid documents before returning null.
 */
export async function loadActiveGame(
  storage: StorageService,
): Promise<GameSessionState | null> {
  let raw: string | null;
  try {
    raw = await storage.read(ACTIVE_GAME_STORAGE_KEY);
  } catch (err) {
    console.error('[activeGameSave] read failed:', err);
    return null;
  }

  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error('[activeGameSave] JSON parse failed — deleting corrupted document');
    await deleteActiveGame(storage);
    return null;
  }

  const doc = validateActiveGameDoc(parsed);
  if (doc === null) {
    console.error('[activeGameSave] validation failed — deleting corrupted document');
    await deleteActiveGame(storage);
    return null;
  }

  // Derive a fresh GameViewModel — never use a persisted one
  const viewModel = buildGameViewModel(doc.gameState, HUMAN_PLAYER_ID, AI_PLAYER_ID);

  return {
    gameState: doc.gameState,
    lastEvents: [],
    allEvents: [],
    lastEventMessages: [],
    phase: doc.sessionPhase,
    viewModel,
    error: null,
  };
}
