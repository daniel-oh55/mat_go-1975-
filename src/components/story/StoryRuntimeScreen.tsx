import { useState } from 'react';
import {
  createStorySession,
  continueStorySession,
  requestStoryMatch,
  completeStoryMatch,
  selectStoryChoice,
  buildMatchOutcome,
} from '../../application/storySession/index.js';
import type { GameViewModel } from '../../application/gameSession/index.js';
import type { StorageService } from '../../application/storage/StorageService.js';
import { sampleStory } from '../../content/stories/sample/sampleStory.js';
import { GameSessionScreen } from '../game/index.js';
import { StoryNodePanel } from './StoryNodePanel.js';

/**
 * Container for the M7 minimal Story Runtime shell.
 *
 * Owns StorySessionState for `sampleStory` (a validation fixture — not
 * production content) and drives it entirely through the Application Layer's
 * pure state-transition helpers. Never traverses StoryDefinition.nodes and
 * never evaluates an UnlockCondition itself — both stay inside
 * storyProgression.ts / storySessionState.ts.
 *
 * No StoryProgress persistence here — that is deferred until this runtime
 * flow is proven (see docs/20_story_runtime_architecture.md §8).
 */
interface StoryRuntimeScreenProps {
  readonly storageService: StorageService;
}

export function StoryRuntimeScreen({ storageService }: StoryRuntimeScreenProps) {
  const [storySession, setStorySession] = useState(() => createStorySession(sampleStory));

  function handleContinue() {
    setStorySession((prev) => continueStorySession(prev, sampleStory));
  }

  function handleRequestMatch() {
    setStorySession((prev) => requestStoryMatch(prev));
  }

  function handleSelectChoice(choiceId: string) {
    setStorySession((prev) => selectStoryChoice(prev, sampleStory, choiceId));
  }

  function handleRestartStory() {
    setStorySession(createStorySession(sampleStory));
  }

  function handleMatchComplete(finalResult: NonNullable<GameViewModel['finalResult']>) {
    setStorySession((prev) => completeStoryMatch(prev, sampleStory, buildMatchOutcome(finalResult)));
  }

  // No dedicated "cancel match request" helper exists in storySessionState.ts
  // (out of scope for this PR to add one) — this is a plain status/field
  // reset on the already-public StorySessionState shape, not a traversal of
  // StoryDefinition or an UnlockCondition evaluation.
  function handleCancelStoryMatch() {
    setStorySession((prev) =>
      prev.status === 'matchRequested'
        ? { ...prev, status: 'story', pendingMatchContext: null, error: null }
        : prev,
    );
  }

  if (storySession.status === 'matchRequested') {
    return (
      <div style={styles.container}>
        <div style={styles.label}>샘플 스토리 런타임 — 맞고 매치</div>
        <GameSessionScreen
          storageService={storageService}
          mode="storyMatch"
          onMatchComplete={handleMatchComplete}
          onCancelStoryMatch={handleCancelStoryMatch}
          enableResume={false}
          enableActiveGamePersistence={false}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.label}>샘플 스토리 런타임</div>
      {storySession.viewModel !== null ? (
        <StoryNodePanel
          viewModel={storySession.viewModel}
          status={storySession.status}
          pendingMatchContext={storySession.pendingMatchContext}
          error={storySession.error}
          onContinue={handleContinue}
          onRequestMatch={handleRequestMatch}
          onSelectChoice={handleSelectChoice}
          onRestartStory={handleRestartStory}
        />
      ) : (
        <div style={styles.errorBox}>
          <p>스토리 상태 오류: {storySession.error ?? '알 수 없는 오류'}</p>
          <button onClick={handleRestartStory} style={styles.primaryButton}>
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
    maxWidth: 560,
    margin: '0 auto',
    padding: '12px 14px',
    fontFamily: 'system-ui, sans-serif',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,

  label: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    marginBottom: 10,
  } as React.CSSProperties,

  errorBox: {
    color: '#c33',
    padding: '10px 12px',
    background: '#fff5f5',
    border: '1px solid #f0c0c0',
    borderRadius: 6,
  } as React.CSSProperties,

  primaryButton: {
    marginTop: 8,
    padding: '10px 20px',
    fontSize: 14,
    background: '#2255aa',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    minHeight: 40,
  } as React.CSSProperties,
} as const;
