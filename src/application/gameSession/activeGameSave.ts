import type { GameState } from '../../engine/state/gameState.js';
import type { StorageService } from '../storage/StorageService.js';
import { validateGameState } from '../../engine/state/stateValidation.js';

/** Storage key for the Category A active game document. */
export const ACTIVE_GAME_KEY = 'matgo.v1.activeGame';

const CURRENT_SAVE_VERSION = 1;

/**
 * Category A persistent document.
 *
 * Only saved when sessionPhase is 'playing' or 'pendingGoStop'.
 * Never saved for 'idle' or 'ended'.
 * GameViewModel and derived view state are never included.
 */
export interface ActiveGameDoc {
  readonly saveVersion: number;
  readonly savedAt: string;
  readonly sessionPhase: 'playing' | 'pendingGoStop';
  readonly gameState: GameState;
}

/**
 * Builds the Category A document from current session state.
 * Does not write to storage — pure data transformation.
 */
export function serializeActiveGame(
  gameState: GameState,
  sessionPhase: 'playing' | 'pendingGoStop',
): ActiveGameDoc {
  return {
    saveVersion: CURRENT_SAVE_VERSION,
    savedAt: new Date().toISOString(),
    sessionPhase,
    gameState,
  };
}

/**
 * Writes the active game document to storage.
 *
 * Fire-and-forget: catches and logs write failures without propagating them.
 * A failed save is non-fatal — the game continues; the save is retried on
 * the next trigger.
 */
export async function saveActiveGame(
  storage: StorageService,
  gameState: GameState,
  sessionPhase: 'playing' | 'pendingGoStop',
): Promise<void> {
  const doc = serializeActiveGame(gameState, sessionPhase);
  try {
    await storage.write(ACTIVE_GAME_KEY, JSON.stringify(doc));
  } catch (err) {
    console.error('[activeGameSave] save failed — game continues:', err);
  }
}

/**
 * Removes the active game document from storage.
 *
 * Called when the game ends or the player starts a fresh game.
 * Catches and logs delete failures without propagating them.
 */
export async function deleteActiveGame(storage: StorageService): Promise<void> {
  try {
    await storage.delete(ACTIVE_GAME_KEY);
  } catch (err) {
    console.error('[activeGameSave] delete failed:', err);
  }
}

/**
 * Validates an unknown value as an ActiveGameDoc.
 *
 * Returns the typed doc on success, null on any validation failure.
 * Callers must delete the stored document and fall back to a fresh start
 * when this returns null.
 */
export function validateActiveGameDoc(raw: unknown): ActiveGameDoc | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const obj = raw as Record<string, unknown>;

  // saveVersion: positive integer within the known range
  const saveVersion = obj['saveVersion'];
  if (typeof saveVersion !== 'number' || !Number.isInteger(saveVersion) || saveVersion < 1) {
    return null;
  }
  if (saveVersion > CURRENT_SAVE_VERSION) {
    // Document from a newer app version — unreadable
    return null;
  }

  // savedAt: string (ISO 8601)
  const savedAt = obj['savedAt'];
  if (typeof savedAt !== 'string') return null;

  // sessionPhase: only active phases are valid saves
  const sessionPhase = obj['sessionPhase'];
  if (sessionPhase !== 'playing' && sessionPhase !== 'pendingGoStop') return null;

  // gameState: non-null object with required top-level fields
  const gs = obj['gameState'];
  if (typeof gs !== 'object' || gs === null) return null;

  const gsr = gs as Record<string, unknown>;
  const players = gsr['players'];
  const currentTurn = gsr['currentTurn'];
  const phase = gsr['phase'];
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
  if (typeof phase !== 'string') return null;
  if (!Array.isArray(drawPile)) return null;
  if (!Array.isArray(fieldCards)) return null;
  if (typeof playerHands !== 'object' || playerHands === null) return null;
  if (typeof capturedCards !== 'object' || capturedCards === null) return null;
  if (typeof scoreState !== 'object' || scoreState === null) return null;
  if (typeof goStopState !== 'object' || goStopState === null) return null;
  if (typeof turnCount !== 'number') return null;
  if (typeof ruleset !== 'object' || ruleset === null) return null;
  // pendingDecision: null or object
  if (pendingDecision !== null && typeof pendingDecision !== 'object') return null;
  // finalResult: null or object
  if (finalResult !== null && typeof finalResult !== 'object') return null;

  // Full engine invariant check
  const engineValidation = validateGameState(gs as GameState);
  if (!engineValidation.valid) return null;

  return {
    saveVersion,
    savedAt,
    sessionPhase,
    gameState: gs as GameState,
  };
}

/**
 * Reads and validates the active game document from storage.
 *
 * Returns null when:
 * - The key does not exist (first run, or game was deleted on end)
 * - The stored JSON is malformed
 * - The document fails shape or engine validation
 * - The document is from a newer app version
 *
 * On validation failure, deletes the corrupted document from storage
 * so the next load attempt starts clean.
 */
export async function loadActiveGame(
  storage: StorageService,
): Promise<ActiveGameDoc | null> {
  let raw: string | null;
  try {
    raw = await storage.read(ACTIVE_GAME_KEY);
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

  return doc;
}
