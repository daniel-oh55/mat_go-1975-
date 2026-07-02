import { useReducer, useEffect, useRef, useState } from 'react';
import {
  gameSessionReducer,
  createIdleSession,
  HUMAN_PLAYER_ID,
  saveActiveGame,
  deleteActiveGame,
  loadActiveGame,
} from '../../application/gameSession/index.js';
import type { GameSessionState, GameViewModel } from '../../application/gameSession/index.js';
import type { StorageService } from '../../application/storage/StorageService.js';
import { MathRandomProvider } from '../../application/mathRandomProvider.js';
import type { LegalPlayAction } from '../../application/gameSession/index.js';
import { CardButton } from './CardButton.js';
import { CardRow } from './CardRow.js';
import { ActionHint } from './ActionHint.js';
import { GameStatusBar } from './GameStatusBar.js';
import { GoStopPanel } from './GoStopPanel.js';
import { EventLog } from './EventLog.js';
import { ResultPanel } from './ResultPanel.js';
import { CapturedCardGroups } from './CapturedCardGroups.js';

// ─── GameSessionScreen ────────────────────────────────────────────────────────

interface GameSessionScreenProps {
  storageService: StorageService;
  /**
   * 'standalone' (default): the existing title-screen game, with resume and
   * active-game persistence. 'storyMatch': embedded inside the Story Runtime
   * shell — GameSessionScreen never imports story types or sampleStory; it
   * only reports finalResult upward via onMatchComplete.
   */
  mode?: 'standalone' | 'storyMatch';
  /** storyMatch mode only: called with the engine's finalResult when the match ends. */
  onMatchComplete?: (finalResult: NonNullable<GameViewModel['finalResult']>) => void;
  /** storyMatch mode only: called from the idle screen to back out without starting a match. */
  onCancelStoryMatch?: () => void;
  enableResume?: boolean;
  enableActiveGamePersistence?: boolean;
}

/**
 * Root game screen. Owns session state and all dispatch logic.
 * Delegates all rendering to presentational sub-components.
 *
 * Responsibilities:
 * - Manages session state via gameSessionReducer.
 * - Dispatches human actions through the Application Layer.
 * - Auto-advances AI turns via useEffect.
 * - Persists active game state via saveActiveGame / deleteActiveGame after each session change
 *   (when enableActiveGamePersistence is true).
 * - Passes derived view data down to child components.
 *
 * This component has no knowledge of the Story System: it never imports
 * story types, storySession, or content. mode/onMatchComplete/onCancelStoryMatch
 * only change standalone-vs-embedded chrome and report finalResult upward.
 */
export function GameSessionScreen({
  storageService,
  mode = 'standalone',
  onMatchComplete,
  onCancelStoryMatch,
  enableResume = true,
  enableActiveGamePersistence = true,
}: GameSessionScreenProps) {
  const randomProvider = useRef(new MathRandomProvider()).current;
  const [session, dispatch] = useReducer(gameSessionReducer, undefined, createIdleSession);
  // Tracks which hand card is awaiting field-target selection (OD-2 multi-match flow)
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);

  // Resume state: null = no saved game found (or check not done), non-null = resumable session
  const [resumeSession, setResumeSession] = useState<GameSessionState | null>(null);
  const [isCheckingResume, setIsCheckingResume] = useState(true);
  // Guards handleStartGame against double-dispatch during the deleteActiveGame await window.
  const [isStartingGame, setIsStartingGame] = useState(false);

  // On mount: check for a saved active game. Never restores automatically.
  // cancelled flag prevents stale setState calls if storageService changes or component unmounts
  // before the async load resolves (guards against React StrictMode double-invoke as well).
  // Skipped entirely when enableResume is false (e.g. storyMatch mode).
  useEffect(() => {
    if (!enableResume) {
      setIsCheckingResume(false);
      return;
    }
    let cancelled = false;
    void loadActiveGame(storageService).then((saved) => {
      if (cancelled) return;
      setResumeSession(saved);
      setIsCheckingResume(false);
    });
    return () => {
      cancelled = true;
    };
  }, [storageService, enableResume]);

  // Clear target selection whenever the session changes (after any dispatch)
  useEffect(() => {
    setPendingCardId(null);
  }, [session]);

  // Save trigger: fires after every session state change.
  // playing/pendingGoStop → save; ended → delete; idle → no-op.
  // saveActiveGame and deleteActiveGame are fire-and-forget (never throw).
  // Skipped entirely when enableActiveGamePersistence is false (e.g. storyMatch
  // mode) so a story match never overwrites the standalone saved game.
  useEffect(() => {
    if (!enableActiveGamePersistence) return;
    if (session.phase === 'playing' || session.phase === 'pendingGoStop') {
      void saveActiveGame(storageService, session);
    } else if (session.phase === 'ended') {
      void deleteActiveGame(storageService);
    }
  }, [session, storageService, enableActiveGamePersistence]);

  // Auto-advance AI turns (and AI pendingGoStop decisions)
  useEffect(() => {
    if (session.phase === 'idle' || session.phase === 'ended') return;

    const vm = session.viewModel;
    if (vm === null) return;

    if (session.phase === 'playing' && vm.isHumanTurn) return;
    if (session.phase === 'pendingGoStop' && vm.isPendingGoStopDecisionForHuman) return;

    const timer = setTimeout(() => {
      dispatch({ type: 'ADVANCE_AI', randomProvider });
    }, 400);
    return () => clearTimeout(timer);
  }, [session, randomProvider]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleResumeGame() {
    if (resumeSession === null) return;
    dispatch({ type: 'RESTORE_SESSION', session: resumeSession });
    setResumeSession(null);
  }

  async function handleStartGame() {
    if (isStartingGame) return;
    setIsStartingGame(true);
    setResumeSession(null);
    setPendingCardId(null);
    // Await delete so the new game's first save (triggered by START_GAME) cannot race
    // against this delete on async storage adapters (e.g. Capacitor). Skipped when
    // persistence is disabled so a story match never deletes the standalone saved game.
    if (enableActiveGamePersistence) {
      await deleteActiveGame(storageService);
    }
    dispatch({ type: 'START_GAME', randomProvider });
    // Reset guard so the ended→playing path can call handleStartGame again on the next game.
    setIsStartingGame(false);
  }

  function handlePlayCard(legalAction: LegalPlayAction) {
    const action =
      legalAction.targetFieldCardId !== undefined
        ? { type: 'PLAY_CARD' as const, cardId: legalAction.cardId, targetFieldCardId: legalAction.targetFieldCardId }
        : { type: 'PLAY_CARD' as const, cardId: legalAction.cardId };
    dispatch({ type: 'SUBMIT_HUMAN_ACTION', action });
  }

  function handleHandCardClick(
    cardId: string,
    vm: { legalCardIds: ReadonlySet<string>; multiTargetCardIds: ReadonlySet<string>; legalPlayActions: ReadonlyArray<LegalPlayAction> },
  ) {
    if (!vm.legalCardIds.has(cardId)) return;
    if (vm.multiTargetCardIds.has(cardId)) {
      setPendingCardId((prev) => (prev === cardId ? null : cardId));
    } else {
      const action = vm.legalPlayActions.find((a) => a.cardId === cardId);
      if (action !== undefined) handlePlayCard(action);
    }
  }

  function handleFieldTargetClick(
    fieldCardId: string,
    vm: { legalPlayActions: ReadonlyArray<LegalPlayAction> },
  ) {
    if (pendingCardId === null) return;
    const action = vm.legalPlayActions.find(
      (a) => a.cardId === pendingCardId && a.targetFieldCardId === fieldCardId,
    );
    if (action !== undefined) handlePlayCard(action);
  }

  // "맞고" stays the constant game title in both modes; the mode label under
  // it is what tells the player which context they're in.
  const modeLabel = mode === 'storyMatch' ? '스토리 대결' : '자유 대전';
  const startButtonLabel = mode === 'storyMatch' ? '스토리 대결 시작' : '새 게임 시작';

  // ── Idle screen ──────────────────────────────────────────────────────────

  if (session.phase === 'idle') {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>맞고</h1>
        <div style={styles.modeLabel}>{modeLabel}</div>
        {!isCheckingResume && resumeSession !== null && (
          <button onClick={handleResumeGame} style={styles.primaryButton} disabled={isStartingGame}>
            게임 이어하기
          </button>
        )}
        <button
          onClick={handleStartGame}
          style={styles.primaryButton}
          disabled={isCheckingResume || isStartingGame}
        >
          {startButtonLabel}
        </button>
        {mode === 'storyMatch' && onCancelStoryMatch !== undefined && (
          <button onClick={onCancelStoryMatch} style={styles.cancelButton} disabled={isStartingGame}>
            대결 취소
          </button>
        )}
      </div>
    );
  }

  if (session.viewModel === null) return null;
  // Re-bind after null guard so TypeScript narrows the type in all closures.
  const vm = session.viewModel;
  const finalResult = session.phase === 'ended' ? vm.finalResult : null;

  // Field card IDs that are valid targets for the currently pending hand card
  const targetFieldCardIds: ReadonlySet<string> =
    pendingCardId !== null
      ? new Set(
          vm.legalPlayActions
            .filter((a) => a.cardId === pendingCardId && a.targetFieldCardId !== undefined)
            .map((a) => a.targetFieldCardId as string),
        )
      : new Set<string>();

  // ── Active game board ────────────────────────────────────────────────────

  return (
    <div style={styles.container}>

      {/* ── 1. Header ─────────────────────────────────────────────────── */}
      <h1 style={styles.title}>맞고</h1>
      <div style={styles.modeLabel}>{modeLabel}</div>
      <GameStatusBar
        humanScore={vm.humanScore}
        aiScore={vm.aiScore}
        drawPileCount={vm.drawPileCount}
        aiHandCount={vm.aiHandCount}
        statusDisplay={vm.statusDisplay}
        humanScoreBreakdown={vm.humanScoreBreakdown}
        aiScoreBreakdown={vm.aiScoreBreakdown}
      />
      <ActionHint
        statusKind={vm.statusDisplay.kind}
        isTargetSelectionPending={pendingCardId !== null}
      />

      {/* ── 2. AI Area ────────────────────────────────────────────────── */}
      <div style={styles.aiArea}>
        <div style={styles.areaLabel}>상대</div>
        <div style={styles.aiHandPlaceholder}>
          {Array.from({ length: vm.aiHandCount }, (_, i) => (
            <div key={i} style={styles.faceDownCard} />
          ))}
        </div>
      </div>

      {/* ── 3. Field Area ─────────────────────────────────────────────── */}
      <div style={styles.fieldArea}>
        <CardRow label="바닥패" cardCount={vm.fieldCards.length}>
          {vm.fieldCards.map((card) => {
            if (targetFieldCardIds.has(card.id)) {
              return (
                <CardButton
                  key={card.id}
                  card={card}
                  highlight="target"
                  onClick={() => handleFieldTargetClick(card.id, vm)}
                />
              );
            }
            return <CardButton key={card.id} card={card} />;
          })}
        </CardRow>
      </div>

      {/* ── 4. Action / Result Panels ─────────────────────────────────── */}
      {/* Rendered between field and hand so buttons are above the fold on small viewports. */}
      {session.phase === 'pendingGoStop' && vm.isPendingGoStopDecisionForHuman && (
        <GoStopPanel
          humanScore={vm.humanScore}
          onGo={() => dispatch({ type: 'SUBMIT_HUMAN_ACTION', action: { type: 'CHOOSE_GO' } })}
          onStop={() => dispatch({ type: 'SUBMIT_HUMAN_ACTION', action: { type: 'CHOOSE_STOP' } })}
        />
      )}

      {session.phase === 'ended' && finalResult !== null && (
        <ResultPanel
          winner={finalResult.winner}
          reason={finalResult.reason}
          humanPlayerId={HUMAN_PLAYER_ID}
          humanScoreBreakdown={vm.humanScoreBreakdown}
          aiScoreBreakdown={vm.aiScoreBreakdown}
          onRestart={handleStartGame}
          {...(mode === 'storyMatch' && onMatchComplete !== undefined
            ? { onContinue: () => onMatchComplete(finalResult), continueLabel: '이야기로 돌아가기' }
            : {})}
        />
      )}

      {/* ── 5. Human Area ─────────────────────────────────────────────── */}
      <div style={styles.humanArea}>
        {/* Target selection prompt */}
        {pendingCardId !== null && (
          <div style={styles.targetPrompt}>
            <span>바닥패를 선택하세요</span>
            <button onClick={() => setPendingCardId(null)} style={styles.cancelButton}>
              취소
            </button>
          </div>
        )}
        <CardRow label="내 패" cardCount={vm.humanHand.length}>
          {vm.humanHand.map((card) => {
            const isLegal = vm.isHumanTurn && vm.legalCardIds.has(card.id);
            const isSelected = card.id === pendingCardId;
            if (!isLegal) return <CardButton key={card.id} card={card} />;
            return (
              <CardButton
                key={card.id}
                card={card}
                highlight={isSelected ? 'selected' : 'legal'}
                onClick={() => handleHandCardClick(card.id, vm)}
              />
            );
          })}
        </CardRow>
      </div>

      {/* ── 6. Event Feedback ─────────────────────────────────────────── */}
      <EventLog messages={session.lastEventMessages} />

      {/* Error indicator */}
      {session.error !== null && (
        <div style={styles.errorBox}>오류: {session.error}</div>
      )}

      {/* Captured cards (collapsible, grouped by 광/열/띠/피) */}
      <details style={{ marginTop: 12 }}>
        <summary style={styles.capturedSummary}>획득 카드 보기</summary>
        <div style={{ marginTop: 8 }}>
          <CapturedCardGroups label="내 획득 카드" cards={vm.humanCaptured} />
          <CapturedCardGroups label="상대 획득 카드" cards={vm.aiCaptured} />
        </div>
      </details>

    </div>
  );
}

// ─── Inline styles ────────────────────────────────────────────────────────────

const styles = {
  container: {
    maxWidth: 560,
    margin: '0 auto',
    padding: '12px 14px',
    fontFamily: 'system-ui, sans-serif',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,

  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 'bold',
  } as React.CSSProperties,

  modeLabel: {
    margin: '2px 0 10px',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  } as React.CSSProperties,

  capturedSummary: {
    cursor: 'pointer',
    color: '#555',
    fontSize: 13,
    padding: '4px 0',
  } as React.CSSProperties,

  aiArea: {
    marginBottom: 10,
    padding: '8px 10px',
    background: '#f7f7f7',
    borderRadius: 6,
    border: '1px solid #e0e0e0',
  } as React.CSSProperties,

  areaLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    marginBottom: 6,
  } as React.CSSProperties,

  aiHandPlaceholder: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 3,
  } as React.CSSProperties,

  faceDownCard: {
    width: 30,
    height: 36,
    background: '#c0c8d8',
    borderRadius: 3,
    border: '1px solid #a0a8b8',
  } as React.CSSProperties,

  fieldArea: {
    marginBottom: 4,
    padding: '8px 10px',
    background: '#fffef5',
    borderRadius: 6,
    border: '1px solid #e8e0c0',
  } as React.CSSProperties,

  humanArea: {
    marginBottom: 8,
    padding: '8px 10px',
    background: '#f5faff',
    borderRadius: 6,
    border: '1px solid #c8daf0',
  } as React.CSSProperties,

  targetPrompt: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 0',
    marginBottom: 6,
    fontSize: 13,
    color: '#c00',
    fontWeight: 'bold',
  } as React.CSSProperties,

  cancelButton: {
    padding: '3px 12px',
    background: '#fff',
    color: '#c00',
    border: '1px solid #c00',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
  } as React.CSSProperties,

  errorBox: {
    color: '#c33',
    marginBottom: 10,
    fontSize: 12,
    padding: '4px 8px',
    background: '#fff5f5',
    borderRadius: 4,
  } as React.CSSProperties,

  primaryButton: {
    padding: '12px 28px',
    fontSize: 16,
    background: '#2255aa',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    minHeight: 48,
  } as React.CSSProperties,
} as const;
