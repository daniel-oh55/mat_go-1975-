import { describe, it, expect } from 'vitest';
import { buildMatchOutcome } from './matchOutcomeAdapter.js';
import { HUMAN_PLAYER_ID, AI_PLAYER_ID } from '../gameSession/index.js';
import type { FinalResult, PlayerScoreState } from '../../engine/types/index.js';

function score(total: number): PlayerScoreState {
  return { total, gwang: 0, yeol: 0, tti: 0, pi: total };
}

describe('buildMatchOutcome', () => {
  it('maps a human win to humanWon: true', () => {
    const finalResult: FinalResult = {
      winner: HUMAN_PLAYER_ID,
      scores: { [HUMAN_PLAYER_ID]: score(12), [AI_PLAYER_ID]: score(3) },
      reason: 'stop',
    };

    expect(buildMatchOutcome(finalResult).humanWon).toBe(true);
  });

  it('maps an AI win to humanWon: false', () => {
    const finalResult: FinalResult = {
      winner: AI_PLAYER_ID,
      scores: { [HUMAN_PLAYER_ID]: score(2), [AI_PLAYER_ID]: score(9) },
      reason: 'stop',
    };

    expect(buildMatchOutcome(finalResult).humanWon).toBe(false);
  });

  it('maps a draw (winner: null) to humanWon: false', () => {
    const finalResult: FinalResult = {
      winner: null,
      scores: { [HUMAN_PLAYER_ID]: score(5), [AI_PLAYER_ID]: score(5) },
      reason: 'stop',
    };

    expect(buildMatchOutcome(finalResult).humanWon).toBe(false);
  });

  it('maps humanFinalScore from the human player total', () => {
    const finalResult: FinalResult = {
      winner: HUMAN_PLAYER_ID,
      scores: { [HUMAN_PLAYER_ID]: score(17), [AI_PLAYER_ID]: score(4) },
      reason: 'stop',
    };

    expect(buildMatchOutcome(finalResult).humanFinalScore).toBe(17);
  });

  it('maps aiFinalScore from the AI player total', () => {
    const finalResult: FinalResult = {
      winner: HUMAN_PLAYER_ID,
      scores: { [HUMAN_PLAYER_ID]: score(17), [AI_PLAYER_ID]: score(4) },
      reason: 'stop',
    };

    expect(buildMatchOutcome(finalResult).aiFinalScore).toBe(4);
  });

  it('maps humanWon: false consistently for a game ended by exhaustion, not just stop', () => {
    const finalResult: FinalResult = {
      winner: AI_PLAYER_ID,
      scores: { [HUMAN_PLAYER_ID]: score(0), [AI_PLAYER_ID]: score(3) },
      reason: 'exhausted',
    };

    expect(buildMatchOutcome(finalResult).humanWon).toBe(false);
  });

  it('does not mutate the input finalResult', () => {
    const finalResult: FinalResult = Object.freeze({
      winner: HUMAN_PLAYER_ID,
      scores: Object.freeze({
        [HUMAN_PLAYER_ID]: Object.freeze(score(17)),
        [AI_PLAYER_ID]: Object.freeze(score(4)),
      }),
      reason: 'stop' as const,
    });

    expect(() => buildMatchOutcome(finalResult)).not.toThrow();
    expect(finalResult.winner).toBe(HUMAN_PLAYER_ID);
    expect(finalResult.scores[HUMAN_PLAYER_ID]?.total).toBe(17);
    expect(finalResult.scores[AI_PLAYER_ID]?.total).toBe(4);
  });
});
