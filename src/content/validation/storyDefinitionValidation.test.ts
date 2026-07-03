import { describe, it, expect } from 'vitest';
import { validateStoryDefinition } from './storyDefinitionValidation.js';
import { sampleStory } from '../stories/sample/sampleStory.js';
import { storyRegistry } from '../stories/storyRegistry.js';
import type {
  StoryDefinition,
  DialogueStoryNode,
  MatchStoryNode,
  ChoiceStoryNode,
  EndStoryNode,
} from '../schemas/storySchema.js';

describe('validateStoryDefinition', () => {
  it('accepts sampleStory as valid', () => {
    const result = validateStoryDefinition(sampleStory);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts every registered story definition as valid', () => {
    for (const entry of storyRegistry) {
      const result = validateStoryDefinition(entry.definition);
      expect(result.valid).toBe(true);
    }
  });

  it('rejects an empty storyId', () => {
    const definition: StoryDefinition = { ...sampleStory, storyId: '' };
    const result = validateStoryDefinition(definition);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('storyId'))).toBe(true);
  });

  it('rejects empty nodes', () => {
    const definition: StoryDefinition = { storyId: 'x', startNodeId: 'a', nodes: [] };
    const result = validateStoryDefinition(definition);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('nodes'))).toBe(true);
  });

  it('rejects an empty nodeId', () => {
    const end: EndStoryNode = { nodeId: 'end', type: 'end' };
    const bad: DialogueStoryNode = {
      nodeId: '',
      type: 'dialogue',
      dialogue: [{ speakerId: 'narrator', text: 'hi' }],
      next: ['end'],
    };
    const definition: StoryDefinition = { storyId: 'x', startNodeId: '', nodes: [bad, end] };
    const result = validateStoryDefinition(definition);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('empty nodeId'))).toBe(true);
  });

  it('rejects a duplicate nodeId', () => {
    const a: DialogueStoryNode = {
      nodeId: 'dup',
      type: 'dialogue',
      dialogue: [{ speakerId: 'narrator', text: 'a' }],
      next: ['end'],
    };
    const b: DialogueStoryNode = {
      nodeId: 'dup',
      type: 'dialogue',
      dialogue: [{ speakerId: 'narrator', text: 'b' }],
      next: ['end'],
    };
    const end: EndStoryNode = { nodeId: 'end', type: 'end' };
    const definition: StoryDefinition = { storyId: 'x', startNodeId: 'dup', nodes: [a, b, end] };
    const result = validateStoryDefinition(definition);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate'))).toBe(true);
  });

  it('rejects a missing startNodeId', () => {
    const end: EndStoryNode = { nodeId: 'end', type: 'end' };
    const definition: StoryDefinition = { storyId: 'x', startNodeId: 'missing-start', nodes: [end] };
    const result = validateStoryDefinition(definition);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('startNodeId'))).toBe(true);
  });

  it('rejects an unresolved dialogue next entry', () => {
    const intro: DialogueStoryNode = {
      nodeId: 'intro',
      type: 'dialogue',
      dialogue: [{ speakerId: 'narrator', text: 'hi' }],
      next: ['missing'],
    };
    const definition: StoryDefinition = { storyId: 'x', startNodeId: 'intro', nodes: [intro] };
    const result = validateStoryDefinition(definition);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Dialogue node'))).toBe(true);
  });

  it('rejects an unresolved match next entry', () => {
    const match: MatchStoryNode = {
      nodeId: 'match-01',
      type: 'match',
      matchContext: { npcId: 'npc-01', regionId: 'region-01' },
      next: ['missing'],
    };
    const definition: StoryDefinition = { storyId: 'x', startNodeId: 'match-01', nodes: [match] };
    const result = validateStoryDefinition(definition);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Match node'))).toBe(true);
  });

  it('rejects an unresolved choice nextNodeId', () => {
    const choice: ChoiceStoryNode = {
      nodeId: 'choice-01',
      type: 'choice',
      choices: [{ choiceId: 'go-left', label: 'Go left', nextNodeId: 'missing' }],
    };
    const definition: StoryDefinition = { storyId: 'x', startNodeId: 'choice-01', nodes: [choice] };
    const result = validateStoryDefinition(definition);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Choice node'))).toBe(true);
  });

  it('rejects a graph with no reachable end node', () => {
    const a: DialogueStoryNode = {
      nodeId: 'a',
      type: 'dialogue',
      dialogue: [{ speakerId: 'narrator', text: 'a' }],
      next: ['b'],
    };
    const b: DialogueStoryNode = {
      nodeId: 'b',
      type: 'dialogue',
      dialogue: [{ speakerId: 'narrator', text: 'b' }],
      next: ['a'],
    };
    const definition: StoryDefinition = { storyId: 'x', startNodeId: 'a', nodes: [a, b] };
    const result = validateStoryDefinition(definition);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('reachable'))).toBe(true);
  });

  it('accepts a reachable end node through a choice edge', () => {
    const choice: ChoiceStoryNode = {
      nodeId: 'choice-01',
      type: 'choice',
      choices: [
        { choiceId: 'go-left', label: 'Go left', nextNodeId: 'end-left' },
        { choiceId: 'go-right', label: 'Go right', nextNodeId: 'end-right' },
      ],
    };
    const endLeft: EndStoryNode = { nodeId: 'end-left', type: 'end' };
    const endRight: EndStoryNode = { nodeId: 'end-right', type: 'end' };
    const definition: StoryDefinition = {
      storyId: 'x',
      startNodeId: 'choice-01',
      nodes: [choice, endLeft, endRight],
    };
    const result = validateStoryDefinition(definition);
    expect(result.valid).toBe(true);
  });

  it('does not infinite loop on a cycle, and accepts one with a reachable end', () => {
    const a: DialogueStoryNode = {
      nodeId: 'a',
      type: 'dialogue',
      dialogue: [{ speakerId: 'narrator', text: 'a' }],
      next: ['b'],
    };
    const b: ChoiceStoryNode = {
      nodeId: 'b',
      type: 'choice',
      choices: [
        { choiceId: 'loop-back', label: 'Loop back', nextNodeId: 'a' },
        { choiceId: 'finish', label: 'Finish', nextNodeId: 'end' },
      ],
    };
    const end: EndStoryNode = { nodeId: 'end', type: 'end' };
    const definition: StoryDefinition = { storyId: 'x', startNodeId: 'a', nodes: [a, b, end] };
    const result = validateStoryDefinition(definition);
    expect(result.valid).toBe(true);
  });
});
