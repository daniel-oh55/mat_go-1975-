/**
 * Application Layer: shared player ID constants.
 *
 * Single source of truth for the human/AI player identity used across the
 * Application Layer. `gameSession` and `storySession` both read from here so
 * they agree on the same IDs without depending on each other.
 *
 * Dependency rule: engine and content must not import this file. storySession
 * must import player IDs from here, not from gameSession/index.ts, to avoid
 * an indirect storySession → gameSession → engine runtime coupling.
 *
 * No engine imports. No content imports. No runtime logic.
 */

export const HUMAN_PLAYER_ID = 'human';
export const AI_PLAYER_ID = 'ai';
