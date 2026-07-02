import type { StoryViewModel, StorySessionStatus, MatchContext } from '../../application/storySession/index.js';

/**
 * Minimal Story UI shell — presentational only.
 *
 * Renders StoryViewModel.currentNode by its discriminated `type`. Never reads
 * a raw StoryDefinition and never evaluates an UnlockCondition — both of
 * those are Application Layer responsibilities (buildStoryViewModel /
 * advanceStory). This is not final visual design; it exists to validate the
 * M7 runtime flow with sampleStory.
 */
interface StoryNodePanelProps {
  readonly viewModel: StoryViewModel;
  readonly status: StorySessionStatus;
  readonly pendingMatchContext: MatchContext | null;
  readonly error: string | null;
  readonly onContinue: () => void;
  readonly onRequestMatch: () => void;
  readonly onSelectChoice: (choiceId: string) => void;
  readonly onRestartStory: () => void;
}

export function StoryNodePanel({
  viewModel,
  error,
  onContinue,
  onRequestMatch,
  onSelectChoice,
  onRestartStory,
}: StoryNodePanelProps) {
  const { currentNode } = viewModel;

  return (
    <div style={styles.container}>
      {error !== null && <div style={styles.errorBox}>오류: {error}</div>}

      {currentNode.type === 'dialogue' && (
        <div>
          {currentNode.dialogue.map((line, i) => (
            <p key={i} style={styles.dialogueLine}>
              <span style={styles.speaker}>{line.speakerId}</span>: {line.text}
            </p>
          ))}
          <button onClick={onContinue} style={styles.primaryButton}>
            다음
          </button>
        </div>
      )}

      {currentNode.type === 'match' && (
        <div>
          <p style={styles.infoLine}>상대: {currentNode.matchContext.npcId}</p>
          <p style={styles.infoLine}>지역: {currentNode.matchContext.regionId}</p>
          <button onClick={onRequestMatch} style={styles.primaryButton}>
            맞고 한 판 시작
          </button>
        </div>
      )}

      {currentNode.type === 'choice' && (
        <div>
          {currentNode.choices.map((choice) => (
            <button
              key={choice.choiceId}
              onClick={() => onSelectChoice(choice.choiceId)}
              style={styles.choiceButton}
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}

      {currentNode.type === 'end' && (
        <div>
          <p style={styles.infoLine}>샘플 이야기 완료</p>
          <button onClick={onRestartStory} style={styles.primaryButton}>
            샘플 이야기 다시 시작
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Inline styles — minimal shell only, no final visual design ───────────────

const styles = {
  container: {
    padding: '10px 12px',
    background: '#faf8f2',
    border: '1px solid #e0dcc8',
    borderRadius: 6,
  } as React.CSSProperties,

  dialogueLine: {
    margin: '0 0 8px',
    fontSize: 14,
    lineHeight: 1.5,
  } as React.CSSProperties,

  speaker: {
    fontWeight: 'bold',
  } as React.CSSProperties,

  infoLine: {
    margin: '0 0 8px',
    fontSize: 14,
  } as React.CSSProperties,

  primaryButton: {
    padding: '10px 20px',
    fontSize: 14,
    background: '#2255aa',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    minHeight: 40,
  } as React.CSSProperties,

  choiceButton: {
    display: 'block',
    width: '100%',
    padding: '10px 14px',
    marginBottom: 6,
    fontSize: 14,
    textAlign: 'left' as const,
    background: '#fff',
    color: '#2255aa',
    border: '1px solid #2255aa',
    borderRadius: 6,
    cursor: 'pointer',
    minHeight: 40,
  } as React.CSSProperties,

  errorBox: {
    color: '#c33',
    marginBottom: 10,
    fontSize: 12,
    padding: '4px 8px',
    background: '#fff5f5',
    borderRadius: 4,
  } as React.CSSProperties,
} as const;
