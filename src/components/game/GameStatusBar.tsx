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
  const statusColor = STATUS_COLOR[statusDisplay.kind];

  return (
    <div style={{
      padding: '8px 0',
      marginBottom: 10,
      borderBottom: '1px solid #ddd',
      fontSize: 13,
    }}>
      {/* Status row: always visible, drawn first so the current turn is the most prominent line */}
      <div style={{
        marginBottom: 6,
        padding: '4px 8px',
        borderRadius: 4,
        background: `${statusColor}1a`,
        fontWeight: 'bold',
        fontSize: 14,
        color: statusColor,
      }}>
        {statusDisplay.label}
      </div>

      {/* Stat chips: totals + deck info, each in its own labelled chip for scannability */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
        <StatChip label="내 점수" value={`${humanScore}점`} />
        <StatChip label="상대 점수" value={`${aiScore}점`} />
        <StatChip label="더미" value={`${drawPileCount}장`} />
        <StatChip label="상대 패" value={`${aiHandCount}장`} />
      </div>

      {/* Secondary row: category breakdown — only shown when either player has scored */}
      {showBreakdown && (
        <div style={{ marginTop: 6, display: 'flex', gap: 16 }}>
          <ScoreBreakdown label="나" score={humanScoreBreakdown} compact />
          <ScoreBreakdown label="상대" score={aiScoreBreakdown} compact />
        </div>
      )}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: 4,
      padding: '3px 8px',
      borderRadius: 4,
      background: '#f5f5f5',
      border: '1px solid #e5e5e5',
    }}>
      <span style={{ fontSize: 11, color: '#888' }}>{label}</span>
      <strong style={{ fontSize: 13 }}>{value}</strong>
    </span>
  );
}
