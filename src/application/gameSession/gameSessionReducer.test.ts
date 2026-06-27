import { describe, it, expect } from 'vitest';
import { SeededRandomProvider } from '../../engine/rng/seededRandomProvider.js';
import { createIdleSession, createGameSession, HUMAN_PLAYER_ID, AI_PLAYER_ID } from './createGameSession.js';
import { gameSessionReducer } from './gameSessionReducer.js';

function startedSession(seed = 0) {
  return createGameSession(new SeededRandomProvider(seed));
}

// ─── START_GAME ───────────────────────────────────────────────────────────────

describe('gameSessionReducer — START_GAME', () => {
  it('transitions idle → playing', () => {
    const next = gameSessionReducer(createIdleSession(), {
      type: 'START_GAME',
      randomProvider: new SeededRandomProvider(0),
    });
    expect(next.phase).toBe('playing');
  });

  it('produces a non-null gameState', () => {
    const next = gameSessionReducer(createIdleSession(), {
      type: 'START_GAME',
      randomProvider: new SeededRandomProvider(0),
    });
    expect(next.gameState).not.toBeNull();
  });

  it('clears allEvents', () => {
    const next = gameSessionReducer(createIdleSession(), {
      type: 'START_GAME',
      randomProvider: new SeededRandomProvider(0),
    });
    expect(next.allEvents).toHaveLength(0);
  });

  it('clears any error from a previous session', () => {
    const errored = { ...startedSession(), error: 'previous error' };
    const next = gameSessionReducer(errored, {
      type: 'START_GAME',
      randomProvider: new SeededRandomProvider(1),
    });
    expect(next.error).toBeNull();
  });

  it('replaces an existing game', () => {
    const first = startedSession(1);
    const next = gameSessionReducer(first, {
      type: 'START_GAME',
      randomProvider: new SeededRandomProvider(2),
    });
    expect(next.phase).toBe('playing');
    expect(next.allEvents).toHaveLength(0);
  });
});

// ─── SUBMIT_HUMAN_ACTION ──────────────────────────────────────────────────────

describe('gameSessionReducer — SUBMIT_HUMAN_ACTION', () => {
  it('returns error when no game is active', () => {
    const next = gameSessionReducer(createIdleSession(), {
      type: 'SUBMIT_HUMAN_ACTION',
      action: { type: 'PLAY_CARD', cardId: 'any' },
    });
    expect(next.error).not.toBeNull();
  });

  it('returns error when game is already ended', () => {
    const ended = { ...startedSession(), phase: 'ended' as const };
    const next = gameSessionReducer(ended, {
      type: 'SUBMIT_HUMAN_ACTION',
      action: { type: 'CHOOSE_STOP' },
    });
    expect(next.error).not.toBeNull();
  });

  it('returns error on an invalid cardId', () => {
    const session = startedSession(0);
    const next = gameSessionReducer(session, {
      type: 'SUBMIT_HUMAN_ACTION',
      action: { type: 'PLAY_CARD', cardId: 'nonexistent-card-99999' },
    });
    expect(next.error).not.toBeNull();
  });

  it('advances state on a valid human action', () => {
    const session = startedSession(0);
    // Human always goes first; legalPlayActions is pre-computed in the view model
    const vm = session.viewModel!;
    const legalAction = vm.legalPlayActions[0]!;
    const playAction =
      legalAction.targetFieldCardId !== undefined
        ? { type: 'PLAY_CARD' as const, cardId: legalAction.cardId, targetFieldCardId: legalAction.targetFieldCardId }
        : { type: 'PLAY_CARD' as const, cardId: legalAction.cardId };

    const next = gameSessionReducer(session, {
      type: 'SUBMIT_HUMAN_ACTION',
      action: playAction,
    });
    expect(next.error).toBeNull();
    expect(next.allEvents.length).toBeGreaterThan(0);
  });

  it('updates viewModel after a valid action', () => {
    const session = startedSession(0);
    const vm = session.viewModel!;
    const legalAction = vm.legalPlayActions[0]!;
    const playAction =
      legalAction.targetFieldCardId !== undefined
        ? { type: 'PLAY_CARD' as const, cardId: legalAction.cardId, targetFieldCardId: legalAction.targetFieldCardId }
        : { type: 'PLAY_CARD' as const, cardId: legalAction.cardId };

    const next = gameSessionReducer(session, {
      type: 'SUBMIT_HUMAN_ACTION',
      action: playAction,
    });
    expect(next.viewModel).not.toBeNull();
    // After human plays, it's AI's turn
    expect(next.viewModel!.isHumanTurn).toBe(false);
  });

  it('accumulates events across multiple actions', () => {
    const session = startedSession(0);
    const vm = session.viewModel!;
    const legalAction = vm.legalPlayActions[0]!;
    const playAction =
      legalAction.targetFieldCardId !== undefined
        ? { type: 'PLAY_CARD' as const, cardId: legalAction.cardId, targetFieldCardId: legalAction.targetFieldCardId }
        : { type: 'PLAY_CARD' as const, cardId: legalAction.cardId };

    const after = gameSessionReducer(session, {
      type: 'SUBMIT_HUMAN_ACTION',
      action: playAction,
    });
    expect(after.allEvents.length).toBeGreaterThanOrEqual(after.lastEvents.length);
    expect(after.lastEvents.length).toBeGreaterThan(0);
  });
});

// ─── ADVANCE_AI ───────────────────────────────────────────────────────────────

describe('gameSessionReducer — ADVANCE_AI', () => {
  it('returns error when no game is active', () => {
    const next = gameSessionReducer(createIdleSession(), {
      type: 'ADVANCE_AI',
      randomProvider: new SeededRandomProvider(0),
    });
    expect(next.error).not.toBeNull();
  });

  it('is a no-op when game is already ended', () => {
    const ended = { ...startedSession(), phase: 'ended' as const };
    const next = gameSessionReducer(ended, {
      type: 'ADVANCE_AI',
      randomProvider: new SeededRandomProvider(0),
    });
    expect(next).toBe(ended);
  });

  it('advances state when it is the AI turn', () => {
    // Submit one human action first to pass the turn to the AI
    const session = startedSession(0);
    const vm = session.viewModel!;
    const legalAction = vm.legalPlayActions[0]!;
    const playAction =
      legalAction.targetFieldCardId !== undefined
        ? { type: 'PLAY_CARD' as const, cardId: legalAction.cardId, targetFieldCardId: legalAction.targetFieldCardId }
        : { type: 'PLAY_CARD' as const, cardId: legalAction.cardId };

    const afterHuman = gameSessionReducer(session, {
      type: 'SUBMIT_HUMAN_ACTION',
      action: playAction,
    });
    expect(afterHuman.viewModel!.isHumanTurn).toBe(false); // AI's turn

    const afterAi = gameSessionReducer(afterHuman, {
      type: 'ADVANCE_AI',
      randomProvider: new SeededRandomProvider(99),
    });
    expect(afterAi.error).toBeNull();
    expect(afterAi.allEvents.length).toBeGreaterThan(afterHuman.allEvents.length);
  });

  it('phase remains valid after AI action', () => {
    const session = startedSession(0);
    const vm = session.viewModel!;
    const legalAction = vm.legalPlayActions[0]!;
    const playAction =
      legalAction.targetFieldCardId !== undefined
        ? { type: 'PLAY_CARD' as const, cardId: legalAction.cardId, targetFieldCardId: legalAction.targetFieldCardId }
        : { type: 'PLAY_CARD' as const, cardId: legalAction.cardId };

    const afterHuman = gameSessionReducer(session, { type: 'SUBMIT_HUMAN_ACTION', action: playAction });
    const afterAi = gameSessionReducer(afterHuman, {
      type: 'ADVANCE_AI',
      randomProvider: new SeededRandomProvider(99),
    });
    const validPhases = ['playing', 'pendingGoStop', 'ended'] as const;
    expect(validPhases.includes(afterAi.phase as typeof validPhases[number])).toBe(true);
  });
});

// ─── Full game simulation through reducer ─────────────────────────────────────

describe('gameSessionReducer — full game simulation', () => {
  it('completes a full game using the reducer', () => {
    const rng = new SeededRandomProvider(42);
    let session = createGameSession(new SeededRandomProvider(42));
    let iterations = 0;
    const MAX = 300;

    while (session.phase !== 'ended' && iterations < MAX) {
      iterations++;
      const vm = session.viewModel;
      if (vm === null) break;

      if (session.phase === 'playing' && !vm.isHumanTurn) {
        session = gameSessionReducer(session, { type: 'ADVANCE_AI', randomProvider: rng });
      } else if (session.phase === 'pendingGoStop' && !vm.isPendingGoStopDecisionForHuman) {
        session = gameSessionReducer(session, { type: 'ADVANCE_AI', randomProvider: rng });
      } else if (session.phase === 'playing' && vm.isHumanTurn) {
        const la = vm.legalPlayActions[0];
        if (!la) break;
        const action =
          la.targetFieldCardId !== undefined
            ? { type: 'PLAY_CARD' as const, cardId: la.cardId, targetFieldCardId: la.targetFieldCardId }
            : { type: 'PLAY_CARD' as const, cardId: la.cardId };
        session = gameSessionReducer(session, { type: 'SUBMIT_HUMAN_ACTION', action });
      } else if (session.phase === 'pendingGoStop' && vm.isPendingGoStopDecisionForHuman) {
        session = gameSessionReducer(session, {
          type: 'SUBMIT_HUMAN_ACTION',
          action: { type: 'CHOOSE_STOP' },
        });
      }
    }

    expect(session.phase).toBe('ended');
    expect(session.viewModel?.finalResult).not.toBeNull();
    expect(session.error).toBeNull();
  });

  it('final state has a valid winner or draw', () => {
    const rng = new SeededRandomProvider(7);
    let session = createGameSession(new SeededRandomProvider(7));
    let iterations = 0;

    while (session.phase !== 'ended' && iterations < 300) {
      iterations++;
      const vm = session.viewModel;
      if (vm === null) break;

      if (!vm.isHumanTurn || session.phase === 'pendingGoStop' && !vm.isPendingGoStopDecisionForHuman) {
        session = gameSessionReducer(session, { type: 'ADVANCE_AI', randomProvider: rng });
      } else if (vm.isHumanTurn && session.phase === 'playing') {
        const la = vm.legalPlayActions[0];
        if (!la) break;
        const action =
          la.targetFieldCardId !== undefined
            ? { type: 'PLAY_CARD' as const, cardId: la.cardId, targetFieldCardId: la.targetFieldCardId }
            : { type: 'PLAY_CARD' as const, cardId: la.cardId };
        session = gameSessionReducer(session, { type: 'SUBMIT_HUMAN_ACTION', action });
      } else {
        session = gameSessionReducer(session, {
          type: 'SUBMIT_HUMAN_ACTION',
          action: { type: 'CHOOSE_STOP' },
        });
      }
    }

    const winner = session.viewModel?.finalResult?.winner;
    const isValid =
      winner === null ||
      winner === HUMAN_PLAYER_ID ||
      winner === AI_PLAYER_ID;
    expect(isValid).toBe(true);
  });
});
