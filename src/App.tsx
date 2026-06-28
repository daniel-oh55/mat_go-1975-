import type { StorageService } from './application/storage/StorageService.js';
import { GameSessionScreen } from './components/game/index.js';

interface AppProps {
  storageService: StorageService;
}

export function App({ storageService }: AppProps) {
  return <GameSessionScreen storageService={storageService} />;
}
