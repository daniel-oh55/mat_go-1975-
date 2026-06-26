/**
 * Injectable randomness source for the engine.
 *
 * The engine never calls Math.random() directly. All randomness is
 * injected via this interface so that:
 * - Production gameplay uses a fair, unbiased source.
 * - Tests use a seeded, deterministic source for reproducibility.
 *
 * RandomProvider must NEVER be used to favor or punish a player.
 * Difficulty is controlled through AI strategy, not card distribution.
 */
export interface RandomProvider {
  /**
   * Returns the next random value.
   * Contract: result is in the range [0, 1) — i.e., ≥ 0 and < 1.
   */
  next(): number;
}

/**
 * Production RandomProvider backed by Math.random().
 * Suitable for real gameplay — not for tests, which need determinism.
 */
export class MathRandomProvider implements RandomProvider {
  next(): number {
    return Math.random();
  }
}
