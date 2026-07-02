import { useState } from 'react';
import type { StorageService } from './application/storage/StorageService.js';
import { MinimalHomeScreen } from './components/shell/index.js';
import { StoryRuntimeScreen } from './components/story/index.js';
import { GameSessionScreen } from './components/game/index.js';

interface AppProps {
  storageService: StorageService;
}

type AppMode = 'home' | 'story' | 'freeMatch';

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
      {mode === 'story' && <StoryRuntimeScreen storageService={storageService} />}
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
} as const;
