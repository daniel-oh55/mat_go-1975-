import type { GameEvent } from '../../engine/types/event.js';
import { HUMAN_PLAYER_ID } from './createGameSession.js';

function subjectLabel(playerId: string): string {
  return playerId === HUMAN_PLAYER_ID ? '내가' : 'AI가';
}

function possessiveLabel(playerId: string): string {
  return playerId === HUMAN_PLAYER_ID ? '내' : 'AI';
}

function formatSingleEvent(event: GameEvent): string | null {
  switch (event.type) {
    case 'GAME_STARTED':
      return '게임 시작!';
    case 'CARD_PLAYED':
      return `${subjectLabel(event.playerId)} 카드를 냈습니다.`;
    case 'CARD_MATCHED':
      return null; // subsumed by CARD_CAPTURED — no separate message
    case 'DECK_CARD_REVEALED':
      return '덱에서 카드가 공개됐습니다.';
    case 'CARD_CAPTURED':
      return `${subjectLabel(event.playerId)} ${event.cardIds.length}장을 획득했습니다.`;
    case 'SCORE_CHANGED':
      return `${possessiveLabel(event.playerId)} 점수: ${event.score.total}점`;
    case 'GO_STOP_DECISION_REQUIRED':
      return `${subjectLabel(event.playerId)} 고/스톱을 선택해야 합니다.`;
    case 'GO_DECLARED':
      return `${subjectLabel(event.playerId)} 고! (${event.goCount}번째)`;
    case 'STOP_DECLARED':
      return `${subjectLabel(event.playerId)} 스톱!`;
    case 'TURN_CHANGED':
      return event.toPlayerId === HUMAN_PLAYER_ID ? '내 차례입니다.' : 'AI 차례입니다.';
    case 'GAME_ENDED':
      return '게임이 종료됐습니다.';
    case 'INVALID_ACTION_REJECTED':
      return null; // engine-level rejection — not surfaced as a message
  }
}

/**
 * Converts a sequence of GameEvents into Korean UI messages.
 * Events that produce no user-visible text (CARD_MATCHED, INVALID_ACTION_REJECTED)
 * are silently filtered out.
 *
 * Pure function — no side effects.
 */
export function formatGameEvents(events: ReadonlyArray<GameEvent>): ReadonlyArray<string> {
  const messages: string[] = [];
  for (const event of events) {
    const msg = formatSingleEvent(event);
    if (msg !== null) messages.push(msg);
  }
  return messages;
}
