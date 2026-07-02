/**
 * Content Layer: story registry.
 *
 * The single place that knows which StoryDefinitions exist. Callers should
 * look up a story here (getStoryCatalog / getStoryDefinition) rather than
 * importing a concrete story file directly — see
 * docs/23_content_loader_architecture.md for the full design.
 *
 * `sampleStory` is the only registered story. No engine imports. No runtime
 * mutation — this is static content data plus read-only lookup functions.
 */

import type { StoryDefinition } from '../schemas/storySchema.js';
import { sampleStory } from './sample/sampleStory.js';

export interface StoryCatalogEntry {
  readonly storyId: string;
  readonly title: string;
  readonly description: string;
  readonly status: 'sample' | 'draft' | 'production';
}

export interface RegisteredStory {
  readonly catalog: StoryCatalogEntry;
  readonly definition: StoryDefinition;
}

export const storyRegistry: ReadonlyArray<RegisteredStory> = [
  {
    catalog: {
      storyId: sampleStory.storyId,
      title: '샘플 이야기',
      description: '런타임 검증용 샘플 스토리',
      status: 'sample',
    },
    definition: sampleStory,
  },
];

/** True when two or more catalog entries share the same storyId. */
export function hasDuplicateStoryId(catalog: ReadonlyArray<StoryCatalogEntry>): boolean {
  const ids = catalog.map((entry) => entry.storyId);
  return new Set(ids).size !== ids.length;
}

if (hasDuplicateStoryId(storyRegistry.map((entry) => entry.catalog))) {
  throw new Error('storyRegistry contains duplicate storyId entries');
}

export function getStoryCatalog(): ReadonlyArray<StoryCatalogEntry> {
  return storyRegistry.map((entry) => entry.catalog);
}

/** Returns the StoryDefinition for `storyId`, or null if no story is registered under that id. */
export function getStoryDefinition(storyId: string): StoryDefinition | null {
  return storyRegistry.find((entry) => entry.catalog.storyId === storyId)?.definition ?? null;
}
