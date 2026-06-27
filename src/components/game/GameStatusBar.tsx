import type { GameStatusDisplay, GameStatusKind } from '../../application/gameSession/index.js';

const STATUS_COLOR: Record<GameStatusKind, string> = {
  humanTurn:   '#2a7',
  aiTurn:      '#a72',
  humanGoStop: '#c8860a',
  aiGoStop:    '#888',
  ended:       '#555',
};

interface GameStatusBarProps {
  humanScore: number;
  aiScore: number;
  drawPileCount: number;
  aiHandCount: number;
  statusDisplay: GameStatusDisplay;
}

export function GameStatusBar({
  humanScore,
  aiScore,
  drawPileCount,
  aiHandCount,
  statusDisplay,
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
        color: STATUS_COLOR[statusDisplay.kind],
      }}>
        {statusDisplay.label}
      </span>
    </div>
  );
}
