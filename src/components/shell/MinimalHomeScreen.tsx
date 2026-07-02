/**
 * Minimal MVP app shell — presentational only.
 *
 * Lets the player choose between Story Mode (the M7 sample story validation
 * flow) and Free Match (the standalone local AI game). No engine, storySession,
 * or gameSession import here — this component only reports the player's
 * choice upward via callbacks; it never touches game or story state itself.
 *
 * Not final visual design. See docs/21_runtime_shell_app_flow_decision.md.
 */
interface MinimalHomeScreenProps {
  readonly onStartStoryMode: () => void;
  readonly onStartFreeMatch: () => void;
}

export function MinimalHomeScreen({ onStartStoryMode, onStartFreeMatch }: MinimalHomeScreenProps) {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>맞고</h1>
      <p style={styles.subtitle}>MVP Shell</p>

      <button onClick={onStartStoryMode} style={styles.modeButton}>
        <span style={styles.modeButtonLabel}>스토리 모드</span>
        <span style={styles.modeButtonDescription}>샘플 이야기 흐름으로 맞고 한 판을 진행합니다.</span>
      </button>

      <button onClick={onStartFreeMatch} style={styles.modeButton}>
        <span style={styles.modeButtonLabel}>자유 대전</span>
        <span style={styles.modeButtonDescription}>AI와 바로 맞고 한 판을 시작합니다.</span>
      </button>

      <p style={styles.note}>현재 스토리 모드는 런타임 검증용 샘플입니다.</p>
    </div>
  );
}

// ─── Inline styles — minimal shell only, no final visual design ───────────────

const styles = {
  container: {
    maxWidth: 560,
    margin: '0 auto',
    padding: '12px 14px',
    fontFamily: 'system-ui, sans-serif',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,

  title: {
    margin: '0 0 2px',
    fontSize: 22,
    fontWeight: 'bold',
  } as React.CSSProperties,

  subtitle: {
    margin: '0 0 16px',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  } as React.CSSProperties,

  modeButton: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    width: '100%',
    padding: '14px 16px',
    marginBottom: 10,
    background: '#2255aa',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left' as const,
    minHeight: 56,
  } as React.CSSProperties,

  modeButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  } as React.CSSProperties,

  modeButtonDescription: {
    fontSize: 12,
    opacity: 0.85,
  } as React.CSSProperties,

  note: {
    marginTop: 12,
    fontSize: 12,
    color: '#888',
  } as React.CSSProperties,
} as const;
