interface GameStatusBarProps {
  humanScore: number;
  aiScore: number;
  drawPileCount: number;
  aiHandCount: number;
  isHumanTurn: boolean;
}

export function GameStatusBar({
  humanScore,
  aiScore,
  drawPileCount,
  aiHandCount,
  isHumanTurn,
}: GameStatusBarProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap' as const,
      padding: '6px 0',
      marginBottom: 10,
      borderBottom: '1px solid #ddd',
      fontSize: 13,
    }}>
      <span>나: <strong>{humanScore}</strong>점</span>
      <span>AI: <strong>{aiScore}</strong>점</span>
      <span style={{ color: '#999' }}>덱 {drawPileCount}장</span>
      <span style={{ color: '#999' }}>AI 패 {aiHandCount}장</span>
      <span style={{
        marginLeft: 'auto',
        fontWeight: 'bold',
        color: isHumanTurn ? '#2a7' : '#a72',
      }}>
        {isHumanTurn ? '▶ 내 차례' : '⌛ AI 차례'}
      </span>
    </div>
  );
}
