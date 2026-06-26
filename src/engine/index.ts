/**
 * Game Engine — public API surface
 *
 * This barrel re-exports everything the Application layer needs from the engine.
 * Game state, distribution, action application, scoring, and AI will be added
 * in subsequent Milestone 2 PRs.
 */
export * from './types/index.js';
export * from './cards/index.js';
export * from './rng/index.js';
export * from './shuffle/index.js';
export * from './state/index.js';
export * from './actions/index.js';
export * from './rules/index.js';
