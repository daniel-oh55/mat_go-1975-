import type { CardId } from '../types/card.js';
import type { GameState } from './gameState.js';

export interface GameStateValidationResult {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<string>;
}

const TOTAL_CARD_COUNT = 48;

/**
 * Validates invariants that must hold for any GameState, at any phase.
 *
 * Checks:
 * - Exactly 48 cards across all zones combined
 * - No card appears in more than one zone (no duplicate CardId)
 * - Exactly 2 players; no duplicate player IDs
 * - playerHands and capturedCards have an entry for each player
 * - scoreState and goStopState have an entry for each player
 * - goStopState[player].goCount >= 0 for each player
 * - currentTurn references a known player
 * - turnCount >= 0
 * - phase/pendingDecision consistency
 * - phase/finalResult consistency
 */
export function validateGameState(state: GameState): GameStateValidationResult {
  const errors: string[] = [];

  // Collect all card IDs from every zone
  const allCards: CardId[] = [
    ...state.drawPile.map((c) => c.id),
    ...state.fieldCards.map((c) => c.id),
  ];

  for (const player of state.players) {
    const hand = state.playerHands[player.id];
    if (hand === undefined) {
      errors.push(`playerHands missing entry for player "${player.id}"`);
    } else {
      allCards.push(...hand.map((c) => c.id));
    }

    const captured = state.capturedCards[player.id];
    if (captured === undefined) {
      errors.push(`capturedCards missing entry for player "${player.id}"`);
    } else {
      allCards.push(...captured.map((c) => c.id));
    }

    if (state.scoreState[player.id] === undefined) {
      errors.push(`scoreState missing entry for player "${player.id}"`);
    }

    const goStop = state.goStopState[player.id];
    if (goStop === undefined) {
      errors.push(`goStopState missing entry for player "${player.id}"`);
    } else if (goStop.goCount < 0) {
      errors.push(`goStopState goCount for player "${player.id}" is negative (${goStop.goCount})`);
    }
  }

  // Total card count
  if (allCards.length !== TOTAL_CARD_COUNT) {
    errors.push(
      `Total card count must be ${TOTAL_CARD_COUNT}, got ${allCards.length}`,
    );
  }

  // Duplicate detection
  const seen = new Set<CardId>();
  for (const id of allCards) {
    if (seen.has(id)) {
      errors.push(`Duplicate card "${id}" found in multiple zones`);
    } else {
      seen.add(id);
    }
  }

  // currentTurn validity
  const playerIds = new Set(state.players.map((p) => p.id));
  if (!playerIds.has(state.currentTurn)) {
    errors.push(
      `currentTurn "${state.currentTurn}" does not match any player id`,
    );
  }

  // Must have exactly 2 players for MVP
  if (state.players.length !== 2) {
    errors.push(`Expected 2 players, got ${state.players.length}`);
  }

  // Duplicate player IDs
  if (playerIds.size !== state.players.length) {
    errors.push('Duplicate player IDs detected');
  }

  // turnCount must be non-negative
  if (state.turnCount < 0) {
    errors.push(`turnCount is negative (${state.turnCount})`);
  }

  // phase / pendingDecision consistency
  if (state.phase === 'pendingGoStop' && state.pendingDecision === null) {
    errors.push('phase is "pendingGoStop" but pendingDecision is null');
  }
  if (state.phase === 'playing' && state.pendingDecision !== null) {
    errors.push('phase is "playing" but pendingDecision is not null');
  }
  if (state.phase === 'ended' && state.pendingDecision !== null) {
    errors.push('phase is "ended" but pendingDecision is not null');
  }

  // phase / finalResult consistency
  if (state.phase === 'ended' && state.finalResult === null) {
    errors.push('phase is "ended" but finalResult is null');
  }
  if (state.phase !== 'ended' && state.finalResult !== null) {
    errors.push(`phase is "${state.phase}" but finalResult is not null`);
  }

  return { valid: errors.length === 0, errors };
}

export function assertValidGameState(state: GameState): void {
  const result = validateGameState(state);
  if (!result.valid) {
    throw new Error(
      `Invalid GameState:\n${result.errors.map((e) => `  - ${e}`).join('\n')}`,
    );
  }
}
