import { describe, it, expect } from 'vitest';
import { sampleStory } from './sampleStory.js';

describe('sampleStory schema validity', () => {
  it('has a non-empty storyId', () => {
    expect(typeof sampleStory.storyId).toBe('string');
    expect(sampleStory.storyId.length).toBeGreaterThan(0);
  });

  it('startNodeId references an existing node', () => {
    const nodeIds = sampleStory.nodes.map((n) => n.nodeId);
    expect(nodeIds).toContain(sampleStory.startNodeId);
  });

  it('has at least one node', () => {
    expect(sampleStory.nodes.length).toBeGreaterThan(0);
  });

  it('all node IDs are unique', () => {
    const ids = sampleStory.nodes.map((n) => n.nodeId);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all node types are valid', () => {
    const validTypes = new Set(['dialogue', 'match', 'choice', 'end']);
    for (const node of sampleStory.nodes) {
      expect(validTypes.has(node.type)).toBe(true);
    }
  });

  it('all next references point to existing node IDs', () => {
    const nodeIds = new Set(sampleStory.nodes.map((n) => n.nodeId));
    for (const node of sampleStory.nodes) {
      for (const nextId of node.next ?? []) {
        expect(nodeIds.has(nextId)).toBe(true);
      }
    }
  });

  it('match nodes have matchContext', () => {
    for (const node of sampleStory.nodes) {
      if (node.type === 'match') {
        expect(node.matchContext).toBeDefined();
        expect(typeof node.matchContext?.npcId).toBe('string');
        expect(typeof node.matchContext?.regionId).toBe('string');
      }
    }
  });

  it('end nodes have no next children', () => {
    for (const node of sampleStory.nodes) {
      if (node.type === 'end') {
        expect(node.next === undefined || node.next.length === 0).toBe(true);
      }
    }
  });
});
