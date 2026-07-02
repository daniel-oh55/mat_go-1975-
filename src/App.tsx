import type { StorageService } from './application/storage/StorageService.js';
import { StoryRuntimeScreen } from './components/story/index.js';

interface AppProps {
  storageService: StorageService;
}

/**
 * M7 runtime validation: renders the sample story runtime shell instead of
 * the game directly. This is a validation flow for the Story Runtime
 * Architecture (docs/20_story_runtime_architecture.md), not production content.
 */
export function App({ storageService }: AppProps) {
  return <StoryRuntimeScreen storageService={storageService} />;
}
