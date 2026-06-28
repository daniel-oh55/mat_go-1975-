import { Preferences } from '@capacitor/preferences';
import type { StorageService } from '../../application/storage/StorageService.js';

/**
 * StorageService implementation backed by Capacitor Preferences.
 *
 * For production Android/iOS builds.
 * - Android: SharedPreferences (process-private, survives force-quit)
 * - iOS: UserDefaults (same guarantees)
 *
 * Unlike window.localStorage, Preferences works correctly inside the Capacitor
 * WebView context and is accessible from the native layer.
 *
 * Do not construct this in a browser/Vite dev environment —
 * use BrowserLocalStorageStorageService there.
 * Use InMemoryStorageService in tests.
 */
export class CapacitorStorageService implements StorageService {
  async read(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  }

  async write(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  }

  async delete(key: string): Promise<void> {
    await Preferences.remove({ key });
  }
}
