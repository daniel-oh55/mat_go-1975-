import { describe, it, expect } from 'vitest';
import { runHeadlessSimulation } from './headlessSimulation.js';
import { SeededRandomProvider } from '../rng/seededRandomProvider.js';
import { validateGameState } from '../state/stateValidation.js';
import type { EnginePlayer, GameState } from '../state/gameState.js';

const AI_1: EnginePlayer = { id: 'ai1', kind: 'ai' };
const AI_2: EnginePlayer = { id: 'ai2', kind: 'ai' };
const HUMAN: EnginePlayer = { id: 'h1', kind: 'human' };
const AI: EnginePlayer = { id: 'ai1', kind: 'ai' };

/** Count cards across all zones; works for any 2-player GameState. */
function totalCardCount(state: GameState): number {
  return state.players.reduce(
    (sum, p) =>
      sum +
      (state.playerHands[p.id] ?? []).length +
      (state.capturedCards[p.id] ?? []).length,
    state.drawPile.length + state.fieldCards.length,
  );
}

// ─── AI vs AI — basic completion ─────────────────────────────────────────────

describe('runHeadlessSimulation — AI vs AI basic completion', () => {
  const result = runHeadlessSimulation({
    players: [AI_1, AI_2],
    randomProvider: new SeededRandomProvider(42),
  });

  it('status is "completed"', () => {
    expect(result.status).toBe('completed');
  });

  it('final state phase is "ended"', () => {
    expect(result.finalState.phase).toBe('ended');
  });

  it('finalResult is not null', () => {
    expect(result.finalState.finalResult).not.toBeNull();
  });

  it('finalResult.winner is a valid player id or null', () => {
    const winner = result.finalState.finalResult?.winner;
    expect(winner === null || winner === AI_1.id || winner === AI_2.id).toBe(true);
  });

  it('finalResult.reason is "stop" or "exhausted"', () => {
    const reason = result.finalState.finalResult?.reason;
    expect(reason === 'stop' || reason === 'exhausted').toBe(true);
  });

  it('final state passes validateGameState', () => {
    expect(validateGameState(result.finalState).valid).toBe(true);
  });

  it('total card count is 48 in final state', () => {
    expect(totalCardCount(result.finalState)).toBe(48);
  });

  it('turnCount is positive', () => {
    expect(result.turnCount).toBeGreaterThan(0);
  });

  it('actionCount is positive', () => {
    expect(result.actionCount).toBeGreaterThan(0);
  });

  it('errors array is empty on success', () => {
    expect(result.errors).toHaveLength(0);
  });
});

// ─── Human vs AI — basic completion ──────────────────────────────────────────
//
// Verifies that the simulation runs the MVP player setup (human + AI) to
// completion without UI. The human player's turns use uniform-random PLAY_CARD
// selection via selectActionForHeadlessSimulation.

describe('runHeadlessSimulation — Human vs AI basic completion', () => {
  const result = runHeadlessSimulation({
    players: [HUMAN, AI],
    randomProvider: new SeededRandomProvider(42),
  });

  it('status is "completed"', () => {
    expect(result.status).toBe('completed');
  });

  it('final state phase is "ended"', () => {
    expect(result.finalState.phase).toBe('ended');
  });

  it('finalResult is not null', () => {
    expect(result.finalState.finalResult).not.toBeNull();
  });

  it('finalResult.winner is a valid player id or null', () => {
    const winner = result.finalState.finalResult?.winner;
    expect(winner === null || winner === HUMAN.id || winner === AI.id).toBe(true);
  });

  it('finalResult.reason is "stop" or "exhausted"', () => {
    const reason = result.finalState.finalResult?.reason;
    expect(reason === 'stop' || reason === 'exhausted').toBe(true);
  });

  it('final state passes validateGameState', () => {
    expect(validateGameState(result.finalState).valid).toBe(true);
  });

  it('total card count is 48 in final state', () => {
    expect(totalCardCount(result.finalState)).toBe(48);
  });

  it('turnCount is positive', () => {
    expect(result.turnCount).toBeGreaterThan(0);
  });

  it('actionCount is positive', () => {
    expect(result.actionCount).toBeGreaterThan(0);
  });

  it('errors array is empty on success', () => {
    expect(result.errors).toHaveLength(0);
  });
});

// ─── Human vs AI — multiple seeds ────────────────────────────────────────────

describe('runHeadlessSimulation — Human vs AI multiple seeds', () => {
  it('10 different seeds all produce status "completed"', () => {
    for (let seed = 0; seed < 10; seed++) {
      const result = runHeadlessSimulation({
        players: [HUMAN, AI],
        randomProvider: new SeededRandomProvider(seed),
      });
      expect(result.status).toBe('completed');
    }
  });

  it('10 different seeds all produce 48 cards in final state', () => {
    for (let seed = 0; seed < 10; seed++) {
      const result = runHeadlessSimulation({
        players: [HUMAN, AI],
        randomProvider: new SeededRandomProvider(seed),
      });
      expect(totalCardCount(result.finalState)).toBe(48);
    }
  });

  it('10 different seeds all pass validateGameState', () => {
    for (let seed = 0; seed < 10; seed++) {
      const result = runHeadlessSimulation({
        players: [HUMAN, AI],
        randomProvider: new SeededRandomProvider(seed),
      });
      expect(validateGameState(result.finalState).valid).toBe(true);
    }
  });
});

// ─── Human vs AI — determinism ───────────────────────────────────────────────

describe('runHeadlessSimulation — Human vs AI determinism', () => {
  it('same seed produces identical status and actionCount', () => {
    const seed = 7;
    const r1 = runHeadlessSimulation({
      players: [HUMAN, AI],
      randomProvider: new SeededRandomProvider(seed),
    });
    const r2 = runHeadlessSimulation({
      players: [HUMAN, AI],
      randomProvider: new SeededRandomProvider(seed),
    });
    expect(r1.status).toBe(r2.status);
    expect(r1.actionCount).toBe(r2.actionCount);
    expect(r1.turnCount).toBe(r2.turnCount);
  });

  it('same seed produces identical winner', () => {
    const seed = 13;
    const r1 = runHeadlessSimulation({
      players: [HUMAN, AI],
      randomProvider: new SeededRandomProvider(seed),
    });
    const r2 = runHeadlessSimulation({
      players: [HUMAN, AI],
      randomProvider: new SeededRandomProvider(seed),
    });
    expect(r1.finalState.finalResult?.winner).toBe(r2.finalState.finalResult?.winner);
  });
});

// ─── AI vs AI — determinism ───────────────────────────────────────────────────

describe('runHeadlessSimulation — AI vs AI determinism', () => {
  it('same seed produces identical status and actionCount', () => {
    const seed = 7;
    const r1 = runHeadlessSimulation({
      players: [AI_1, AI_2],
      randomProvider: new SeededRandomProvider(seed),
    });
    const r2 = runHeadlessSimulation({
      players: [AI_1, AI_2],
      randomProvider: new SeededRandomProvider(seed),
    });
    expect(r1.status).toBe(r2.status);
    expect(r1.actionCount).toBe(r2.actionCount);
    expect(r1.turnCount).toBe(r2.turnCount);
  });

  it('same seed produces identical winner', () => {
    const seed = 13;
    const r1 = runHeadlessSimulation({
      players: [AI_1, AI_2],
      randomProvider: new SeededRandomProvider(seed),
    });
    const r2 = runHeadlessSimulation({
      players: [AI_1, AI_2],
      randomProvider: new SeededRandomProvider(seed),
    });
    expect(r1.finalState.finalResult?.winner).toBe(r2.finalState.finalResult?.winner);
  });
});

// ─── AI vs AI — multiple seeds ────────────────────────────────────────────────

describe('runHeadlessSimulation — AI vs AI multiple seeds', () => {
  it('10 different seeds all produce status "completed"', () => {
    for (let seed = 0; seed < 10; seed++) {
      const result = runHeadlessSimulation({
        players: [AI_1, AI_2],
        randomProvider: new SeededRandomProvider(seed),
      });
      expect(result.status).toBe('completed');
    }
  });

  it('10 different seeds all produce 48 cards in final state', () => {
    for (let seed = 0; seed < 10; seed++) {
      const result = runHeadlessSimulation({
        players: [AI_1, AI_2],
        randomProvider: new SeededRandomProvider(seed),
      });
      expect(totalCardCount(result.finalState)).toBe(48);
    }
  });

  it('10 different seeds all pass validateGameState', () => {
    for (let seed = 0; seed < 10; seed++) {
      const result = runHeadlessSimulation({
        players: [AI_1, AI_2],
        randomProvider: new SeededRandomProvider(seed),
      });
      expect(validateGameState(result.finalState).valid).toBe(true);
    }
  });
});

// ─── maxActions limit ─────────────────────────────────────────────────────────

describe('runHeadlessSimulation — maxActions guard', () => {
  it('returns "maxTurnsReached" when maxActions is 1', () => {
    const result = runHeadlessSimulation({
      players: [AI_1, AI_2],
      randomProvider: new SeededRandomProvider(42),
      maxActions: 1,
    });
    expect(result.status).toBe('maxTurnsReached');
  });

  it('errors array is non-empty when maxActions is hit', () => {
    const result = runHeadlessSimulation({
      players: [AI_1, AI_2],
      randomProvider: new SeededRandomProvider(42),
      maxActions: 1,
    });
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('actionCount equals maxActions when limit is hit', () => {
    const result = runHeadlessSimulation({
      players: [AI_1, AI_2],
      randomProvider: new SeededRandomProvider(42),
      maxActions: 5,
    });
    if (result.status === 'maxTurnsReached') {
      expect(result.actionCount).toBe(5);
    }
  });
});

// ─── default players (players omitted from config) ───────────────────────────
//
// Verifies that omitting `players` from HeadlessSimulationConfig uses the
// default MVP setup: { id: 'human', kind: 'human' } and { id: 'ai', kind: 'ai' }.

describe('runHeadlessSimulation — default players (players omitted)', () => {
  const result = runHeadlessSimulation({
    randomProvider: new SeededRandomProvider(42),
  });

  it('status is "completed" without explicit players', () => {
    expect(result.status).toBe('completed');
  });

  it('final state phase is "ended"', () => {
    expect(result.finalState.phase).toBe('ended');
  });

  it('default player ids are "human" and "ai"', () => {
    const ids = result.finalState.players.map((p) => p.id);
    expect(ids).toContain('human');
    expect(ids).toContain('ai');
  });

  it('final state passes validateGameState', () => {
    expect(validateGameState(result.finalState).valid).toBe(true);
  });

  it('total card count is 48 in final state', () => {
    expect(totalCardCount(result.finalState)).toBe(48);
  });
});

// ─── game end reasons across seeds ───────────────────────────────────────────

describe('runHeadlessSimulation — game end reasons', () => {
  it('all AI vs AI completed games have reason stop or exhausted', () => {
    for (let seed = 0; seed < 20; seed++) {
      const result = runHeadlessSimulation({
        players: [AI_1, AI_2],
        randomProvider: new SeededRandomProvider(seed),
      });
      if (result.status !== 'completed') continue;
      const reason = result.finalState.finalResult?.reason;
      expect(reason === 'stop' || reason === 'exhausted').toBe(true);
    }
  });

  it('all Human vs AI completed games have reason stop or exhausted', () => {
    for (let seed = 0; seed < 20; seed++) {
      const result = runHeadlessSimulation({
        players: [HUMAN, AI],
        randomProvider: new SeededRandomProvider(seed),
      });
      if (result.status !== 'completed') continue;
      const reason = result.finalState.finalResult?.reason;
      expect(reason === 'stop' || reason === 'exhausted').toBe(true);
    }
  });
});
