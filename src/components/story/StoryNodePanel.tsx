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

// Small per-node-type state label so the player always knows what kind of
// step they're on (dialogue / match / choice / end), without inspecting a
// raw StoryDefinition — this reads only currentNode.type.
const NODE_STATE_LABEL: Record<StoryViewModel['currentNode']['type'], string> = {
  dialogue: '이야기',
  match: '맞고 대결',
  choice: '선택',
  end: '완료',
};

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
      <div style={styles.nodeStateLabel}>{NODE_STATE_LABEL[currentNode.type]}</div>

      {error !== null && <div style={styles.errorBox}>오류: {error}</div>}

      {currentNode.type === 'dialogue' && (
        <div>
          {currentNode.dialogue.map((line, i) => (
            <p key={i} style={styles.dialogueLine}>
              <span style={styles.speaker}>{line.speakerId}</span>: {line.text}
            </p>
          ))}
          <button onClick={onContinue} style={styles.primaryButton}>
            다음으로
          </button>
        </div>
      )}

      {currentNode.type === 'match' && (
        <div>
          <p style={styles.infoLine}>상대: {currentNode.matchContext.npcId}</p>
          <p style={styles.infoLine}>지역: {currentNode.matchContext.regionId}</p>
          <p style={styles.guidanceLine}>이 대결 결과에 따라 다음 이야기가 달라질 수 있습니다.</p>
          <button onClick={onRequestMatch} style={styles.primaryButton}>
            스토리 대결 시작
          </button>
        </div>
      )}

      {currentNode.type === 'choice' && (
        <div>
          <p style={styles.guidanceLine}>다음 행동을 선택하세요.</p>
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
          <p style={styles.infoLine}>샘플 이야기 흐름이 완료되었습니다.</p>
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

  nodeStateLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#a08850',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    marginBottom: 8,
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

  guidanceLine: {
    margin: '0 0 10px',
    fontSize: 12,
    color: '#888',
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
