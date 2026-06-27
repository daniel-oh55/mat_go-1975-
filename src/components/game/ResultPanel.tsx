interface ResultPanelProps {
  winner: string | null;
  reason: 'stop' | 'exhausted';
  humanPlayerId: string;
  humanScore: number;
  aiScore: number;
  onRestart: () => void;
}

export function ResultPanel({
  winner,
  reason,
  humanPlayerId,
  humanScore,
  aiScore,
  onRestart,
}: ResultPanelProps) {
  const outcomeText =
    winner === null
      ? '무승부'
      : winner === humanPlayerId
        ? '승리!'
        : '패배...';

  return (
    <div style={{
      padding: 16,
      marginBottom: 12,
      background: '#e8f5e9',
      border: '2px solid #4caf50',
      borderRadius: 8,
    }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>게임 종료 — {outcomeText}</h2>
      <p style={{ margin: '4px 0', fontSize: 13 }}>
        종료 사유: {reason === 'stop' ? '스톱' : '덱 소진'}
      </p>
      <p style={{ margin: '4px 0', fontSize: 13 }}>
        내 점수 <strong>{humanScore}</strong>점 · AI 점수 <strong>{aiScore}</strong>점
      </p>
      <button
        onClick={onRestart}
        style={{
          marginTop: 12,
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
    </div>
  );
}
