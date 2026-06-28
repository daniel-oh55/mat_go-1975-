import type { Card } from '../../application/gameSession/index.js';
import { cardLabel } from './CardButton.js';

interface DisplayCardProps {
  card: Card;
}

// Read-only card chip for non-interactive contexts (e.g. captured card piles).
// Not a button — avoids misleading interactivity semantics for display-only cards.
export function DisplayCard({ card }: DisplayCardProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 7px',
        margin: '2px',
        borderRadius: 3,
        fontSize: 12,
        background: '#eee',
        color: '#555',
        border: '1px solid #ddd',
        whiteSpace: 'nowrap',
      }}
    >
      {cardLabel(card)}
    </span>
  );
}
