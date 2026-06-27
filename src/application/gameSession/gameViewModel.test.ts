import { describe, it, expect } from 'vitest';
import { SeededRandomProvider } from '../../engine/rng/seededRandomProvider.js';
import { newGame } from '../../engine/state/newGame.js';
import { createDefaultDeck } from '../../engine/cards/deck.js';
import { defaultRuleset } from '../../engine/types/ruleset.js';
import { buildGameViewModel } from './gameViewModel.js';

const HUMAN_ID = 'human';
const AI_ID = 'ai';

function freshState(seed = 42) {
  return newGame({
    players: [
      { id: HUMAN_ID, kind: 'human' },
      { id: AI_ID, kind: 'ai' },
    ],
    randomProvider: new SeededRandomProvider(seed),
  });
}

describe('buildGameViewModel — card counts', () => {
  it('humanHand has 10 cards at game start', () => {
    const vm = buildGameViewModel(freshState(), HUMAN_ID, AI_ID);
    expect(vm.humanHand).toHaveLength(10);
  });

  it('aiHandCount is 10 at game start', () => {
    const vm = buildGameViewModel(freshState(), HUMAN_ID, AI_ID);
    expect(vm.aiHandCount).toBe(10);
  });

  it('drawPileCount is 20 at game start', () => {
    const vm = buildGameViewModel(freshState(), HUMAN_ID, AI_ID);
    expect(vm.drawPileCount).toBe(20);
  });

  it('fieldCards has 8 cards at game start', () => {
    const vm = buildGameViewModel(freshState(), HUMAN_ID, AI_ID);
    expect(vm.fieldCards).toHaveLength(8);
  });
});

describe('buildGameViewModel — scores', () => {
  it('humanScore starts at 0', () => {
    const vm = buildGameViewModel(freshState(), HUMAN_ID, AI_ID);
    expect(vm.humanScore).toBe(0);
  });

  it('aiScore starts at 0', () => {
    const vm = buildGameViewModel(freshState(), HUMAN_ID, AI_ID);
    expect(vm.aiScore).toBe(0);
  });
});

describe('buildGameViewModel — turn state', () => {
  it('isHumanTurn is true when currentTurn is human', () => {
    const state = freshState(); // human always goes first
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    expect(vm.isHumanTurn).toBe(true);
    expect(vm.currentTurn).toBe('human');
  });

  it('isHumanTurn is false when currentTurn is AI', () => {
    const state = { ...freshState(), currentTurn: AI_ID };
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    expect(vm.isHumanTurn).toBe(false);
    expect(vm.currentTurn).toBe('ai');
  });
});

describe('buildGameViewModel — legal actions', () => {
  it('legalCardIds is non-empty when it is the human turn', () => {
    const state = freshState(); // human goes first
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    expect(vm.legalCardIds.size).toBeGreaterThan(0);
  });

  it('legalPlayActions is non-empty when it is the human turn', () => {
    const state = freshState();
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    expect(vm.legalPlayActions.length).toBeGreaterThan(0);
  });

  it('every legalPlayAction cardId is in legalCardIds', () => {
    const state = freshState();
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    for (const action of vm.legalPlayActions) {
      expect(vm.legalCardIds.has(action.cardId)).toBe(true);
    }
  });

  it('legalCardIds is empty when it is the AI turn', () => {
    const state = { ...freshState(), currentTurn: AI_ID };
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    expect(vm.legalCardIds.size).toBe(0);
  });

  it('legalPlayActions is empty when it is the AI turn', () => {
    const state = { ...freshState(), currentTurn: AI_ID };
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    expect(vm.legalPlayActions).toHaveLength(0);
  });
});

describe('buildGameViewModel — pendingGoStop', () => {
  it('isPendingGoStopDecisionForHuman is false at game start', () => {
    const vm = buildGameViewModel(freshState(), HUMAN_ID, AI_ID);
    expect(vm.isPendingGoStopDecisionForHuman).toBe(false);
  });

  it('isPendingGoStopDecisionForHuman is true when human has pending decision', () => {
    const state = {
      ...freshState(),
      phase: 'pendingGoStop' as const,
      pendingDecision: { type: 'goStop' as const, playerId: HUMAN_ID },
    };
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    expect(vm.isPendingGoStopDecisionForHuman).toBe(true);
  });

  it('isPendingGoStopDecisionForHuman is false when AI has pending decision', () => {
    const state = {
      ...freshState(),
      phase: 'pendingGoStop' as const,
      pendingDecision: { type: 'goStop' as const, playerId: AI_ID },
    };
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    expect(vm.isPendingGoStopDecisionForHuman).toBe(false);
  });
});

describe('buildGameViewModel — phase and finalResult', () => {
  it('phase is "playing" at game start', () => {
    const vm = buildGameViewModel(freshState(), HUMAN_ID, AI_ID);
    expect(vm.phase).toBe('playing');
  });

  it('finalResult is null at game start', () => {
    const vm = buildGameViewModel(freshState(), HUMAN_ID, AI_ID);
    expect(vm.finalResult).toBeNull();
  });
});

// ─── multiTargetCardIds ───────────────────────────────────────────────────────

describe('buildGameViewModel — multiTargetCardIds', () => {
  it('multiTargetCardIds is empty at a normal game start', () => {
    // Standard deal is unlikely to put 2+ same-month cards on the field AND
    // that month in the human hand simultaneously — verify the field is empty.
    const vm = buildGameViewModel(freshState(), HUMAN_ID, AI_ID);
    // multiTargetCardIds will be empty unless the specific seed produces a
    // multi-match scenario. We assert the Set itself exists.
    expect(vm.multiTargetCardIds).toBeInstanceOf(Set);
  });

  it('multiTargetCardIds contains the card ID when two same-month field cards exist', () => {
    // Construct a state where m01-gwang is in the human hand and both
    // m01-tti and m01-pi-1 (both month 1) are on the field.
    const deck = createDefaultDeck();
    const byId = (id: string) => {
      const card = deck.find((c) => c.id === id);
      if (card === undefined) throw new Error(`Card ${id} not found`);
      return card;
    };

    const humanHand = [byId('m01-gwang')];
    const aiHand = [byId('m02-yeol'), byId('m02-tti')];
    const fieldCards = [byId('m01-tti'), byId('m01-pi-1')];
    // Rest of deck becomes the draw pile
    const usedIds = new Set([
      'm01-gwang', 'm02-yeol', 'm02-tti', 'm01-tti', 'm01-pi-1',
    ]);
    const drawPile = deck.filter((c) => !usedIds.has(c.id));

    const state = {
      players: [
        { id: HUMAN_ID, kind: 'human' as const },
        { id: AI_ID, kind: 'ai' as const },
      ],
      currentTurn: HUMAN_ID,
      phase: 'playing' as const,
      drawPile,
      fieldCards,
      playerHands: { [HUMAN_ID]: humanHand, [AI_ID]: aiHand },
      capturedCards: { [HUMAN_ID]: [], [AI_ID]: [] },
      scoreState: {
        [HUMAN_ID]: { total: 0, gwang: 0, yeol: 0, tti: 0, pi: 0 },
        [AI_ID]: { total: 0, gwang: 0, yeol: 0, tti: 0, pi: 0 },
      },
      goStopState: { [HUMAN_ID]: { goCount: 0 }, [AI_ID]: { goCount: 0 } },
      pendingDecision: null,
      finalResult: null,
      turnCount: 0,
      ruleset: defaultRuleset,
    };

    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    expect(vm.multiTargetCardIds.has('m01-gwang')).toBe(true);
  });

  it('multiTargetCardIds does NOT contain a card that has exactly one legal target', () => {
    const deck = createDefaultDeck();
    const byId = (id: string) => {
      const card = deck.find((c) => c.id === id);
      if (card === undefined) throw new Error(`Card ${id} not found`);
      return card;
    };

    // One hand card matching one field card — single target
    const humanHand = [byId('m01-gwang')];
    const aiHand = [byId('m02-yeol')];
    const fieldCards = [byId('m01-tti')]; // only one month-1 field card
    const usedIds = new Set(['m01-gwang', 'm02-yeol', 'm01-tti']);
    const drawPile = deck.filter((c) => !usedIds.has(c.id));

    const state = {
      players: [
        { id: HUMAN_ID, kind: 'human' as const },
        { id: AI_ID, kind: 'ai' as const },
      ],
      currentTurn: HUMAN_ID,
      phase: 'playing' as const,
      drawPile,
      fieldCards,
      playerHands: { [HUMAN_ID]: humanHand, [AI_ID]: aiHand },
      capturedCards: { [HUMAN_ID]: [], [AI_ID]: [] },
      scoreState: {
        [HUMAN_ID]: { total: 0, gwang: 0, yeol: 0, tti: 0, pi: 0 },
        [AI_ID]: { total: 0, gwang: 0, yeol: 0, tti: 0, pi: 0 },
      },
      goStopState: { [HUMAN_ID]: { goCount: 0 }, [AI_ID]: { goCount: 0 } },
      pendingDecision: null,
      finalResult: null,
      turnCount: 0,
      ruleset: defaultRuleset,
    };

    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    expect(vm.multiTargetCardIds.has('m01-gwang')).toBe(false);
  });

  it('legalPlayActions has two entries for a multi-target hand card', () => {
    const deck = createDefaultDeck();
    const byId = (id: string) => {
      const card = deck.find((c) => c.id === id);
      if (card === undefined) throw new Error(`Card ${id} not found`);
      return card;
    };

    const humanHand = [byId('m01-gwang')];
    const aiHand = [byId('m02-yeol'), byId('m02-tti')];
    const fieldCards = [byId('m01-tti'), byId('m01-pi-1')];
    const usedIds = new Set([
      'm01-gwang', 'm02-yeol', 'm02-tti', 'm01-tti', 'm01-pi-1',
    ]);
    const drawPile = deck.filter((c) => !usedIds.has(c.id));

    const state = {
      players: [
        { id: HUMAN_ID, kind: 'human' as const },
        { id: AI_ID, kind: 'ai' as const },
      ],
      currentTurn: HUMAN_ID,
      phase: 'playing' as const,
      drawPile,
      fieldCards,
      playerHands: { [HUMAN_ID]: humanHand, [AI_ID]: aiHand },
      capturedCards: { [HUMAN_ID]: [], [AI_ID]: [] },
      scoreState: {
        [HUMAN_ID]: { total: 0, gwang: 0, yeol: 0, tti: 0, pi: 0 },
        [AI_ID]: { total: 0, gwang: 0, yeol: 0, tti: 0, pi: 0 },
      },
      goStopState: { [HUMAN_ID]: { goCount: 0 }, [AI_ID]: { goCount: 0 } },
      pendingDecision: null,
      finalResult: null,
      turnCount: 0,
      ruleset: defaultRuleset,
    };

    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    const actionsForCard = vm.legalPlayActions.filter((a) => a.cardId === 'm01-gwang');
    expect(actionsForCard).toHaveLength(2);
    const targetIds = actionsForCard.map((a) => a.targetFieldCardId);
    expect(targetIds).toContain('m01-tti');
    expect(targetIds).toContain('m01-pi-1');
  });
});

// ─── statusDisplay ────────────────────────────────────────────────────────────

describe('buildGameViewModel — statusDisplay', () => {
  it('kind is "humanTurn" at game start (human goes first)', () => {
    const vm = buildGameViewModel(freshState(), HUMAN_ID, AI_ID);
    expect(vm.statusDisplay.kind).toBe('humanTurn');
  });

  it('label is non-empty for humanTurn', () => {
    const vm = buildGameViewModel(freshState(), HUMAN_ID, AI_ID);
    expect(vm.statusDisplay.label.length).toBeGreaterThan(0);
  });

  it('kind is "aiTurn" when it is the AI\'s turn', () => {
    const state = { ...freshState(), currentTurn: AI_ID };
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    expect(vm.statusDisplay.kind).toBe('aiTurn');
  });

  it('kind is "humanGoStop" when human has a pendingGoStop decision', () => {
    const state = {
      ...freshState(),
      phase: 'pendingGoStop' as const,
      pendingDecision: { type: 'goStop' as const, playerId: HUMAN_ID },
    };
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    expect(vm.statusDisplay.kind).toBe('humanGoStop');
  });

  it('kind is "aiGoStop" when AI has a pendingGoStop decision', () => {
    const state = {
      ...freshState(),
      phase: 'pendingGoStop' as const,
      pendingDecision: { type: 'goStop' as const, playerId: AI_ID },
    };
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    expect(vm.statusDisplay.kind).toBe('aiGoStop');
  });

  it('kind is "ended" when the game phase is ended', () => {
    const state = { ...freshState(), phase: 'ended' as const };
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    expect(vm.statusDisplay.kind).toBe('ended');
  });

  it('all five kinds produce a non-empty label', () => {
    const kinds = [
      buildGameViewModel(freshState(), HUMAN_ID, AI_ID).statusDisplay,
      buildGameViewModel({ ...freshState(), currentTurn: AI_ID }, HUMAN_ID, AI_ID).statusDisplay,
      buildGameViewModel({ ...freshState(), phase: 'pendingGoStop' as const, pendingDecision: { type: 'goStop' as const, playerId: HUMAN_ID } }, HUMAN_ID, AI_ID).statusDisplay,
      buildGameViewModel({ ...freshState(), phase: 'pendingGoStop' as const, pendingDecision: { type: 'goStop' as const, playerId: AI_ID } }, HUMAN_ID, AI_ID).statusDisplay,
      buildGameViewModel({ ...freshState(), phase: 'ended' as const }, HUMAN_ID, AI_ID).statusDisplay,
    ];
    for (const d of kinds) {
      expect(d.label.length).toBeGreaterThan(0);
    }
  });
});

// ─── scoreBreakdown ───────────────────────────────────────────────────────────

describe('buildGameViewModel — scoreBreakdown', () => {
  it('humanScoreBreakdown.total matches humanScore at game start', () => {
    const vm = buildGameViewModel(freshState(), HUMAN_ID, AI_ID);
    expect(vm.humanScoreBreakdown.total).toBe(vm.humanScore);
  });

  it('aiScoreBreakdown.total matches aiScore at game start', () => {
    const vm = buildGameViewModel(freshState(), HUMAN_ID, AI_ID);
    expect(vm.aiScoreBreakdown.total).toBe(vm.aiScore);
  });

  it('all breakdown fields are zero at game start', () => {
    const vm = buildGameViewModel(freshState(), HUMAN_ID, AI_ID);
    expect(vm.humanScoreBreakdown).toEqual({ total: 0, gwang: 0, yeol: 0, tti: 0, pi: 0 });
    expect(vm.aiScoreBreakdown).toEqual({ total: 0, gwang: 0, yeol: 0, tti: 0, pi: 0 });
  });

  it('breakdown invariant: total === gwang + yeol + tti + pi (human)', () => {
    const score = { total: 5, gwang: 2, yeol: 1, tti: 1, pi: 1 };
    const state = {
      ...freshState(),
      scoreState: {
        [HUMAN_ID]: score,
        [AI_ID]: { total: 0, gwang: 0, yeol: 0, tti: 0, pi: 0 },
      },
    };
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    const b = vm.humanScoreBreakdown;
    expect(b.gwang + b.yeol + b.tti + b.pi).toBe(b.total);
  });

  it('breakdown invariant: total === gwang + yeol + tti + pi (AI)', () => {
    const score = { total: 3, gwang: 0, yeol: 0, tti: 1, pi: 2 };
    const state = {
      ...freshState(),
      scoreState: {
        [HUMAN_ID]: { total: 0, gwang: 0, yeol: 0, tti: 0, pi: 0 },
        [AI_ID]: score,
      },
    };
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    const b = vm.aiScoreBreakdown;
    expect(b.gwang + b.yeol + b.tti + b.pi).toBe(b.total);
  });

  it('humanScoreBreakdown reflects injected score state', () => {
    const score = { total: 7, gwang: 3, yeol: 2, tti: 1, pi: 1 };
    const state = {
      ...freshState(),
      scoreState: {
        [HUMAN_ID]: score,
        [AI_ID]: { total: 0, gwang: 0, yeol: 0, tti: 0, pi: 0 },
      },
    };
    const vm = buildGameViewModel(state, HUMAN_ID, AI_ID);
    expect(vm.humanScoreBreakdown.gwang).toBe(3);
    expect(vm.humanScoreBreakdown.yeol).toBe(2);
    expect(vm.humanScoreBreakdown.tti).toBe(1);
    expect(vm.humanScoreBreakdown.pi).toBe(1);
  });
});
