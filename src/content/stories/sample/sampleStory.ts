/**
 * Sample story definition — for M6 schema validation only.
 *
 * This is NOT production content. It exists to exercise the StoryDefinition
 * schema and verify that the progression logic handles a real story object.
 * Full 팔도맞고 1975 content (NPCs, regions, dialogue) is written in M7+.
 *
 * Structure:
 *   intro (dialogue) → match-01 (match) → end-win (end) if human won
 *                                        → end-default (end) always
 */

import type { StoryDefinition } from '../../schemas/storySchema.js';

export const sampleStory: StoryDefinition = {
  storyId: 'sample-01',
  startNodeId: 'intro',
  nodes: [
    {
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
    },
    {
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
    },
    {
      nodeId: 'end-win',
      type: 'end',
      unlockCondition: { type: 'humanWon' },
    },
    {
      nodeId: 'end-default',
      type: 'end',
      unlockCondition: { type: 'always' },
    },
  ],
};
