/**
 * Application Layer: StoryProgress persistence helpers.
 *
 * Implements the policy documented in docs/25_story_progress_persistence_plan.md —
 * storage key, versioned document shape, save-trigger rules, and validation/
 * corruption handling. Mirrors the Category A pattern established by
 * src/application/gameSession/activeGameSave.ts.
 *
 * This file only implements the helpers. It does not wire them into
 * StoryRuntimeScreen or App.tsx — that is M10-PR3.
 *
 * Dependency rule: may import from src/application/storage/ and this
 * directory's own types/helpers. Must NOT import from src/engine/,
 * src/components/, src/platform/, src/content/stories/sample/sampleStory.js,
 * or src/content/stories/storyRegistry.js, and must NOT import React.
 */

import type { StorageService } from '../storage/StorageService.js';
import type { StoryDefinition, StoryProgress, MatchOutcome } from './storyTypes.js';
import { findStoryNode } from './storyProgression.js';
import type { StorySessionState, StorySessionStatus } from './storySessionState.js';
import { restoreStorySession } from './storySessionState.js';

/** Storage key for the single-slot StoryProgress document. */
export const STORY_PROGRESS_STORAGE_KEY = 'matgo.v1.storyProgress';

/** Current schema version. Increment on breaking field changes. */
export const STORY_PROGRESS_SAVE_VERSION = 1 as const;

/**
 * Persisted document shape — version metadata plus StoryProgress only.
 *
 * Never contains StoryViewModel, pendingMatchContext, error, or status —
 * those are runtime UI state, re-derived from StoryProgress on restore.
 */
export interface StoryProgressSaveDocumentV1 {
  readonly saveVersion: 1;
  readonly savedAt: string;
  readonly progress: StoryProgress;
}

/** True for the session statuses that should be persisted — see docs/25 §5. */
export function shouldSaveStoryProgress(status: StorySessionStatus): boolean {
  return status === 'story' || status === 'completed';
}

/**
 * Builds the persisted document from a StoryProgress. Pure function — does not
 * write to storage.
 */
export function serializeStoryProgress(progress: StoryProgress): StoryProgressSaveDocumentV1 {
  return {
    saveVersion: STORY_PROGRESS_SAVE_VERSION,
    savedAt: new Date().toISOString(),
    progress,
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidMatchOutcome(value: unknown): value is MatchOutcome {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['humanWon'] === 'boolean' &&
    isFiniteNumber(obj['humanFinalScore']) &&
    isFiniteNumber(obj['aiFinalScore'])
  );
}

function isValidStoryProgressShape(value: unknown): value is StoryProgress {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj['storyId'] !== 'string') return false;
  if (typeof obj['currentNodeId'] !== 'string') return false;

  const visitedNodeIds = obj['visitedNodeIds'];
  if (!Array.isArray(visitedNodeIds)) return false;
  if (!visitedNodeIds.every((id) => typeof id === 'string')) return false;

  const matchHistory = obj['matchHistory'];
  if (!Array.isArray(matchHistory)) return false;
  if (!matchHistory.every(isValidMatchOutcome)) return false;

  return true;
}

/**
 * Validates an unknown value as a StoryProgressSaveDocumentV1 for `definition`.
 *
 * Returns the typed document on success, null on any failure — including a
 * storyId mismatch or a currentNodeId that no longer resolves against
 * `definition` (see docs/25 §8). Does not re-evaluate UnlockCondition or
 * perform deep story-graph validation.
 */
export function validateStoryProgressSaveDocument(
  raw: unknown,
  definition: StoryDefinition,
): StoryProgressSaveDocumentV1 | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;

  const saveVersion = obj['saveVersion'];
  if (typeof saveVersion !== 'number' || !Number.isInteger(saveVersion) || saveVersion < 1) {
    return null;
  }
  if (saveVersion > STORY_PROGRESS_SAVE_VERSION) return null;

  const savedAt = obj['savedAt'];
  if (typeof savedAt !== 'string') return null;

  const progress = obj['progress'];
  if (!isValidStoryProgressShape(progress)) return null;

  if (progress.storyId !== definition.storyId) return null;
  if (findStoryNode(definition, progress.currentNodeId) === null) return null;

  return {
    saveVersion: 1,
    savedAt,
    progress,
  };
}

/**
 * Persists `session.progress` when its status is 'story' or 'completed'
 * (see shouldSaveStoryProgress). No-op for 'matchRequested' and 'invalid'.
 *
 * Fire-and-forget: catches and logs write failures; Story Mode always continues.
 */
export async function saveStoryProgress(
  storage: StorageService,
  session: StorySessionState,
): Promise<void> {
  if (!shouldSaveStoryProgress(session.status)) return;

  const doc = serializeStoryProgress(session.progress);
  try {
    await storage.write(STORY_PROGRESS_STORAGE_KEY, JSON.stringify(doc));
  } catch (err) {
    console.error('[storyProgressSave] save failed — story continues:', err);
  }
}

/**
 * Removes the StoryProgress document from storage.
 *
 * Used to discard corrupted/invalid documents on load, and (per docs/25 §7) is
 * available for that purpose even though an explicit restart should prefer
 * overwriting with a fresh document over deleting.
 */
export async function deleteStoryProgress(storage: StorageService): Promise<void> {
  try {
    await storage.delete(STORY_PROGRESS_STORAGE_KEY);
  } catch (err) {
    console.error('[storyProgressSave] delete failed:', err);
  }
}

/**
 * Reads, validates, and restores StoryProgress for `definition` from storage.
 *
 * Returns null when:
 * - The key does not exist.
 * - storage.read rejects.
 * - The stored JSON is malformed.
 * - The document fails validateStoryProgressSaveDocument (including a storyId
 *   mismatch or an unresolvable currentNodeId).
 * - Restoring the validated progress still yields an 'invalid' StorySessionState
 *   (defense in depth — validation already checks node existence, but restore
 *   is the source of truth).
 *
 * Deletes corrupted or invalid documents before returning null so a later load
 * does not repeat the same failure.
 *
 * Does not import the content registry or any concrete story file — the caller
 * is responsible for resolving `definition`.
 */
export async function loadStoryProgress(
  storage: StorageService,
  definition: StoryDefinition,
): Promise<StorySessionState | null> {
  let raw: string | null;
  try {
    raw = await storage.read(STORY_PROGRESS_STORAGE_KEY);
  } catch (err) {
    console.error('[storyProgressSave] read failed:', err);
    return null;
  }

  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error('[storyProgressSave] JSON parse failed — deleting corrupted document');
    await deleteStoryProgress(storage);
    return null;
  }

  const doc = validateStoryProgressSaveDocument(parsed, definition);
  if (doc === null) {
    console.error('[storyProgressSave] validation failed — deleting corrupted document');
    await deleteStoryProgress(storage);
    return null;
  }

  const restored = restoreStorySession(definition, doc.progress);
  if (restored.status === 'invalid') {
    console.error('[storyProgressSave] restored state is invalid — deleting corrupted document');
    await deleteStoryProgress(storage);
    return null;
  }

  return restored;
}
