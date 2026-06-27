import { useReducer, useEffect, useRef } from 'react';
import {
  gameSessionReducer,
  createIdleSession,
  HUMAN_PLAYER_ID,
  AI_PLAYER_ID,
} from '../../application/gameSession/index.js';
import { MathRandomProvider } from '../../application/mathRandomProvider.js';
import type { LegalPlayAction } from '../../application/gameSession/index.js';
import type { Card } from '../../engine/types/card.js';

// ─── Card label helpers ───────────────────────────────────────────────────────

const CATEGORY_KO: Record<string, string> = {
  gwang: '광',
  yeol: '열',
  tti: '띠',
  pi: '피',
};

function cardLabel(card: Card): string {
  return `${card.month}월 ${CATEGORY_KO[card.category] ?? card.category}`;
}

// ─── Card button ──────────────────────────────────────────────────────────────

interface CardButtonProps {
  card: Card;
  isLegal?: boolean;
  onClick?: () => void;
}

function CardButton({ card, isLegal, onClick }: CardButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={!isLegal}
      style={{
        padding: '4px 8px',
        margin: '3px',
        borderRadius: '4px',
        border: isLegal ? '2px solid #e8a000' : '1px solid #bbb',
        background: isLegal ? '#fff8e0' : '#f5f5f5',
        color: isLegal ? '#333' : '#888',
        cursor: isLegal ? 'pointer' : 'default',
        fontSize: '13px',
        whiteSpace: 'nowrap',
      }}
    >
      {cardLabel(card)}
    </button>
  );
}

// ─── GameSessionScreen ────────────────────────────────────────────────────────

/**
 * Minimal game session screen (M3-PR1 shell).
 *
 * Responsibilities:
 * - Renders the current game state via the Application Layer view model.
 * - Dispatches human actions through gameSessionReducer.
 * - Auto-advances AI turns via useEffect.
 *
 * Does NOT contain any game rules, score calculations, or engine imports
 * beyond what is exposed by the Application Layer.
 */
export function GameSessionScreen() {
  const randomProvider = useRef(new MathRandomProvider()).current;
  const [session, dispatch] = useReducer(gameSessionReducer, undefined, createIdleSession);

  // Auto-advance AI turns (and AI pendingGoStop decisions)
  useEffect(() => {
    if (session.phase === 'idle' || session.phase === 'ended') return;

    const vm = session.viewModel;
    if (vm === null) return;

    // Wait for human input in these cases
    if (session.phase === 'playing' && vm.isHumanTurn) return;
    if (session.phase === 'pendingGoStop' && vm.isPendingGoStopDecisionForHuman) return;

    const timer = setTimeout(() => {
      dispatch({ type: 'ADVANCE_AI', randomProvider });
    }, 400);
    return () => clearTimeout(timer);
  }, [session, randomProvider]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleStartGame() {
    dispatch({ type: 'START_GAME', randomProvider });
  }

  function handlePlayCard(legalAction: LegalPlayAction) {
    const action =
      legalAction.targetFieldCardId !== undefined
        ? { type: 'PLAY_CARD' as const, cardId: legalAction.cardId, targetFieldCardId: legalAction.targetFieldCardId }
        : { type: 'PLAY_CARD' as const, cardId: legalAction.cardId };
    dispatch({ type: 'SUBMIT_HUMAN_ACTION', action });
  }

  function handleChooseGo() {
    dispatch({ type: 'SUBMIT_HUMAN_ACTION', action: { type: 'CHOOSE_GO' } });
  }

  function handleChooseStop() {
    dispatch({ type: 'SUBMIT_HUMAN_ACTION', action: { type: 'CHOOSE_STOP' } });
  }

  // ── Idle screen ─────────────────────────────────────────────────────────────

  if (session.phase === 'idle') {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>맞고</h1>
        <button onClick={handleStartGame} style={styles.primaryButton}>
          새 게임 시작
        </button>
      </div>
    );
  }

  if (session.viewModel === null) return null;
  // Re-bind after null guard so TypeScript narrows the type in all closures.
  const vm = session.viewModel;

  // ── Active game screen ───────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>맞고</h1>

      {/* Score / status bar */}
      <div style={styles.statusBar}>
        <span>나: <strong>{vm.humanScore}</strong>점</span>
        <span>AI: <strong>{vm.aiScore}</strong>점</span>
        <span>덱: {vm.drawPileCount}장</span>
        <span>AI 패: {vm.aiHandCount}장</span>
        <span style={{ color: vm.isHumanTurn ? '#2a7' : '#a72', fontWeight: 'bold' }}>
          {vm.currentTurn === 'human' ? '▶ 내 차례' : '⌛ AI 차례'}
        </span>
      </div>

      {/* Field */}
      <section style={styles.section}>
        <div style={styles.sectionLabel}>바닥 ({vm.fieldCards.length}장)</div>
        <div style={styles.cardRow}>
          {vm.fieldCards.map((card) => (
            <CardButton key={card.id} card={card} />
          ))}
        </div>
      </section>

      {/* Go/Stop decision prompt */}
      {session.phase === 'pendingGoStop' && vm.isPendingGoStopDecisionForHuman && (
        <div style={styles.goStopPanel}>
          <strong>고/스톱 선택 ({vm.humanScore}점 달성)</strong>
          <div style={{ marginTop: 10, display: 'flex', gap: 12 }}>
            <button onClick={handleChooseGo} style={styles.goButton}>고 (계속)</button>
            <button onClick={handleChooseStop} style={styles.stopButton}>스톱 (종료)</button>
          </div>
        </div>
      )}

      {/* Human hand */}
      <section style={styles.section}>
        <div style={styles.sectionLabel}>내 패 ({vm.humanHand.length}장)</div>
        <div style={styles.cardRow}>
          {vm.humanHand.map((card) => {
            const legalAction = vm.legalPlayActions.find((a) => a.cardId === card.id);
            const isLegal = vm.isHumanTurn && vm.legalCardIds.has(card.id);
            // exactOptionalPropertyTypes: don't pass onClick={undefined}; omit the prop instead
            if (isLegal && legalAction !== undefined) {
              return (
                <CardButton
                  key={card.id}
                  card={card}
                  isLegal={true}
                  onClick={() => handlePlayCard(legalAction)}
                />
              );
            }
            return <CardButton key={card.id} card={card} />;
          })}
        </div>
      </section>

      {/* Error */}
      {session.error !== null && (
        <div style={styles.errorBox}>오류: {session.error}</div>
      )}

      {/* Game ended result */}
      {session.phase === 'ended' && vm.finalResult !== null && (
        <div style={styles.resultPanel}>
          <h2 style={{ margin: '0 0 8px' }}>게임 종료</h2>
          {vm.finalResult.winner === null ? (
            <p style={{ margin: '4px 0' }}>무승부!</p>
          ) : vm.finalResult.winner === HUMAN_PLAYER_ID ? (
            <p style={{ margin: '4px 0' }}>승리! 🎉</p>
          ) : (
            <p style={{ margin: '4px 0' }}>패배...</p>
          )}
          <p style={{ margin: '4px 0' }}>
            종료: {vm.finalResult.reason === 'stop' ? '스톱' : '패 소진'}
          </p>
          <p style={{ margin: '4px 0' }}>
            내 점수: {vm.finalResult.scores[HUMAN_PLAYER_ID]?.total ?? 0}점 /
            AI 점수: {vm.finalResult.scores[AI_PLAYER_ID]?.total ?? 0}점
          </p>
          <button onClick={handleStartGame} style={{ ...styles.primaryButton, marginTop: 12 }}>
            다시 하기
          </button>
        </div>
      )}

      {/* Captured cards (collapsible) */}
      <details style={{ marginTop: 12 }}>
        <summary style={{ cursor: 'pointer', color: '#555' }}>획득 카드 보기</summary>
        <div style={{ marginTop: 8 }}>
          <div style={styles.sectionLabel}>내 획득 ({vm.humanCaptured.length}장)</div>
          <div style={styles.cardRow}>
            {vm.humanCaptured.map((card) => (
              <CardButton key={card.id} card={card} />
            ))}
          </div>
          <div style={{ ...styles.sectionLabel, marginTop: 8 }}>AI 획득 ({vm.aiCaptured.length}장)</div>
          <div style={styles.cardRow}>
            {vm.aiCaptured.map((card) => (
              <CardButton key={card.id} card={card} />
            ))}
          </div>
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
    padding: 16,
    fontFamily: 'system-ui, sans-serif',
  } as React.CSSProperties,
  title: {
    margin: '0 0 16px',
    fontSize: 24,
  } as React.CSSProperties,
  statusBar: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap' as const,
    marginBottom: 12,
    fontSize: 14,
  } as React.CSSProperties,
  section: {
    marginBottom: 12,
  } as React.CSSProperties,
  sectionLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
    fontSize: 13,
    color: '#444',
  } as React.CSSProperties,
  cardRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  goStopPanel: {
    padding: 12,
    marginBottom: 12,
    background: '#fffbe6',
    border: '2px solid #e8a000',
    borderRadius: 8,
  } as React.CSSProperties,
  goButton: {
    padding: '8px 20px',
    background: '#2a7',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
  } as React.CSSProperties,
  stopButton: {
    padding: '8px 20px',
    background: '#c33',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
  } as React.CSSProperties,
  errorBox: {
    color: '#c33',
    marginBottom: 12,
    fontSize: 13,
  } as React.CSSProperties,
  resultPanel: {
    padding: 16,
    marginBottom: 12,
    background: '#e8f5e9',
    border: '2px solid #4caf50',
    borderRadius: 8,
  } as React.CSSProperties,
  primaryButton: {
    padding: '10px 24px',
    fontSize: 16,
    background: '#2255aa',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  } as React.CSSProperties,
} as const;
