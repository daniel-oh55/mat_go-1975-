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
      <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>
        {humanScore}점을 달성했습니다 — 계속 진행하시겠습니까?
      </div>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 12, lineHeight: '1.5' }}>
        <span style={{ display: 'block' }}>고: 계속 플레이해서 더 많은 점수를 노립니다.</span>
        <span style={{ display: 'block' }}>스톱: 지금 점수로 게임을 종료합니다.</span>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={onGo}
          aria-label="고 — 계속 플레이"
          style={{
            flex: 1,
            padding: '10px 20px',
            background: '#2a7',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 15,
            minHeight: 48,
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
          aria-label="스톱 — 게임 종료"
          style={{
            flex: 1,
            padding: '10px 20px',
            background: '#c33',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 15,
            minHeight: 48,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <span>스톱</span>
          <span style={{ fontSize: 11, fontWeight: 'normal', opacity: 0.85 }}>게임 종료</span>
        </button>
      </div>
    </div>
  );
}
