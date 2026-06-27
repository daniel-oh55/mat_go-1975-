import { describe, it, expect } from 'vitest';
import { SeededRandomProvider } from '../../engine/rng/seededRandomProvider.js';
import {
  createGameSession,
  createIdleSession,
  HUMAN_PLAYER_ID,
  AI_PLAYER_ID,
} from './createGameSession.js';

describe('createIdleSession', () => {
  it('returns phase idle', () => {
    expect(createIdleSession().phase).toBe('idle');
  });

  it('gameState is null', () => {
    expect(createIdleSession().gameState).toBeNull();
  });

  it('viewModel is null', () => {
    expect(createIdleSession().viewModel).toBeNull();
  });

  it('error is null', () => {
    expect(createIdleSession().error).toBeNull();
  });

  it('allEvents is empty', () => {
    expect(createIdleSession().allEvents).toHaveLength(0);
  });
});

describe('createGameSession', () => {
  const rng = new SeededRandomProvider(42);

  it('returns phase playing', () => {
    expect(createGameSession(rng).phase).toBe('playing');
  });

  it('gameState is not null', () => {
    expect(createGameSession(new SeededRandomProvider(0)).gameState).not.toBeNull();
  });

  it('viewModel is not null', () => {
    expect(createGameSession(new SeededRandomProvider(0)).viewModel).not.toBeNull();
  });

  it('error is null', () => {
    expect(createGameSession(new SeededRandomProvider(0)).error).toBeNull();
  });

  it('allEvents starts empty', () => {
    expect(createGameSession(new SeededRandomProvider(0)).allEvents).toHaveLength(0);
  });

  it('game has human and AI players', () => {
    const session = createGameSession(new SeededRandomProvider(0));
    const ids = session.gameState!.players.map((p) => p.id);
    expect(ids).toContain(HUMAN_PLAYER_ID);
    expect(ids).toContain(AI_PLAYER_ID);
  });

  it('human player is kind human', () => {
    const session = createGameSession(new SeededRandomProvider(0));
    const human = session.gameState!.players.find((p) => p.id === HUMAN_PLAYER_ID);
    expect(human?.kind).toBe('human');
  });

  it('AI player is kind ai', () => {
    const session = createGameSession(new SeededRandomProvider(0));
    const ai = session.gameState!.players.find((p) => p.id === AI_PLAYER_ID);
    expect(ai?.kind).toBe('ai');
  });

  it('human player goes first (player[0] convention)', () => {
    const session = createGameSession(new SeededRandomProvider(0));
    expect(session.gameState!.currentTurn).toBe(HUMAN_PLAYER_ID);
  });
});
