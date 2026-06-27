import type { Card } from '../types/card.js';
import type { CardId } from '../types/card.js';
import { findMatchingFieldCards } from './matching.js';

export interface CaptureResolutionInput {
  readonly sourceCard: Card;
  readonly fieldCards: ReadonlyArray<Card>;
  /**
   * true  — card came from the draw pile; deterministic fallback applies
   *         for multiple matches (first matching field card is selected).
   * false — card came from the player's hand; targetFieldCardId is required
   *         when multiple same-group field cards exist.
   */
  readonly isFromDrawPile: boolean;
  /**
   * Required (from hand play) when two or more field cards share the source
   * card's matchingGroup. Ignored when isFromDrawPile is true.
   */
  readonly targetFieldCardId?: CardId;
}

export interface CaptureResolutionSuccess {
  readonly success: true;
  /** fieldCards after the resolution (matched card removed, or sourceCard added). */
  readonly updatedFieldCards: ReadonlyArray<Card>;
  /** Cards that move to the current player's captured zone. */
  readonly capturedCards: ReadonlyArray<Card>;
  /** true when sourceCard was placed on the field (no match). */
  readonly placedOnField: boolean;
}

export interface CaptureResolutionFailure {
  readonly success: false;
  readonly reason: string;
}

export type CaptureResolution = CaptureResolutionSuccess | CaptureResolutionFailure;

/**
 * Determines the outcome of placing one card against the current field.
 *
 * 0 field matches  — sourceCard is placed on the field.
 * 1 field match    — sourceCard + matched card are captured.
 * 2+ field matches (hand play) — targetFieldCardId required; only that
 *                    card is captured along with the sourceCard.
 * 2+ field matches (draw pile) — MVP deterministic fallback: the first
 *                    matching field card (by array order) is selected.
 *
 * NOTE: captureAll mode (Ruleset.multipleMatchMode === 'captureAll') is
 * not yet implemented; it is deferred per OD-2.
 *
 * NOTE (future): The draw-pile multiple-match fallback is an MVP
 * simplification. A future version may trigger a pendingCaptureTarget
 * decision, letting the player choose which field card to capture when
 * the draw pile reveals a multi-match card.
 */
export function resolveCardAgainstField(
  input: CaptureResolutionInput,
): CaptureResolution {
  const { sourceCard, fieldCards, isFromDrawPile, targetFieldCardId } = input;
  const matches = findMatchingFieldCards(sourceCard, fieldCards);

  // ── 0 matches ─────────────────────────────────────────────────────────────
  if (matches.length === 0) {
    return {
      success: true,
      updatedFieldCards: [...fieldCards, sourceCard],
      capturedCards: [],
      placedOnField: true,
    };
  }

  // ── exactly 1 match ───────────────────────────────────────────────────────
  if (matches.length === 1) {
    const matched = matches[0] as Card; // safe: length checked above
    return {
      success: true,
      updatedFieldCards: fieldCards.filter((f) => f.id !== matched.id),
      capturedCards: [sourceCard, matched],
      placedOnField: false,
    };
  }

  // ── 2+ matches ────────────────────────────────────────────────────────────
  if (isFromDrawPile) {
    // Deterministic fallback: first matching card by array position.
    const firstMatch = matches[0] as Card; // safe: length >= 2
    return {
      success: true,
      updatedFieldCards: fieldCards.filter((f) => f.id !== firstMatch.id),
      capturedCards: [sourceCard, firstMatch],
      placedOnField: false,
    };
  }

  // Hand play requires a valid targetFieldCardId.
  if (targetFieldCardId === undefined) {
    return {
      success: false,
      reason:
        'targetFieldCardId is required when two or more same-group field cards exist',
    };
  }

  const target = matches.find((f) => f.id === targetFieldCardId);
  if (target === undefined) {
    return {
      success: false,
      reason: `targetFieldCardId "${targetFieldCardId}" is not a valid matching field card`,
    };
  }

  return {
    success: true,
    updatedFieldCards: fieldCards.filter((f) => f.id !== target.id),
    capturedCards: [sourceCard, target],
    placedOnField: false,
  };
}
