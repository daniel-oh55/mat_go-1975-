interface EventLogProps {
  messages: ReadonlyArray<string>;
}

export function EventLog({ messages }: EventLogProps) {
  if (messages.length === 0) return null;
  return (
    <div style={{
      padding: '5px 10px',
      marginBottom: 8,
      background: '#f0f4ff',
      borderRadius: 4,
      fontSize: 12,
      color: '#445',
      lineHeight: '1.6',
    }}>
      {messages.map((msg, i) => (
        <span key={i} style={i > 0 ? { marginLeft: 8 } : undefined}>{msg}</span>
      ))}
    </div>
  );
}
