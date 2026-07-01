/**
 * Sample story definition — for M6 schema validation only.
 *
 * This is NOT production content. It exists to exercise the discriminated
 * StoryNode schema and verify that the progression logic handles a real
 * StoryDefinition object. Full 팔도맞고 1975 content is M7+.
 *
 * Structure:
 *   intro (DialogueStoryNode)
 *     → match-01 (MatchStoryNode)
 *         → end-win (EndStoryNode)  — unlockCondition: humanWon
 *         → end-default (EndStoryNode)  — unlockCondition: always
 */

import type {
  StoryDefinition,
  DialogueStoryNode,
  MatchStoryNode,
  EndStoryNode,
} from '../../schemas/storySchema.js';

const intro: DialogueStoryNode = {
  nodeId: 'intro',
  type: 'dialogue',
  dialogue: [
    {
      speakerId: 'narrator',
      text: '여기는 샘플 스토리입니다. 스키마 검증용 데이터입니다.',
    },
  ],
  unlockCondition: { type: 'always' },
  next: ['match-01'],
};

const match01: MatchStoryNode = {
  nodeId: 'match-01',
  type: 'match',
  npcId: 'sample-npc-01',
  regionId: 'sample-region-01',
  matchContext: {
    npcId: 'sample-npc-01',
    regionId: 'sample-region-01',
  },
  unlockCondition: { type: 'always' },
  next: ['end-win', 'end-default'],
};

const endWin: EndStoryNode = {
  nodeId: 'end-win',
  type: 'end',
  unlockCondition: { type: 'humanWon' },
};

const endDefault: EndStoryNode = {
  nodeId: 'end-default',
  type: 'end',
  unlockCondition: { type: 'always' },
};

export const sampleStory: StoryDefinition = {
  storyId: 'sample-01',
  startNodeId: 'intro',
  nodes: [intro, match01, endWin, endDefault],
};
