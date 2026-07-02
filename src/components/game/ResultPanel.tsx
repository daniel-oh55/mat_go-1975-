import type { PlayerScoreBreakdown } from '../../application/gameSession/index.js';
import { ScoreBreakdown } from './ScoreBreakdown.js';

interface ResultPanelProps {
  winner: string | null;
  reason: 'stop' | 'exhausted';
  humanPlayerId: string;
  humanScoreBreakdown: PlayerScoreBreakdown;
  aiScoreBreakdown: PlayerScoreBreakdown;
  onRestart: () => void;
  /** Optional secondary action — e.g. returning to a Story Runtime shell after a match. */
  onContinue?: () => void;
  /** Label for the onContinue button. Defaults to "이야기로 돌아가기" when onContinue is set. */
  continueLabel?: string;
}

type OutcomeKey = 'win' | 'lose' | 'draw';

const OUTCOME_TEXT: Record<OutcomeKey, string> = {
  win:  '승리',
  lose: '패배',
  draw: '무승부',
};

// Border and background reflect the outcome so the result is legible at a glance.
const OUTCOME_STYLE: Record<OutcomeKey, { background: string; border: string; color: string }> = {
  win:  { background: '#e8f5e9', border: '2px solid #4caf50', color: '#2a7' },
  lose: { background: '#fdecea', border: '2px solid #e57373', color: '#c33' },
  draw: { background: '#f5f5f5', border: '2px solid #bbb',    color: '#555' },
};

const REASON_TEXT: Record<'stop' | 'exhausted', string> = {
  stop:      '스톱',
  exhausted: '덱 소진',
};

export function ResultPanel({
  winner,
  reason,
  humanPlayerId,
  humanScoreBreakdown,
  aiScoreBreakdown,
  onRestart,
  onContinue,
  continueLabel,
}: ResultPanelProps) {
  const outcomeKey: OutcomeKey =
    winner === null ? 'draw' : winner === humanPlayerId ? 'win' : 'lose';
  const { background, border, color } = OUTCOME_STYLE[outcomeKey];

  return (
    <section
      aria-label="게임 결과"
      style={{ padding: 16, marginBottom: 12, background, border, borderRadius: 8 }}
    >
      <h2 style={{ margin: '0 0 10px', fontSize: 18 }}>게임 종료</h2>

      <div style={{ marginBottom: 6, fontSize: 15, fontWeight: 'bold', color }}>
        결과: {OUTCOME_TEXT[outcomeKey]}
      </div>

      <div style={{ marginBottom: 12, fontSize: 13, color: '#555' }}>
        종료 이유: {REASON_TEXT[reason]}
      </div>

      <div style={{ marginBottom: 14 }}>
        <ScoreBreakdown label="내 점수" score={humanScoreBreakdown} />
        <ScoreBreakdown label="AI 점수" score={aiScoreBreakdown} />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={onRestart}
          style={{
            padding: '10px 24px',
            fontSize: 15,
            background: '#2255aa',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            minHeight: 44,
          }}
        >
          다시 하기
        </button>

        {onContinue !== undefined && (
          <button
            onClick={onContinue}
            style={{
              padding: '10px 24px',
              fontSize: 15,
              background: '#fff',
              color: '#2255aa',
              border: '1px solid #2255aa',
              borderRadius: 6,
              cursor: 'pointer',
              minHeight: 44,
            }}
          >
            {continueLabel ?? '이야기로 돌아가기'}
          </button>
        )}
      </div>
    </section>
  );
}
