import type { RandomProvider } from '../engine/rng/randomProvider.js';

/**
 * Production RandomProvider backed by Math.random().
 *
 * Only for use in the Application Layer and above.
 * Engine code must never call Math.random() directly — it receives a
 * RandomProvider via injection instead.
 */
export class MathRandomProvider implements RandomProvider {
  next(): number {
    return Math.random();
  }
}
