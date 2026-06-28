interface GoStopPanelProps {
  humanScore: number;
  onGo: () => void;
  onStop: () => void;
}

export function GoStopPanel({ humanScore, onGo, onStop }: GoStopPanelProps) {
  return (
    <div style={{
      padding: 14,
      marginBottom: 10,
      background: '#fffbe6',
      border: '2px solid #e8a000',
      borderRadius: 8,
    }}>
      <div style={{ fontWeight: 'bold', fontSize: 15, marginBottom: 4 }}>
        {humanScore}점 달성 — 고 또는 스톱을 선택하세요
      </div>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 12, lineHeight: '1.5' }}>
        <span style={{ display: 'block' }}>고: 계속 플레이해서 더 많은 점수를 노립니다.</span>
        <span style={{ display: 'block' }}>스톱: 지금 점수로 승리를 선언합니다.</span>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={onGo}
          aria-label="고 — 계속 플레이"
          style={{
            padding: '8px 20px',
            background: '#2a7',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 14,
            minHeight: 44,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <span>고</span>
          <span style={{ fontSize: 11, fontWeight: 'normal', opacity: 0.85 }}>계속 플레이</span>
        </button>
        <button
          onClick={onStop}
          aria-label="스톱 — 승리 선언"
          style={{
            padding: '8px 20px',
            background: '#c33',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 14,
            minHeight: 44,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <span>스톱</span>
          <span style={{ fontSize: 11, fontWeight: 'normal', opacity: 0.85 }}>승리 선언</span>
        </button>
      </div>
    </div>
  );
}
