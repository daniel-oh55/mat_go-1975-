import { useState } from 'react';
import type { StorageService } from './application/storage/StorageService.js';
import { MinimalHomeScreen } from './components/shell/index.js';
import { StoryRuntimeScreen } from './components/story/index.js';
import { GameSessionScreen } from './components/game/index.js';
import { getStoryCatalog, getStoryDefinition } from './content/stories/storyRegistry.js';

interface AppProps {
  storageService: StorageService;
}

type AppMode = 'home' | 'story' | 'freeMatch';

/** Content Layer boundary: the only story available until story selection UI exists. */
function getDefaultStoryDefinition() {
  const firstStory = getStoryCatalog()[0];
  return firstStory === undefined ? null : getStoryDefinition(firstStory.storyId);
}

/**
 * App-level shell. Tracks only which mode the player has selected — never
 * GameState, StorySessionState, or a StoryDefinition. Story Mode and Free
 * Match are rendered by their existing screens unchanged; this component
 * only decides which one is mounted and offers a way back to the home screen.
 *
 * See docs/21_runtime_shell_app_flow_decision.md for the app flow decision.
 */
export function App({ storageService }: AppProps) {
  const [mode, setMode] = useState<AppMode>('home');
  const defaultStoryDefinition = getDefaultStoryDefinition();

  if (mode === 'home') {
    return (
      <MinimalHomeScreen
        onStartStoryMode={() => setMode('story')}
        onStartFreeMatch={() => setMode('freeMatch')}
      />
    );
  }

  return (
    <div>
      <div style={styles.backBar}>
        <button onClick={() => setMode('home')} style={styles.backButton}>
          ← 홈으로
        </button>
      </div>
      {mode === 'story' &&
        (defaultStoryDefinition !== null ? (
          <StoryRuntimeScreen
            key={defaultStoryDefinition.storyId}
            storageService={storageService}
            storyDefinition={defaultStoryDefinition}
          />
        ) : (
          <div style={styles.errorBox}>스토리를 불러올 수 없습니다.</div>
        ))}
      {mode === 'freeMatch' && <GameSessionScreen storageService={storageService} />}
    </div>
  );
}

const styles = {
  backBar: {
    maxWidth: 560,
    margin: '0 auto',
    padding: '8px 14px 0',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,

  backButton: {
    padding: '6px 12px',
    fontSize: 12,
    background: '#fff',
    color: '#555',
    border: '1px solid #ccc',
    borderRadius: 6,
    cursor: 'pointer',
  } as React.CSSProperties,

  errorBox: {
    maxWidth: 560,
    margin: '12px auto 0',
    padding: '10px 14px',
    fontFamily: 'system-ui, sans-serif',
    fontSize: 14,
    color: '#c33',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
} as const;
