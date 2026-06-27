import type { GameStatusDisplay, GameStatusKind, PlayerScoreBreakdown } from '../../application/gameSession/index.js';
import { ScoreBreakdown } from './ScoreBreakdown.js';

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
  humanScoreBreakdown: PlayerScoreBreakdown;
  aiScoreBreakdown: PlayerScoreBreakdown;
}

export function GameStatusBar({
  humanScore,
  aiScore,
  drawPileCount,
  aiHandCount,
  statusDisplay,
  humanScoreBreakdown,
  aiScoreBreakdown,
}: GameStatusBarProps) {
  const showBreakdown = humanScoreBreakdown.total > 0 || aiScoreBreakdown.total > 0;

  return (
    <div style={{
      padding: '6px 0',
      marginBottom: 10,
      borderBottom: '1px solid #ddd',
      fontSize: 13,
    }}>
      {/* Primary row: totals + deck info + turn indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
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

      {/* Secondary row: category breakdown — only shown when either player has scored */}
      {showBreakdown && (
        <div style={{ marginTop: 3, display: 'flex', gap: 16 }}>
          <ScoreBreakdown label="나" score={humanScoreBreakdown} compact />
          <ScoreBreakdown label="AI" score={aiScoreBreakdown} compact />
        </div>
      )}
    </div>
  );
}
