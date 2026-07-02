import { useEffect, useState } from 'react';
import {
  createStorySession,
  continueStorySession,
  requestStoryMatch,
  completeStoryMatch,
  selectStoryChoice,
  buildMatchOutcome,
  loadStoryProgress,
  saveStoryProgress,
} from '../../application/storySession/index.js';
import type { StorySessionState } from '../../application/storySession/index.js';
import type { GameViewModel } from '../../application/gameSession/index.js';
import type { StorageService } from '../../application/storage/StorageService.js';
import type { StoryDefinition } from '../../content/schemas/storySchema.js';
import { GameSessionScreen } from '../game/index.js';
import { StoryNodePanel } from './StoryNodePanel.js';

/**
 * Container for the M7 minimal Story Runtime shell.
 *
 * Owns StorySessionState for the injected `storyDefinition` and drives it
 * entirely through the Application Layer's pure state-transition helpers.
 * Never traverses StoryDefinition.nodes and never evaluates an
 * UnlockCondition itself — both stay inside storyProgression.ts /
 * storySessionState.ts. Does not discover or load story content itself —
 * the caller is responsible for selecting a StoryDefinition (see
 * docs/23_content_loader_architecture.md §8).
 *
 * StoryProgress persistence (docs/25_story_progress_persistence_plan.md) is
 * orchestrated here: on mount, a saved progress is loaded and restored if
 * valid; after every transition that reaches a stable 'story'/'completed'
 * status, the resulting progress is saved. This component only calls the
 * Application Layer's loadStoryProgress/saveStoryProgress — it does not
 * import the content registry or any concrete story file.
 */
interface StoryRuntimeScreenProps {
  readonly storageService: StorageService;
  readonly storyDefinition: StoryDefinition;
}

export function StoryRuntimeScreen({ storageService, storyDefinition }: StoryRuntimeScreenProps) {
  const [storySession, setStorySession] = useState<StorySessionState | null>(null);
  const [isRestoringStoryProgress, setIsRestoringStoryProgress] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restoreProgress() {
      setIsRestoringStoryProgress(true);

      let restored: StorySessionState | null;
      try {
        restored = await loadStoryProgress(storageService, storyDefinition);
      } catch (err) {
        console.error('[StoryRuntimeScreen] unexpected error while restoring story progress:', err);
        restored = null;
      }

      if (cancelled) return;

      setStorySession(restored ?? createStorySession(storyDefinition));
      setIsRestoringStoryProgress(false);
    }

    void restoreProgress();

    return () => {
      cancelled = true;
    };
  }, [storageService, storyDefinition]);

  // Applies a new session and persists it (saveStoryProgress itself is a
  // no-op unless status is 'story' or 'completed' — see docs/25 §5).
  function commitStorySession(nextSession: StorySessionState) {
    setStorySession(nextSession);
    void saveStoryProgress(storageService, nextSession);
  }

  function handleContinue() {
    if (storySession === null) return;
    commitStorySession(continueStorySession(storySession, storyDefinition));
  }

  // Intentionally does not call commitStorySession/saveStoryProgress:
  // 'matchRequested' is a transient status that docs/25 §5 excludes from
  // persistence entirely.
  function handleRequestMatch() {
    if (storySession === null) return;
    setStorySession(requestStoryMatch(storySession));
  }

  function handleSelectChoice(choiceId: string) {
    if (storySession === null) return;
    commitStorySession(selectStoryChoice(storySession, storyDefinition, choiceId));
  }

  // Player intent to start over — overwrites any saved progress with a fresh
  // one, per docs/25 §7 (restart is the one exception to "don't save on
  // initial/fresh session creation").
  function handleRestartStory() {
    commitStorySession(createStorySession(storyDefinition));
  }

  function handleMatchComplete(finalResult: NonNullable<GameViewModel['finalResult']>) {
    if (storySession === null) return;
    commitStorySession(completeStoryMatch(storySession, storyDefinition, buildMatchOutcome(finalResult)));
  }

  // No dedicated "cancel match request" helper exists in storySessionState.ts
  // (out of scope for this PR to add one) — this is a plain status/field
  // reset on the already-public StorySessionState shape, not a traversal of
  // StoryDefinition or an UnlockCondition evaluation.
  function handleCancelStoryMatch() {
    if (storySession === null) return;
    if (storySession.status !== 'matchRequested') return;
    commitStorySession({ ...storySession, status: 'story', pendingMatchContext: null, error: null });
  }

  if (storySession === null || isRestoringStoryProgress) {
    return (
      <div style={styles.container}>
        <div style={styles.label}>스토리 모드</div>
        <p style={styles.helperLine}>이야기 진행을 불러오는 중입니다...</p>
      </div>
    );
  }

  if (storySession.status === 'matchRequested') {
    return (
      <div style={styles.container}>
        <div style={styles.label}>스토리 모드 · 맞고 대결</div>
        <p style={styles.helperLine}>이 한 판의 결과가 이야기 진행에 반영됩니다.</p>
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
      <div style={styles.label}>스토리 모드 · 샘플 런타임</div>
      {storySession.viewModel !== null ? (
        <>
          <p style={styles.helperLine}>현재는 런타임 검증용 샘플 이야기입니다.</p>
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
        </>
      ) : (
        <div style={styles.errorBox}>
          <p>스토리 상태 오류: {storySession.error ?? '알 수 없는 오류'} — 진행할 수 없는 상태입니다.</p>
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
    marginBottom: 4,
  } as React.CSSProperties,

  helperLine: {
    margin: '0 0 10px',
    fontSize: 12,
    color: '#888',
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
