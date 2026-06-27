import type { GameStatusDisplay, GameStatusKind, PlayerScoreBreakdown } from '../../application/gameSession/index.js';

const STATUS_COLOR: Record<GameStatusKind, string> = {
  humanTurn:   '#2a7',
  aiTurn:      '#a72',
  humanGoStop: '#c8860a',
  aiGoStop:    '#888',
  ended:       '#555',
};

function formatBreakdown(b: PlayerScoreBreakdown): string {
  const parts: string[] = [];
  if (b.gwang > 0) parts.push(`광${b.gwang}`);
  if (b.yeol > 0) parts.push(`열${b.yeol}`);
  if (b.tti > 0) parts.push(`띠${b.tti}`);
  if (b.pi > 0) parts.push(`피${b.pi}`);
  return parts.join(' ');
}

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
  const humanDetail = formatBreakdown(humanScoreBreakdown);
  const aiDetail = formatBreakdown(aiScoreBreakdown);
  const showBreakdown = humanDetail.length > 0 || aiDetail.length > 0;

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
        <div style={{
          marginTop: 3,
          fontSize: 11,
          color: '#777',
          display: 'flex',
          gap: 16,
        }}>
          {humanDetail.length > 0 && <span>나: {humanDetail}</span>}
          {aiDetail.length > 0 && <span>AI: {aiDetail}</span>}
        </div>
      )}
    </div>
  );
}
