import { describe, it, expect } from 'vitest';
import { formatGameEvents } from './gameEventMessages.js';
import type { GameEvent } from '../../engine/types/event.js';

const HUMAN = 'human';
const AI = 'ai';

// Minimal score state used in SCORE_CHANGED events
const score = (total: number) => ({ total, gwang: 0, yeol: 0, tti: 0, pi: 0 });

describe('formatGameEvents — empty input', () => {
  it('returns an empty array for an empty event list', () => {
    expect(formatGameEvents([])).toEqual([]);
  });
});

describe('formatGameEvents — GAME_STARTED', () => {
  it('produces "게임 시작!"', () => {
    const events: GameEvent[] = [{ type: 'GAME_STARTED' }];
    expect(formatGameEvents(events)).toEqual(['게임 시작!']);
  });
});

describe('formatGameEvents — CARD_PLAYED', () => {
  it('uses subject label for human player', () => {
    const events: GameEvent[] = [{ type: 'CARD_PLAYED', playerId: HUMAN, cardId: 'm01-gwang' }];
    expect(formatGameEvents(events)).toEqual(['내가 카드를 냈습니다.']);
  });

  it('uses subject label for AI player', () => {
    const events: GameEvent[] = [{ type: 'CARD_PLAYED', playerId: AI, cardId: 'm02-yeol' }];
    expect(formatGameEvents(events)).toEqual(['AI가 카드를 냈습니다.']);
  });
});

describe('formatGameEvents — CARD_MATCHED (filtered)', () => {
  it('produces no message for CARD_MATCHED', () => {
    const events: GameEvent[] = [{ type: 'CARD_MATCHED' }];
    expect(formatGameEvents(events)).toEqual([]);
  });
});

describe('formatGameEvents — DECK_CARD_REVEALED', () => {
  it('produces a deck reveal message', () => {
    const events: GameEvent[] = [{ type: 'DECK_CARD_REVEALED', cardId: 'm03-tti' }];
    expect(formatGameEvents(events)).toEqual(['덱에서 카드가 공개됐습니다.']);
  });
});

describe('formatGameEvents — CARD_CAPTURED', () => {
  it('includes card count for human capture (2 cards)', () => {
    const events: GameEvent[] = [
      { type: 'CARD_CAPTURED', playerId: HUMAN, cardIds: ['m01-gwang', 'm01-tti'] },
    ];
    expect(formatGameEvents(events)).toEqual(['내가 2장을 획득했습니다.']);
  });

  it('includes card count for AI capture (1 card)', () => {
    const events: GameEvent[] = [
      { type: 'CARD_CAPTURED', playerId: AI, cardIds: ['m05-pi-1'] },
    ];
    expect(formatGameEvents(events)).toEqual(['AI가 1장을 획득했습니다.']);
  });
});

describe('formatGameEvents — SCORE_CHANGED', () => {
  it('uses possessive label and total for human', () => {
    const events: GameEvent[] = [{ type: 'SCORE_CHANGED', playerId: HUMAN, score: score(7) }];
    expect(formatGameEvents(events)).toEqual(['내 점수: 7점']);
  });

  it('uses possessive label and total for AI', () => {
    const events: GameEvent[] = [{ type: 'SCORE_CHANGED', playerId: AI, score: score(5) }];
    expect(formatGameEvents(events)).toEqual(['AI 점수: 5점']);
  });
});

describe('formatGameEvents — GO_STOP_DECISION_REQUIRED', () => {
  it('names the deciding player (human)', () => {
    const events: GameEvent[] = [{ type: 'GO_STOP_DECISION_REQUIRED', playerId: HUMAN }];
    expect(formatGameEvents(events)).toEqual(['내가 고/스톱을 선택해야 합니다.']);
  });

  it('names the deciding player (AI)', () => {
    const events: GameEvent[] = [{ type: 'GO_STOP_DECISION_REQUIRED', playerId: AI }];
    expect(formatGameEvents(events)).toEqual(['AI가 고/스톱을 선택해야 합니다.']);
  });
});

describe('formatGameEvents — GO_DECLARED', () => {
  it('includes the go count', () => {
    const events: GameEvent[] = [{ type: 'GO_DECLARED', playerId: HUMAN, goCount: 2 }];
    expect(formatGameEvents(events)).toEqual(['내가 고! (2번째)']);
  });

  it('uses AI label when AI declares go', () => {
    const events: GameEvent[] = [{ type: 'GO_DECLARED', playerId: AI, goCount: 1 }];
    expect(formatGameEvents(events)).toEqual(['AI가 고! (1번째)']);
  });
});

describe('formatGameEvents — STOP_DECLARED', () => {
  it('uses subject label for human stop', () => {
    const events: GameEvent[] = [{ type: 'STOP_DECLARED', playerId: HUMAN }];
    expect(formatGameEvents(events)).toEqual(['내가 스톱!']);
  });

  it('uses subject label for AI stop', () => {
    const events: GameEvent[] = [{ type: 'STOP_DECLARED', playerId: AI }];
    expect(formatGameEvents(events)).toEqual(['AI가 스톱!']);
  });
});

describe('formatGameEvents — TURN_CHANGED', () => {
  it('says "내 차례" when turn goes to human', () => {
    const events: GameEvent[] = [{ type: 'TURN_CHANGED', fromPlayerId: AI, toPlayerId: HUMAN }];
    expect(formatGameEvents(events)).toEqual(['내 차례입니다.']);
  });

  it('says "AI 차례" when turn goes to AI', () => {
    const events: GameEvent[] = [{ type: 'TURN_CHANGED', fromPlayerId: HUMAN, toPlayerId: AI }];
    expect(formatGameEvents(events)).toEqual(['AI 차례입니다.']);
  });
});

describe('formatGameEvents — GAME_ENDED', () => {
  it('produces a game ended message', () => {
    const events: GameEvent[] = [
      {
        type: 'GAME_ENDED',
        result: {
          winner: HUMAN,
          reason: 'stop' as const,
          scores: {
            [HUMAN]: { total: 10, gwang: 0, yeol: 0, tti: 5, pi: 5 },
            [AI]: { total: 4, gwang: 0, yeol: 0, tti: 2, pi: 2 },
          },
        },
      },
    ];
    expect(formatGameEvents(events)).toEqual(['게임이 종료됐습니다.']);
  });
});

describe('formatGameEvents — INVALID_ACTION_REJECTED (filtered)', () => {
  it('produces no message for INVALID_ACTION_REJECTED', () => {
    const events: GameEvent[] = [{ type: 'INVALID_ACTION_REJECTED' }];
    expect(formatGameEvents(events)).toEqual([]);
  });
});

describe('formatGameEvents — multiple events', () => {
  it('filters null-producing events and returns only non-empty messages', () => {
    const events: GameEvent[] = [
      { type: 'CARD_PLAYED', playerId: HUMAN, cardId: 'm01-gwang' },
      { type: 'CARD_MATCHED' }, // filtered
      { type: 'CARD_CAPTURED', playerId: HUMAN, cardIds: ['m01-gwang', 'm01-tti'] },
      { type: 'SCORE_CHANGED', playerId: HUMAN, score: score(3) },
      { type: 'TURN_CHANGED', fromPlayerId: HUMAN, toPlayerId: AI },
    ];
    expect(formatGameEvents(events)).toEqual([
      '내가 카드를 냈습니다.',
      '내가 2장을 획득했습니다.',
      '내 점수: 3점',
      'AI 차례입니다.',
    ]);
  });
});
