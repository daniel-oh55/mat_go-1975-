import type { Card } from '../../application/gameSession/index.js';

export type CardHighlight = 'none' | 'legal' | 'selected' | 'target';

const CATEGORY_KO: Record<string, string> = {
  gwang: '광',
  yeol: '열',
  tti: '띠',
  pi: '피',
};

export function cardLabel(card: Card): string {
  return `${card.month}월 ${CATEGORY_KO[card.category] ?? card.category}`;
}

export function cardInteractionLabel(highlight: CardHighlight): string {
  switch (highlight) {
    case 'none':     return '선택 불가';
    case 'legal':    return '낼 수 있음';
    case 'selected': return '선택됨';
    case 'target':   return '대상 선택';
  }
}

// All states use 2px border so card size never shifts when highlight changes.
// none uses opacity:1 to override the browser's default disabled-button dimming.
const HIGHLIGHT_STYLES: Record<CardHighlight, React.CSSProperties> = {
  none:     { border: '2px solid #ddd',    background: '#f5f5f5', color: '#bbb', cursor: 'default',  opacity: 1 },
  legal:    { border: '2px solid #e8a000', background: '#fff8e0', color: '#333', cursor: 'pointer' },
  selected: { border: '2px solid #2255aa', background: '#dceeff', color: '#111', cursor: 'pointer' },
  target:   { border: '2px solid #c00',    background: '#ffe8e8', color: '#333', cursor: 'pointer' },
};

interface CardButtonProps {
  card: Card;
  highlight?: CardHighlight;
  onClick?: () => void;
}

export function CardButton({ card, highlight = 'none', onClick }: CardButtonProps) {
  const hl = HIGHLIGHT_STYLES[highlight];
  const isInteractive = highlight !== 'none';
  const interactionLabel = cardInteractionLabel(highlight);
  const badge = isInteractive ? interactionLabel : null;
  return (
    <button
      onClick={isInteractive ? onClick : undefined}
      disabled={!isInteractive}
      aria-label={`${cardLabel(card)} (${interactionLabel})`}
      aria-disabled={!isInteractive}
      aria-pressed={highlight === 'selected' ? true : undefined}
      style={{
        padding: '6px 10px',
        margin: '3px',
        borderRadius: 4,
        fontSize: 13,
        minHeight: 44,
        minWidth: 52,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        ...hl,
      }}
    >
      <span>{cardLabel(card)}</span>
      {badge !== null && (
        <span style={{ fontSize: 10, opacity: 0.75, whiteSpace: 'nowrap' }}>
          {badge}
        </span>
      )}
    </button>
  );
}
