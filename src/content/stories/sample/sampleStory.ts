/**
 * Sample story definition — for M6 schema validation only.
 *
 * This is NOT production content. It exists to exercise the discriminated
 * StoryNode schema and verify that the progression logic handles a real
 * StoryDefinition object. Full 팔도맞고 1975 content is M7+.
 *
 * Structure:
 *   sample-intro (DialogueStoryNode)
 *     → sample-match-01 (MatchStoryNode)
 *         → sample-end-win (EndStoryNode)  — unlockCondition: humanWon
 *         → sample-end-default (EndStoryNode)  — unlockCondition: always
 */

import type {
  StoryDefinition,
  DialogueStoryNode,
  MatchStoryNode,
  EndStoryNode,
} from '../../schemas/storySchema.js';

const intro: DialogueStoryNode = {
  nodeId: 'sample-intro',
  type: 'dialogue',
  dialogue: [
    {
      speakerId: 'narrator',
      text: '여기는 샘플 스토리입니다. 스키마 검증용 데이터입니다.',
    },
  ],
  unlockCondition: { type: 'always' },
  next: ['sample-match-01'],
};

const match01: MatchStoryNode = {
  nodeId: 'sample-match-01',
  type: 'match',
  npcId: 'sample-npc-01',
  regionId: 'sample-region-01',
  matchContext: {
    npcId: 'sample-npc-01',
    regionId: 'sample-region-01',
  },
  unlockCondition: { type: 'always' },
  next: ['sample-end-win', 'sample-end-default'],
};

const endWin: EndStoryNode = {
  nodeId: 'sample-end-win',
  type: 'end',
  unlockCondition: { type: 'humanWon' },
};

const endDefault: EndStoryNode = {
  nodeId: 'sample-end-default',
  type: 'end',
  unlockCondition: { type: 'always' },
};

export const sampleStory: StoryDefinition = {
  storyId: 'sample-01',
  startNodeId: 'sample-intro',
  nodes: [intro, match01, endWin, endDefault],
};
