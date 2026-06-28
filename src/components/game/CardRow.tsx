interface CardRowProps {
  label: string;
  cardCount: number;
  children: React.ReactNode;
}

export function CardRow({ label, cardCount, children }: CardRowProps) {
  return (
    <section style={{ marginBottom: 10 }}>
      <div style={{
        fontWeight: 'bold',
        marginBottom: 4,
        fontSize: 12,
        color: '#555',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.04em',
      }}>
        {label} <span style={{ color: '#888', fontWeight: 'normal' }}>({cardCount}장)</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, overflowX: 'auto' }}>
        {children}
      </div>
    </section>
  );
}
