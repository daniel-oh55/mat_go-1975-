import type { Card, CardId } from '../../engine/types/card.js';
import type { GameState, PendingDecision } from '../../engine/state/gameState.js';
import type { FinalResult } from '../../engine/types/result.js';
import { getLegalActions } from '../../engine/actions/legalActions.js';

/**
 * Discriminated identifier for the current game status from the player's perspective.
 *
 * 'humanTurn'   — Playing phase, human player's turn to play a card.
 * 'aiTurn'      — Playing phase, AI player's turn.
 * 'humanGoStop' — PendingGoStop phase, human player must choose Go or Stop.
 * 'aiGoStop'    — PendingGoStop phase, AI player is deciding.
 * 'ended'       — Game has ended.
 */
export type GameStatusKind =
  | 'humanTurn'
  | 'aiTurn'
  | 'humanGoStop'
  | 'aiGoStop'
  | 'ended';

/** Pre-computed status display for the current game state. */
export interface GameStatusDisplay {
  /** Semantic kind — use for styling decisions. */
  readonly kind: GameStatusKind;
  /** Korean label ready for display. */
  readonly label: string;
}

/**
 * Score contribution breakdown for one player, expressed in Application Layer terms.
 *
 * Each numeric field is the score points contributed by that category — not a card count.
 * Invariant: total === gwang + yeol + tti + pi.
 *
 * Defined here (not re-exported from the engine) so UI components import only from the
 * Application Layer boundary.
 */
export interface PlayerScoreBreakdown {
  readonly total: number;
  readonly gwang: number;
  readonly yeol: number;
  readonly tti: number;
  readonly pi: number;
}

/**
 * A legal PLAY_CARD action the human can submit.
 * Includes the target field card ID when the played card has two or more
 * same-month field cards to choose from (OD-2).
 */
export interface LegalPlayAction {
  readonly cardId: CardId;
  readonly targetFieldCardId?: CardId;
}

/**
 * A UI-friendly snapshot derived from GameState.
 *
 * Pre-computes everything the UI needs so that components never import
 * from the engine directly. Derived by buildGameViewModel() after every
 * engine action.
 */
export interface GameViewModel {
  /** Human player's hand — full Card objects (the player can see these). */
  readonly humanHand: ReadonlyArray<Card>;
  /** Number of cards in the AI's hand. UI sees count only, not the cards. */
  readonly aiHandCount: number;
  /** Cards currently on the field. */
  readonly fieldCards: ReadonlyArray<Card>;
  /** Number of cards remaining in the draw pile. */
  readonly drawPileCount: number;
  /** Human player's current total score. */
  readonly humanScore: number;
  /** AI player's current total score. */
  readonly aiScore: number;
  /** Human player's score broken down by category (광/열/띠/피). */
  readonly humanScoreBreakdown: PlayerScoreBreakdown;
  /** AI player's score broken down by category. */
  readonly aiScoreBreakdown: PlayerScoreBreakdown;
  /** Cards the human player has captured. */
  readonly humanCaptured: ReadonlyArray<Card>;
  /** Cards the AI has captured. */
  readonly aiCaptured: ReadonlyArray<Card>;
  /** Which player currently holds the turn. */
  readonly currentTurn: 'human' | 'ai';
  /** True when it is the human player's turn to act. */
  readonly isHumanTurn: boolean;
  /**
   * Card IDs the human can legally play this turn.
   * Empty when it is not the human's turn. Used to highlight selectable cards.
   */
  readonly legalCardIds: ReadonlySet<CardId>;
  /**
   * Full legal PLAY_CARD actions for the human's current turn.
   * Each entry pairs a card ID with an optional target field card ID.
   * The UI picks the first entry whose cardId matches the clicked card.
   */
  readonly legalPlayActions: ReadonlyArray<LegalPlayAction>;
  /**
   * Hand card IDs that have two or more legal field targets (OD-2).
   * When the human selects one of these cards the UI must enter
   * target-selection mode instead of submitting immediately.
   */
  readonly multiTargetCardIds: ReadonlySet<CardId>;
  /**
   * True when the game is in pendingGoStop phase and the human is the
   * deciding player. The UI should display Go/Stop choice buttons.
   */
  readonly isPendingGoStopDecisionForHuman: boolean;
  /** The pending Go/Stop decision, or null if none is active. */
  readonly pendingDecision: PendingDecision | null;
  /** Final result when the game has ended; null otherwise. */
  readonly finalResult: FinalResult | null;
  /** Engine phase, constrained to active-game phases (no 'idle'). */
  readonly phase: 'playing' | 'pendingGoStop' | 'ended';
  /**
   * Pre-computed status display for the current game state.
   * Encodes both the semantic kind and the Korean label so the UI
   * does not need to interpret phase + turn flags itself.
   */
  readonly statusDisplay: GameStatusDisplay;
}

/**
 * Derives a GameViewModel from a GameState.
 * Pure function — has no side effects and does not call the engine directly
 * except through getLegalActions (which is a pure engine query).
 */
export function buildGameViewModel(
  state: GameState,
  humanPlayerId: string,
  aiPlayerId: string,
): GameViewModel {
  const humanHand = state.playerHands[humanPlayerId] ?? [];
  const aiHandCount = (state.playerHands[aiPlayerId] ?? []).length;
  const humanCaptured = state.capturedCards[humanPlayerId] ?? [];
  const aiCaptured = state.capturedCards[aiPlayerId] ?? [];

  const humanScoreBreakdown: PlayerScoreBreakdown = toBreakdown(state.scoreState[humanPlayerId]);
  const aiScoreBreakdown: PlayerScoreBreakdown = toBreakdown(state.scoreState[aiPlayerId]);
  const humanScore = humanScoreBreakdown.total;
  const aiScore = aiScoreBreakdown.total;

  const isHumanTurn = state.currentTurn === humanPlayerId;

  const legalPlayActions: LegalPlayAction[] = [];
  if (isHumanTurn && state.phase === 'playing') {
    const legal = getLegalActions(state);
    for (const action of legal) {
      if (action.type === 'PLAY_CARD') {
        if (action.targetFieldCardId !== undefined) {
          legalPlayActions.push({ cardId: action.cardId, targetFieldCardId: action.targetFieldCardId });
        } else {
          legalPlayActions.push({ cardId: action.cardId });
        }
      }
    }
  }

  const legalCardIds = new Set<CardId>(legalPlayActions.map((a) => a.cardId));

  // Cards with ≥2 legal actions (same cardId, different targetFieldCardId) need target selection.
  const actionCountByCard = new Map<CardId, number>();
  for (const action of legalPlayActions) {
    actionCountByCard.set(action.cardId, (actionCountByCard.get(action.cardId) ?? 0) + 1);
  }
  const multiTargetCardIds = new Set<CardId>(
    [...actionCountByCard.entries()]
      .filter(([, count]) => count >= 2)
      .map(([cardId]) => cardId),
  );

  const isPendingGoStopDecisionForHuman =
    state.phase === 'pendingGoStop' &&
    state.pendingDecision !== null &&
    state.pendingDecision.playerId === humanPlayerId;

  const enginePhase = state.phase;
  const phase: 'playing' | 'pendingGoStop' | 'ended' =
    enginePhase === 'pendingGoStop'
      ? 'pendingGoStop'
      : enginePhase === 'ended'
        ? 'ended'
        : 'playing';

  const statusDisplay: GameStatusDisplay = buildStatusDisplay(phase, isHumanTurn, isPendingGoStopDecisionForHuman);

  return {
    humanHand,
    aiHandCount,
    fieldCards: state.fieldCards,
    drawPileCount: state.drawPile.length,
    humanScore,
    aiScore,
    humanScoreBreakdown,
    aiScoreBreakdown,
    humanCaptured,
    aiCaptured,
    currentTurn: isHumanTurn ? 'human' : 'ai',
    isHumanTurn,
    legalCardIds,
    legalPlayActions,
    multiTargetCardIds,
    isPendingGoStopDecisionForHuman,
    pendingDecision: state.pendingDecision,
    finalResult: state.finalResult,
    phase,
    statusDisplay,
  };
}

const ZERO_BREAKDOWN: PlayerScoreBreakdown = { total: 0, gwang: 0, yeol: 0, tti: 0, pi: 0 };

function toBreakdown(s: { total: number; gwang: number; yeol: number; tti: number; pi: number } | undefined): PlayerScoreBreakdown {
  if (s === undefined) return ZERO_BREAKDOWN;
  return { total: s.total, gwang: s.gwang, yeol: s.yeol, tti: s.tti, pi: s.pi };
}

function buildStatusDisplay(
  phase: 'playing' | 'pendingGoStop' | 'ended',
  isHumanTurn: boolean,
  isPendingGoStopDecisionForHuman: boolean,
): GameStatusDisplay {
  if (phase === 'ended') {
    return { kind: 'ended', label: '게임 종료' };
  }
  if (phase === 'pendingGoStop') {
    if (isPendingGoStopDecisionForHuman) {
      return { kind: 'humanGoStop', label: '고/스톱 선택 중' };
    }
    return { kind: 'aiGoStop', label: 'AI 고/스톱 선택 중' };
  }
  if (isHumanTurn) {
    return { kind: 'humanTurn', label: '▶ 내 차례' };
  }
  return { kind: 'aiTurn', label: '⌛ AI 차례' };
}
