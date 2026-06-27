import type { Card } from '../types/card.js';
import type { PlayerScoreState } from '../types/score.js';

/**
 * Calculates the score from a player's captured cards using the MVP
 * basic score table (OD-3).
 *
 * 광 (gwang): 3장=3pts, 4장=4pts, 5장=15pts. 비광은 MVP에서 일반 광 1장으로 계산.
 * 열 (yeol): count >= 5 → count - 4 pts. 고도리 bonus 미구현.
 * 띠 (tti): count >= 5 → count - 4 pts. 홍단/청단/초단 bonus 미구현.
 * 피 (pi): count >= 10 → count - 9 pts. 쌍피 MVP에서 1장으로 계산.
 */
export function calculateScore(capturedCards: ReadonlyArray<Card>): PlayerScoreState {
  const gwangCount = capturedCards.filter((c) => c.category === 'gwang').length;
  const yeolCount = capturedCards.filter((c) => c.category === 'yeol').length;
  const ttiCount = capturedCards.filter((c) => c.category === 'tti').length;
  const piCount = capturedCards.filter((c) => c.category === 'pi').length;

  const gwang = gwangScore(gwangCount);
  const yeol = yeolCount >= 5 ? yeolCount - 4 : 0;
  const tti = ttiCount >= 5 ? ttiCount - 4 : 0;
  const pi = piCount >= 10 ? piCount - 9 : 0;

  return { total: gwang + yeol + tti + pi, gwang, yeol, tti, pi };
}

function gwangScore(count: number): number {
  if (count >= 5) return 15;
  if (count === 4) return 4;
  if (count === 3) return 3;
  return 0;
}
