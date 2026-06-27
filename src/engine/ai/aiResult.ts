import type { GameAction } from '../types/action.js';

/**
 * Result returned by an AI action selector.
 *
 * success=true  — the selector chose a legal action.
 * success=false — no action could be selected (e.g. game already ended).
 */
export type AiActionSelectionResult =
  | { readonly success: true; readonly action: GameAction }
  | { readonly success: false; readonly reason: string };
