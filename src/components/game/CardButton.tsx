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

const HIGHLIGHT_STYLES: Record<CardHighlight, React.CSSProperties> = {
  none:     { border: '1px solid #bbb',   background: '#f5f5f5', color: '#888', cursor: 'default' },
  legal:    { border: '2px solid #e8a000', background: '#fff8e0', color: '#333', cursor: 'pointer' },
  selected: { border: '2px solid #2255aa', background: '#dceeff', color: '#111', cursor: 'pointer' },
  target:   { border: '2px solid #c00',   background: '#ffe8e8', color: '#333', cursor: 'pointer' },
};

interface CardButtonProps {
  card: Card;
  highlight?: CardHighlight;
  onClick?: () => void;
}

export function CardButton({ card, highlight = 'none', onClick }: CardButtonProps) {
  const hl = HIGHLIGHT_STYLES[highlight];
  return (
    <button
      onClick={onClick}
      disabled={highlight === 'none'}
      style={{
        padding: '6px 10px',
        margin: '3px',
        borderRadius: 4,
        fontSize: 13,
        whiteSpace: 'nowrap',
        minHeight: 36,
        ...hl,
      }}
    >
      {cardLabel(card)}
    </button>
  );
}
