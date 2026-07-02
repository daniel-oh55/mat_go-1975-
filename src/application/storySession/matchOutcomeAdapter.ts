/**
 * Application Layer: Story System match outcome adapter.
 *
 * Converts the engine's FinalResult into the Story System's MatchOutcome.
 * This is the only file in src/application/storySession/ permitted to import
 * an engine type. storyProgression.ts and storyTypes.ts remain engine-free.
 *
 * Dependency rule: may import FinalResult (type-only) from src/engine/types/.
 * Must not import any other engine module. Must not mutate FinalResult.
 * Player IDs come from src/application/shared/playerIds.ts, not from
 * gameSession/index.ts, so this file never pulls in gameSession's
 * createGameSession → engine runtime import chain.
 */

import type { FinalResult } from '../../engine/types/index.js';
import { HUMAN_PLAYER_ID, AI_PLAYER_ID } from '../shared/playerIds.js';
import type { MatchOutcome } from './storyTypes.js';

/**
 * Converts a completed match's engine FinalResult into a Story System MatchOutcome.
 *
 * humanWon is derived from FinalResult.winner — the engine's authoritative winner
 * determination — never from a standalone score comparison. A draw (winner: null)
 * and an AI win both map to humanWon: false.
 */
export function buildMatchOutcome(finalResult: FinalResult): MatchOutcome {
  return {
    humanWon: finalResult.winner === HUMAN_PLAYER_ID,
    humanFinalScore: finalResult.scores[HUMAN_PLAYER_ID]?.total ?? 0,
    aiFinalScore: finalResult.scores[AI_PLAYER_ID]?.total ?? 0,
  };
}
