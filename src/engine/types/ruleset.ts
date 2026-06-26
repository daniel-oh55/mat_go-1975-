/**
 * Determines how the engine handles capture when two or more field cards
 * share the same month as the played/revealed card.
 *
 * - targetSelection: the GameAction must specify a targetFieldCardId (OD-2 resolution)
 * - captureAll: all matching field cards are captured (deferred Ruleset option)
 */
export type MultipleMatchMode = 'targetSelection' | 'captureAll';

/**
 * Rule configuration for a game session.
 * Controls thresholds, optional rules, and variant behaviors.
 *
 * Must NOT reference NPC names, region names, or story conditions.
 * Content-specific rule modifications are mapped to generic Ruleset fields
 * by the Application layer before being passed to the engine.
 */
export interface Ruleset {
  /** Number of cards dealt to each player's hand at game start (OD-1: 10) */
  readonly initialHandCount: number;
  /** Number of cards placed on the field at game start (OD-1: 8) */
  readonly initialFieldCount: number;
  /** Score threshold that triggers a Go/Stop decision (OD-4: 7) */
  readonly goStopThreshold: number;
  /** Whether the Go multiplier is applied to the winner's score (OD-5: false in MVP) */
  readonly applyGoMultiplier: boolean;
  /** How to resolve capture when multiple same-month field cards exist (OD-2) */
  readonly multipleMatchMode: MultipleMatchMode;
}

/**
 * The confirmed MVP default ruleset.
 * Values are sourced from docs/12_open_decision_resolution.md.
 */
export const defaultRuleset: Ruleset = {
  initialHandCount: 10,
  initialFieldCount: 8,
  goStopThreshold: 7,
  applyGoMultiplier: false,
  multipleMatchMode: 'targetSelection',
} as const;
