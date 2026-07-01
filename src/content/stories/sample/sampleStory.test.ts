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

  it('all node IDs have sample- prefix', () => {
    for (const node of sampleStory.nodes) {
      expect(node.nodeId.startsWith('sample-')).toBe(true);
    }
  });

  it('all next and choice references point to existing node IDs', () => {
    const nodeIds = new Set(sampleStory.nodes.map((n) => n.nodeId));
    for (const node of sampleStory.nodes) {
      if (node.type === 'dialogue' || node.type === 'match') {
        for (const nextId of node.next) {
          expect(nodeIds.has(nextId)).toBe(true);
        }
      }
      if (node.type === 'choice') {
        for (const choice of node.choices) {
          expect(nodeIds.has(choice.nextNodeId)).toBe(true);
        }
      }
    }
  });

  it('match nodes have matchContext with valid npcId and regionId', () => {
    for (const node of sampleStory.nodes) {
      if (node.type === 'match') {
        expect(typeof node.matchContext.npcId).toBe('string');
        expect(node.matchContext.npcId.length).toBeGreaterThan(0);
        expect(typeof node.matchContext.regionId).toBe('string');
        expect(node.matchContext.regionId.length).toBeGreaterThan(0);
      }
    }
  });

  it('end nodes have no next property', () => {
    for (const node of sampleStory.nodes) {
      if (node.type === 'end') {
        expect('next' in node).toBe(false);
      }
    }
  });

  it('dialogue nodes have at least one dialogue line', () => {
    for (const node of sampleStory.nodes) {
      if (node.type === 'dialogue') {
        expect(node.dialogue.length).toBeGreaterThan(0);
      }
    }
  });

  it('is fully JSON-serializable and round-trips correctly', () => {
    const serialized = JSON.stringify(sampleStory);
    const restored = JSON.parse(serialized) as typeof sampleStory;
    expect(restored.storyId).toBe(sampleStory.storyId);
    expect(restored.startNodeId).toBe(sampleStory.startNodeId);
    expect(restored.nodes.length).toBe(sampleStory.nodes.length);
    expect(serialized).not.toContain('[object');
  });
});
