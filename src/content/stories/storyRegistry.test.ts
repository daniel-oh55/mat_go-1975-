import { describe, it, expect } from 'vitest';
import { storyRegistry, hasDuplicateStoryId, getStoryCatalog, getStoryDefinition } from './storyRegistry.js';
import { sampleStory } from './sample/sampleStory.js';
import type { StoryCatalogEntry } from './storyRegistry.js';

describe('storyRegistry', () => {
  it('registers sampleStory as the only entry', () => {
    expect(storyRegistry).toHaveLength(1);
    expect(storyRegistry[0]?.catalog.storyId).toBe(sampleStory.storyId);
    expect(storyRegistry[0]?.definition).toBe(sampleStory);
  });

  it('gives the sample entry status "sample"', () => {
    expect(storyRegistry[0]?.catalog.status).toBe('sample');
  });
});

describe('hasDuplicateStoryId', () => {
  function entry(storyId: string): StoryCatalogEntry {
    return { storyId, title: 't', description: 'd', status: 'sample' };
  }

  it('returns false for unique storyIds', () => {
    expect(hasDuplicateStoryId([entry('a'), entry('b')])).toBe(false);
  });

  it('returns false for an empty catalog', () => {
    expect(hasDuplicateStoryId([])).toBe(false);
  });

  it('returns true when a storyId repeats', () => {
    expect(hasDuplicateStoryId([entry('a'), entry('a')])).toBe(true);
  });

  it('the real storyRegistry has no duplicate storyId', () => {
    expect(hasDuplicateStoryId(storyRegistry.map((r) => r.catalog))).toBe(false);
  });
});

describe('getStoryCatalog', () => {
  it('returns one sample catalog entry', () => {
    const catalog = getStoryCatalog();
    expect(catalog).toHaveLength(1);
    expect(catalog[0]?.storyId).toBe(sampleStory.storyId);
  });

  it('does not expose the StoryDefinition on the catalog entry', () => {
    const catalog = getStoryCatalog() as unknown as Record<string, unknown>[];
    expect(catalog[0]?.definition).toBeUndefined();
    expect(catalog[0]?.nodes).toBeUndefined();
  });
});

describe('getStoryDefinition', () => {
  it('returns sampleStory for sampleStory.storyId', () => {
    expect(getStoryDefinition(sampleStory.storyId)).toBe(sampleStory);
  });

  it('returns null for an unknown storyId', () => {
    expect(getStoryDefinition('does-not-exist')).toBeNull();
  });
});
