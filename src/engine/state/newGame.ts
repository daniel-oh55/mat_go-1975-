import type { RandomProvider } from '../rng/randomProvider.js';
import type { Ruleset } from '../types/ruleset.js';
import { defaultRuleset } from '../types/ruleset.js';
import { createDefaultDeck } from '../cards/deck.js';
import { assertValidDeck } from '../cards/deckValidation.js';
import { shuffleDeck } from '../shuffle/shuffleDeck.js';
import type { GameState } from './gameState.js';
import type { EnginePlayer } from './gameState.js';

export interface NewGameConfig {
  readonly players: ReadonlyArray<EnginePlayer>;
  readonly ruleset?: Ruleset;
  readonly randomProvider: RandomProvider;
}

/**
 * Creates the initial GameState for a new game.
 *
 * Distribution (OD-1): each player receives initialHandCount (10) cards,
 * initialFieldCount (8) cards go to the field, and the remaining 20 form
 * the draw pile. Total = 48.
 *
 * The deck is freshly created, validated, and shuffled on every call.
 * Randomness comes exclusively from the injected RandomProvider —
 * Math.random() is never called here.
 *
 * FORBIDDEN: Do not adjust distribution based on player kind, difficulty,
 * monetization status, or any external factor. Fairness is non-negotiable.
 */
export function newGame(config: NewGameConfig): GameState {
  const { players, randomProvider } = config;
  const ruleset: Ruleset = config.ruleset ?? defaultRuleset;

  if (players.length !== 2) {
    throw new Error(`newGame requires exactly 2 players, got ${players.length}`);
  }

  const deck = createDefaultDeck();
  assertValidDeck(deck);
  const shuffled = shuffleDeck(deck, randomProvider);

  // Distribute: player 1 hand, player 2 hand, field, draw pile
  let cursor = 0;
  const take = (n: number) => {
    const slice = shuffled.slice(cursor, cursor + n);
    cursor += n;
    return slice;
  };

  const player1 = players[0] as EnginePlayer;
  const player2 = players[1] as EnginePlayer;

  const hand1 = take(ruleset.initialHandCount);
  const hand2 = take(ruleset.initialHandCount);
  const fieldCards = take(ruleset.initialFieldCount);
  const drawPile = shuffled.slice(cursor);

  const playerHands: Record<string, ReadonlyArray<(typeof hand1)[number]>> = {
    [player1.id]: hand1,
    [player2.id]: hand2,
  };

  const capturedCards: Record<string, ReadonlyArray<never>> = {
    [player1.id]: [],
    [player2.id]: [],
  };

  const scoreState: Record<string, { readonly total: number; readonly gwang: number; readonly yeol: number; readonly tti: number; readonly pi: number }> = {
    [player1.id]: { total: 0, gwang: 0, yeol: 0, tti: 0, pi: 0 },
    [player2.id]: { total: 0, gwang: 0, yeol: 0, tti: 0, pi: 0 },
  };

  const goStopState: Record<string, { readonly goCount: number }> = {
    [player1.id]: { goCount: 0 },
    [player2.id]: { goCount: 0 },
  };

  return {
    players,
    currentTurn: player1.id,
    phase: 'playing',
    drawPile,
    fieldCards,
    playerHands,
    capturedCards,
    scoreState,
    goStopState,
    pendingDecision: null,
    finalResult: null,
    turnCount: 0,
    ruleset,
  };
}
