import { describe, it, expect } from 'vitest';
import { InMemoryStorageService } from '../../platform/storage/InMemoryStorageService.js';
import { sampleStory } from '../../content/stories/sample/sampleStory.js';
import type { StoryProgress, MatchOutcome } from './storyTypes.js';
import {
  createStorySession,
  restoreStorySession,
  continueStorySession,
  requestStoryMatch,
  completeStoryMatch,
} from './storySessionState.js';
import type { StorySessionState } from './storySessionState.js';
import {
  STORY_PROGRESS_STORAGE_KEY,
  STORY_PROGRESS_SAVE_VERSION,
  serializeStoryProgress,
  validateStoryProgressSaveDocument,
  saveStoryProgress,
  deleteStoryProgress,
  loadStoryProgress,
} from './storyProgressSave.js';
import type { StoryProgressSaveDocumentV1 } from './storyProgressSave.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function makeOutcome(humanWon: boolean): MatchOutcome {
  return { humanWon, humanFinalScore: humanWon ? 7 : 0, aiFinalScore: humanWon ? 0 : 7 };
}

function makeProgress(overrides: Partial<StoryProgress> = {}): StoryProgress {
  return {
    storyId: sampleStory.storyId,
    currentNodeId: 'sample-intro',
    visitedNodeIds: [],
    matchHistory: [],
    ...overrides,
  };
}

function makeValidDoc(overrides: Partial<StoryProgressSaveDocumentV1> = {}): unknown {
  return {
    saveVersion: 1,
    savedAt: new Date().toISOString(),
    progress: makeProgress(),
    ...overrides,
  };
}

/** Drives a fresh sampleStory session through to 'matchRequested' status. */
function makeMatchRequestedSession(): StorySessionState {
  const started = createStorySession(sampleStory);
  const afterIntro = continueStorySession(started, sampleStory);
  return requestStoryMatch(afterIntro);
}

/** Drives a fresh sampleStory session through to a 'completed' end node. */
function makeCompletedSession(humanWon: boolean): StorySessionState {
  const matchRequested = makeMatchRequestedSession();
  return completeStoryMatch(matchRequested, sampleStory, makeOutcome(humanWon));
}

// ---------------------------------------------------------------------------
// serializeStoryProgress
// ---------------------------------------------------------------------------

describe('serializeStoryProgress', () => {
  it('includes saveVersion equal to STORY_PROGRESS_SAVE_VERSION', () => {
    const doc = serializeStoryProgress(makeProgress());
    expect(doc.saveVersion).toBe(STORY_PROGRESS_SAVE_VERSION);
  });

  it('includes an ISO savedAt string', () => {
    const doc = serializeStoryProgress(makeProgress());
    expect(typeof doc.savedAt).toBe('string');
    expect(() => new Date(doc.savedAt).toISOString()).not.toThrow();
  });

  it('preserves progress unchanged', () => {
    const progress = makeProgress({ visitedNodeIds: ['sample-intro'], matchHistory: [makeOutcome(true)] });
    const doc = serializeStoryProgress(progress);
    expect(doc.progress).toEqual(progress);
  });
});

// ---------------------------------------------------------------------------
// validateStoryProgressSaveDocument
// ---------------------------------------------------------------------------

describe('validateStoryProgressSaveDocument', () => {
  it('accepts a valid document', () => {
    const doc = validateStoryProgressSaveDocument(makeValidDoc(), sampleStory);
    expect(doc).not.toBeNull();
    expect(doc?.progress.storyId).toBe(sampleStory.storyId);
  });

  it('rejects null', () => {
    expect(validateStoryProgressSaveDocument(null, sampleStory)).toBeNull();
  });

  it('rejects a non-object', () => {
    expect(validateStoryProgressSaveDocument('not an object', sampleStory)).toBeNull();
  });

  it('rejects a missing saveVersion', () => {
    const { saveVersion, ...rest } = makeValidDoc() as Record<string, unknown>;
    expect(validateStoryProgressSaveDocument(rest, sampleStory)).toBeNull();
  });

  it('rejects a non-integer saveVersion', () => {
    expect(validateStoryProgressSaveDocument(makeValidDoc({ saveVersion: 1.5 as 1 }), sampleStory)).toBeNull();
  });

  it('rejects a saveVersion less than 1', () => {
    expect(validateStoryProgressSaveDocument(makeValidDoc({ saveVersion: 0 as 1 }), sampleStory)).toBeNull();
  });

  it('rejects a saveVersion from the future', () => {
    expect(
      validateStoryProgressSaveDocument(makeValidDoc({ saveVersion: 99 as 1 }), sampleStory),
    ).toBeNull();
  });

  it('rejects a non-string savedAt', () => {
    expect(validateStoryProgressSaveDocument(makeValidDoc({ savedAt: 12345 as unknown as string }), sampleStory)).toBeNull();
  });

  it('rejects a missing progress', () => {
    const { progress, ...rest } = makeValidDoc() as Record<string, unknown>;
    expect(validateStoryProgressSaveDocument(rest, sampleStory)).toBeNull();
  });

  it('rejects progress.storyId not a string', () => {
    const doc = makeValidDoc({ progress: makeProgress({ storyId: 42 as unknown as string }) });
    expect(validateStoryProgressSaveDocument(doc, sampleStory)).toBeNull();
  });

  it('rejects progress.currentNodeId not a string', () => {
    const doc = makeValidDoc({ progress: makeProgress({ currentNodeId: 42 as unknown as string }) });
    expect(validateStoryProgressSaveDocument(doc, sampleStory)).toBeNull();
  });

  it('rejects visitedNodeIds not an array', () => {
    const doc = makeValidDoc({
      progress: makeProgress({ visitedNodeIds: 'nope' as unknown as ReadonlyArray<string> }),
    });
    expect(validateStoryProgressSaveDocument(doc, sampleStory)).toBeNull();
  });

  it('rejects a visitedNodeIds item that is not a string', () => {
    const doc = makeValidDoc({
      progress: makeProgress({ visitedNodeIds: [1, 2] as unknown as ReadonlyArray<string> }),
    });
    expect(validateStoryProgressSaveDocument(doc, sampleStory)).toBeNull();
  });

  it('rejects matchHistory not an array', () => {
    const doc = makeValidDoc({
      progress: makeProgress({ matchHistory: 'nope' as unknown as ReadonlyArray<MatchOutcome> }),
    });
    expect(validateStoryProgressSaveDocument(doc, sampleStory)).toBeNull();
  });

  it('rejects a matchHistory item that is not an object', () => {
    const doc = makeValidDoc({
      progress: makeProgress({ matchHistory: ['nope'] as unknown as ReadonlyArray<MatchOutcome> }),
    });
    expect(validateStoryProgressSaveDocument(doc, sampleStory)).toBeNull();
  });

  it('rejects a matchHistory item with humanWon not a boolean', () => {
    const doc = makeValidDoc({
      progress: makeProgress({
        matchHistory: [{ humanWon: 'yes', humanFinalScore: 7, aiFinalScore: 0 }] as unknown as ReadonlyArray<MatchOutcome>,
      }),
    });
    expect(validateStoryProgressSaveDocument(doc, sampleStory)).toBeNull();
  });

  it('rejects a matchHistory item with a non-finite humanFinalScore', () => {
    const doc = makeValidDoc({
      progress: makeProgress({
        matchHistory: [{ humanWon: true, humanFinalScore: NaN, aiFinalScore: 0 }] as unknown as ReadonlyArray<MatchOutcome>,
      }),
    });
    expect(validateStoryProgressSaveDocument(doc, sampleStory)).toBeNull();
  });

  it('rejects a matchHistory item with a non-finite aiFinalScore', () => {
    const doc = makeValidDoc({
      progress: makeProgress({
        matchHistory: [{ humanWon: true, humanFinalScore: 7, aiFinalScore: Infinity }] as unknown as ReadonlyArray<MatchOutcome>,
      }),
    });
    expect(validateStoryProgressSaveDocument(doc, sampleStory)).toBeNull();
  });

  it('rejects a storyId that does not match the definition', () => {
    const doc = makeValidDoc({ progress: makeProgress({ storyId: 'some-other-story' }) });
    expect(validateStoryProgressSaveDocument(doc, sampleStory)).toBeNull();
  });

  it('rejects a currentNodeId missing from the StoryDefinition', () => {
    const doc = makeValidDoc({ progress: makeProgress({ currentNodeId: 'does-not-exist' }) });
    expect(validateStoryProgressSaveDocument(doc, sampleStory)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// restoreStorySession
// ---------------------------------------------------------------------------

describe('restoreStorySession', () => {
  it('restores a StorySessionState with the same progress and currentNodeId', () => {
    const progress = makeProgress({ visitedNodeIds: [], currentNodeId: 'sample-intro' });
    const restored = restoreStorySession(sampleStory, progress);
    expect(restored.progress).toEqual(progress);
    expect(restored.viewModel?.currentNodeId).toBe('sample-intro');
    expect(restored.status).toBe('story');
  });

  it('restores a completed status for an end node', () => {
    const progress = makeProgress({
      currentNodeId: 'sample-end-default',
      visitedNodeIds: ['sample-intro', 'sample-match-01'],
      matchHistory: [makeOutcome(false)],
    });
    const restored = restoreStorySession(sampleStory, progress);
    expect(restored.status).toBe('completed');
    expect(restored.viewModel?.isComplete).toBe(true);
  });

  it('restores an invalid status when currentNodeId is missing from the definition', () => {
    const progress = makeProgress({ currentNodeId: 'does-not-exist' });
    const restored = restoreStorySession(sampleStory, progress);
    expect(restored.status).toBe('invalid');
    expect(restored.viewModel).toBeNull();
    expect(restored.error).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// saveStoryProgress
// ---------------------------------------------------------------------------

describe('saveStoryProgress', () => {
  it('writes a document when status is "story"', async () => {
    const storage = new InMemoryStorageService();
    const session = createStorySession(sampleStory);
    expect(session.status).toBe('story');

    await saveStoryProgress(storage, session);

    const raw = await storage.read(STORY_PROGRESS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as StoryProgressSaveDocumentV1;
    expect(parsed.progress).toEqual(session.progress);
  });

  it('writes a document when status is "completed"', async () => {
    const storage = new InMemoryStorageService();
    const session = makeCompletedSession(true);
    expect(session.status).toBe('completed');

    await saveStoryProgress(storage, session);

    const raw = await storage.read(STORY_PROGRESS_STORAGE_KEY);
    expect(raw).not.toBeNull();
  });

  it('is a no-op when status is "matchRequested"', async () => {
    const storage = new InMemoryStorageService();
    const session = makeMatchRequestedSession();
    expect(session.status).toBe('matchRequested');

    await saveStoryProgress(storage, session);

    expect(await storage.read(STORY_PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it('is a no-op when status is "invalid"', async () => {
    const storage = new InMemoryStorageService();
    const session = restoreStorySession(sampleStory, makeProgress({ currentNodeId: 'does-not-exist' }));
    expect(session.status).toBe('invalid');

    await saveStoryProgress(storage, session);

    expect(await storage.read(STORY_PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it('catches a rejected write without throwing', async () => {
    const storage = new RejectingStorage();
    const session = createStorySession(sampleStory);

    await expect(saveStoryProgress(storage, session)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// deleteStoryProgress
// ---------------------------------------------------------------------------

describe('deleteStoryProgress', () => {
  it('deletes the storage key', async () => {
    const storage = new InMemoryStorageService();
    await storage.write(STORY_PROGRESS_STORAGE_KEY, JSON.stringify(makeValidDoc()));

    await deleteStoryProgress(storage);

    expect(await storage.read(STORY_PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it('catches a rejected delete without throwing', async () => {
    const storage = new RejectingStorage();
    await expect(deleteStoryProgress(storage)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// loadStoryProgress
// ---------------------------------------------------------------------------

describe('loadStoryProgress', () => {
  it('returns null when the key is missing', async () => {
    const storage = new InMemoryStorageService();
    expect(await loadStoryProgress(storage, sampleStory)).toBeNull();
  });

  it('restores a StorySessionState from a valid saved document', async () => {
    const storage = new InMemoryStorageService();
    const progress = makeProgress({ visitedNodeIds: ['sample-intro'], currentNodeId: 'sample-match-01' });
    await storage.write(STORY_PROGRESS_STORAGE_KEY, JSON.stringify(serializeStoryProgress(progress)));

    const restored = await loadStoryProgress(storage, sampleStory);

    expect(restored).not.toBeNull();
    expect(restored?.progress).toEqual(progress);
  });

  it('deletes the key and returns null on malformed JSON', async () => {
    const storage = new InMemoryStorageService();
    await storage.write(STORY_PROGRESS_STORAGE_KEY, '{not valid json');

    expect(await loadStoryProgress(storage, sampleStory)).toBeNull();
    expect(await storage.read(STORY_PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it('deletes the key and returns null on an invalid shape', async () => {
    const storage = new InMemoryStorageService();
    await storage.write(STORY_PROGRESS_STORAGE_KEY, JSON.stringify({ saveVersion: 'nope' }));

    expect(await loadStoryProgress(storage, sampleStory)).toBeNull();
    expect(await storage.read(STORY_PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it('deletes the key and returns null on a storyId mismatch', async () => {
    const storage = new InMemoryStorageService();
    const doc = serializeStoryProgress(makeProgress({ storyId: 'some-other-story' }));
    await storage.write(STORY_PROGRESS_STORAGE_KEY, JSON.stringify(doc));

    expect(await loadStoryProgress(storage, sampleStory)).toBeNull();
    expect(await storage.read(STORY_PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it('deletes the key and returns null when currentNodeId is missing from the definition', async () => {
    const storage = new InMemoryStorageService();
    const doc = serializeStoryProgress(makeProgress({ currentNodeId: 'does-not-exist' }));
    await storage.write(STORY_PROGRESS_STORAGE_KEY, JSON.stringify(doc));

    expect(await loadStoryProgress(storage, sampleStory)).toBeNull();
    expect(await storage.read(STORY_PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it('returns null without throwing when storage.read rejects', async () => {
    const storage = new RejectingStorage();
    await expect(loadStoryProgress(storage, sampleStory)).resolves.toBeNull();
  });
});
