import type { PlayerScoreBreakdown } from '../../application/gameSession/index.js';

interface ScoreBreakdownProps {
  readonly label: string;
  readonly score: PlayerScoreBreakdown;
  readonly compact?: boolean;
  readonly showZeroCategories?: boolean;
}

const CATEGORIES = [
  { key: 'gwang' as const, name: '광' },
  { key: 'yeol' as const, name: '열' },
  { key: 'tti' as const, name: '띠' },
  { key: 'pi' as const, name: '피' },
] as const;

/**
 * Renders a player's score with optional category breakdown (광/열/띠/피).
 *
 * compact=true  → single-line span, suited for status bar secondary row.
 * compact=false → block with total on first line, categories inline (suited for ResultPanel).
 * showZeroCategories → include categories that are 0 (default: false).
 */
export function ScoreBreakdown({
  label,
  score,
  compact = false,
  showZeroCategories = false,
}: ScoreBreakdownProps) {
  const visible = CATEGORIES.filter(c => showZeroCategories || score[c.key] > 0);
  const parts = visible.map(c => `${c.name}${score[c.key]}`);

  if (compact) {
    if (parts.length === 0) return null;
    return (
      <span style={{ fontSize: 11, color: '#777' }}>
        {label}: {parts.join(' ')}
      </span>
    );
  }

  return (
    <div style={{ marginBottom: 4, fontSize: 13 }}>
      <span>
        {label}: <strong>{score.total}</strong>점
      </span>
      {parts.length > 0 && (
        <span style={{ marginLeft: 8, fontSize: 12, color: '#666' }}>
          ({parts.join(' · ')})
        </span>
      )}
    </div>
  );
}
