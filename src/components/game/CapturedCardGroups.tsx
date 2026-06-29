import type { Card } from '../../application/gameSession/index.js';
import { groupCapturedCards } from '../../application/gameSession/capturedCardGroups.js';
import { DisplayCard } from './DisplayCard.js';

interface CapturedCardGroupsProps {
  label: string;
  cards: ReadonlyArray<Card>;
}

// Displays captured cards split into their four scoring groups (광/열/띠/피).
// Groups with zero cards are omitted. Empty capture pile shows a placeholder.
export function CapturedCardGroups({ label, cards }: CapturedCardGroupsProps) {
  const groups = groupCapturedCards(cards);

  return (
    <section style={{ marginBottom: 10 }}>
      <div style={{
        fontWeight: 'bold',
        marginBottom: 6,
        fontSize: 12,
        color: '#555',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.04em',
      }}>
        {label} <span style={{ color: '#888', fontWeight: 'normal' }}>({cards.length}장)</span>
      </div>
      {groups.length === 0 ? (
        <span style={{ fontSize: 12, color: '#aaa' }}>아직 없음</span>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {groups.map((group) => (
            <div key={group.category}>
              <div style={{
                fontSize: 11,
                fontWeight: 'bold',
                color: '#888',
                marginBottom: 2,
              }}>
                {group.label} <span style={{ fontWeight: 'normal' }}>({group.cards.length}장)</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const }}>
                {group.cards.map((card) => (
                  <DisplayCard key={card.id} card={card} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
