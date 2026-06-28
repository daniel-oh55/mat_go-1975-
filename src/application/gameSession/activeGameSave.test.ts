import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStorageService } from '../../platform/storage/InMemoryStorageService.js';
import { newGame } from '../../engine/state/newGame.js';
import { SeededRandomProvider } from '../../engine/rng/seededRandomProvider.js';
import type { GameState } from '../../engine/state/gameState.js';
import type { GameSessionState } from './gameSessionTypes.js';
import { buildGameViewModel } from './gameViewModel.js';
import { HUMAN_PLAYER_ID, AI_PLAYER_ID } from './createGameSession.js';
import {
  ACTIVE_GAME_STORAGE_KEY,
  ACTIVE_GAME_SAVE_VERSION,
  serializeActiveGame,
  saveActiveGame,
  deleteActiveGame,
  validateActiveGameDoc,
  loadActiveGame,
  type ActiveGameSaveDocumentV1,
  type ActiveGameSessionPhase,
} from './activeGameSave.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGameState(): GameState {
  return newGame({
    players: [
      { id: HUMAN_PLAYER_ID, kind: 'human' },
      { id: AI_PLAYER_ID, kind: 'ai' },
    ],
    randomProvider: new SeededRandomProvider(42),
  });
}

function makeSession(phase: ActiveGameSessionPhase | 'idle' | 'ended'): GameSessionState {
  if (phase === 'idle') {
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
  if (phase === 'ended') {
    const gs = makeGameState();
    return {
      gameState: gs,
      lastEvents: [],
      allEvents: [],
      lastEventMessages: [],
      phase: 'ended',
      viewModel: buildGameViewModel(gs, HUMAN_PLAYER_ID, AI_PLAYER_ID),
      error: null,
    };
  }
  const gs = makeGameState();
  return {
    gameState: gs,
    lastEvents: [],
    allEvents: [],
    lastEventMessages: [],
    phase,
    viewModel: buildGameViewModel(gs, HUMAN_PLAYER_ID, AI_PLAYER_ID),
    error: null,
  };
}

/** StorageService that rejects every operation. */
class RejectingStorage {
  read(_key: string): Promise<string | null> {
    return Promise.reject(new Error('read error'));
  }
  write(_key: string, _value: string): Promise<void> {
    return Promise.reject(new Error('write error'));
  }
  delete(_key: string): Promise<void> {
    return Promise.reject(new Error('delete error'));
  }
}

// ---------------------------------------------------------------------------
// serializeActiveGame
// ---------------------------------------------------------------------------

describe('serializeActiveGame', () => {
  it('returns saveVersion equal to ACTIVE_GAME_SAVE_VERSION', () => {
    const doc = serializeActiveGame(makeGameState(), 'playing');
    expect(doc.saveVersion).toBe(ACTIVE_GAME_SAVE_VERSION);
  });

  it('preserves sessionPhase playing', () => {
    expect(serializeActiveGame(makeGameState(), 'playing').sessionPhase).toBe('playing');
  });

  it('preserves sessionPhase pendingGoStop', () => {
    expect(serializeActiveGame(makeGameState(), 'pendingGoStop').sessionPhase).toBe('pendingGoStop');
  });

  it('includes a non-empty savedAt string', () => {
    const doc = serializeActiveGame(makeGameState(), 'playing');
    expect(typeof doc.savedAt).toBe('string');
    expect(doc.savedAt.length).toBeGreaterThan(0);
  });

  it('embeds the exact gameState reference', () => {
    const gs = makeGameState();
    expect(serializeActiveGame(gs, 'playing').gameState).toBe(gs);
  });

  it('does not include any GameViewModel fields', () => {
    const doc = serializeActiveGame(makeGameState(), 'playing') as unknown as Record<string, unknown>;
    expect(doc['viewModel']).toBeUndefined();
    expect(doc['legalCardIds']).toBeUndefined();
    expect(doc['humanScoreBreakdown']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// saveActiveGame
// ---------------------------------------------------------------------------

describe('saveActiveGame', () => {
  let storage: InMemoryStorageService;

  beforeEach(() => {
    storage = new InMemoryStorageService();
  });

  it('writes a JSON string to ACTIVE_GAME_STORAGE_KEY for a playing session', async () => {
    await saveActiveGame(storage, makeSession('playing'));
    const raw = await storage.read(ACTIVE_GAME_STORAGE_KEY);
    expect(typeof raw).toBe('string');
  });

  it('writes for a pendingGoStop session', async () => {
    await saveActiveGame(storage, makeSession('pendingGoStop'));
    const raw = await storage.read(ACTIVE_GAME_STORAGE_KEY);
    expect(typeof raw).toBe('string');
  });

  it('does not write for an idle session', async () => {
    await saveActiveGame(storage, makeSession('idle'));
    expect(await storage.read(ACTIVE_GAME_STORAGE_KEY)).toBeNull();
  });

  it('does not write for an ended session', async () => {
    await saveActiveGame(storage, makeSession('ended'));
    expect(await storage.read(ACTIVE_GAME_STORAGE_KEY)).toBeNull();
  });

  it('written document does not contain GameViewModel fields', async () => {
    await saveActiveGame(storage, makeSession('playing'));
    const raw = await storage.read(ACTIVE_GAME_STORAGE_KEY);
    const parsed = JSON.parse(raw!) as Record<string, unknown>;
    expect(parsed['viewModel']).toBeUndefined();
    expect(parsed['legalCardIds']).toBeUndefined();
    expect(parsed['humanScoreBreakdown']).toBeUndefined();
  });

  it('written document round-trips through validateActiveGameDoc', async () => {
    await saveActiveGame(storage, makeSession('playing'));
    const raw = await storage.read(ACTIVE_GAME_STORAGE_KEY);
    const doc = validateActiveGameDoc(JSON.parse(raw!));
    expect(doc).not.toBeNull();
    expect(doc!.sessionPhase).toBe('playing');
  });

  it('does not throw when storage rejects', async () => {
    await expect(
      saveActiveGame(new RejectingStorage(), makeSession('playing')),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// deleteActiveGame
// ---------------------------------------------------------------------------

describe('deleteActiveGame', () => {
  let storage: InMemoryStorageService;

  beforeEach(() => {
    storage = new InMemoryStorageService();
  });

  it('removes the stored document', async () => {
    await saveActiveGame(storage, makeSession('playing'));
    await deleteActiveGame(storage);
    expect(await storage.read(ACTIVE_GAME_STORAGE_KEY)).toBeNull();
  });

  it('is a no-op when no document is stored', async () => {
    await expect(deleteActiveGame(storage)).resolves.toBeUndefined();
  });

  it('does not throw when storage rejects', async () => {
    await expect(deleteActiveGame(new RejectingStorage())).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// validateActiveGameDoc
// ---------------------------------------------------------------------------

describe('validateActiveGameDoc', () => {
  let validRaw: unknown;

  beforeEach(() => {
    const doc: ActiveGameSaveDocumentV1 = serializeActiveGame(makeGameState(), 'playing');
    validRaw = JSON.parse(JSON.stringify(doc));
  });

  it('accepts a valid document', () => {
    expect(validateActiveGameDoc(validRaw)).not.toBeNull();
  });

  it('rejects null', () => {
    expect(validateActiveGameDoc(null)).toBeNull();
  });

  it('rejects a non-object primitive', () => {
    expect(validateActiveGameDoc('string')).toBeNull();
    expect(validateActiveGameDoc(42)).toBeNull();
  });

  it('rejects saveVersion 0', () => {
    expect(validateActiveGameDoc({ ...(validRaw as object), saveVersion: 0 })).toBeNull();
  });

  it('rejects a future saveVersion', () => {
    expect(validateActiveGameDoc({ ...(validRaw as object), saveVersion: 999 })).toBeNull();
  });

  it('rejects "ended" sessionPhase', () => {
    expect(validateActiveGameDoc({ ...(validRaw as object), sessionPhase: 'ended' })).toBeNull();
  });

  it('rejects "idle" sessionPhase', () => {
    expect(validateActiveGameDoc({ ...(validRaw as object), sessionPhase: 'idle' })).toBeNull();
  });

  it('rejects null gameState', () => {
    expect(validateActiveGameDoc({ ...(validRaw as object), gameState: null })).toBeNull();
  });

  it('rejects gameState with missing players array', () => {
    const parsed = JSON.parse(JSON.stringify(validRaw)) as { gameState: Record<string, unknown> };
    delete parsed.gameState['players'];
    expect(validateActiveGameDoc(parsed)).toBeNull();
  });

  it('rejects sessionPhase / gameState.phase mismatch', () => {
    // sessionPhase='pendingGoStop' but gameState.phase='playing' — should be rejected
    const mismatch = { ...(validRaw as object), sessionPhase: 'pendingGoStop' };
    expect(validateActiveGameDoc(mismatch)).toBeNull();
  });

  it('returned document has saveVersion 1', () => {
    const doc = validateActiveGameDoc(validRaw);
    expect(doc?.saveVersion).toBe(1);
  });

  it('returned document preserves sessionPhase', () => {
    const doc = validateActiveGameDoc(validRaw);
    expect(doc?.sessionPhase).toBe('playing');
  });
});

// ---------------------------------------------------------------------------
// loadActiveGame
// ---------------------------------------------------------------------------

describe('loadActiveGame', () => {
  let storage: InMemoryStorageService;

  beforeEach(() => {
    storage = new InMemoryStorageService();
  });

  it('returns null when no document is stored', async () => {
    expect(await loadActiveGame(storage)).toBeNull();
  });

  it('returns a GameSessionState after a save', async () => {
    await saveActiveGame(storage, makeSession('playing'));
    const result = await loadActiveGame(storage);
    expect(result).not.toBeNull();
    expect(result!.phase).toBe('playing');
  });

  it('returned GameSessionState includes a non-null viewModel', async () => {
    await saveActiveGame(storage, makeSession('playing'));
    const result = await loadActiveGame(storage);
    expect(result!.viewModel).not.toBeNull();
  });

  it('returned viewModel is freshly derived (not from the save doc)', async () => {
    const session = makeSession('playing');
    await saveActiveGame(storage, session);
    const result = await loadActiveGame(storage);
    // viewModel is a new object — not the original session.viewModel reference
    expect(result!.viewModel).not.toBe(session.viewModel);
    // But it has the same total score (pure function of gameState)
    expect(result!.viewModel!.humanScore).toBe(session.viewModel!.humanScore);
  });

  it('returned GameSessionState has empty event arrays', async () => {
    await saveActiveGame(storage, makeSession('playing'));
    const result = await loadActiveGame(storage);
    expect(result!.lastEvents).toHaveLength(0);
    expect(result!.allEvents).toHaveLength(0);
    expect(result!.lastEventMessages).toHaveLength(0);
  });

  it('returned GameSessionState has null error', async () => {
    await saveActiveGame(storage, makeSession('playing'));
    const result = await loadActiveGame(storage);
    expect(result!.error).toBeNull();
  });

  it('returns null and deletes the key on corrupted JSON', async () => {
    await storage.write(ACTIVE_GAME_STORAGE_KEY, '{not valid json}');
    expect(await loadActiveGame(storage)).toBeNull();
    expect(await storage.read(ACTIVE_GAME_STORAGE_KEY)).toBeNull();
  });

  it('returns null and deletes the key on invalid document shape', async () => {
    await storage.write(ACTIVE_GAME_STORAGE_KEY, JSON.stringify({ saveVersion: 0 }));
    expect(await loadActiveGame(storage)).toBeNull();
    expect(await storage.read(ACTIVE_GAME_STORAGE_KEY)).toBeNull();
  });

  it('returns null when storage read rejects', async () => {
    expect(await loadActiveGame(new RejectingStorage())).toBeNull();
  });

  it('roundtrip: key structural fields survive JSON serialization', async () => {
    const gs = makeGameState();
    const session = makeSession('playing');
    // Use the gs from makeSession by saving directly
    await saveActiveGame(storage, { ...session, gameState: gs });
    const result = await loadActiveGame(storage);
    expect(result!.gameState!.players.length).toBe(gs.players.length);
    expect(result!.gameState!.turnCount).toBe(gs.turnCount);
    expect(result!.gameState!.phase).toBe(gs.phase);
    expect(result!.gameState!.drawPile.length).toBe(gs.drawPile.length);
  });
});
