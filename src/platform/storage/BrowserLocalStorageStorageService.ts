import type { StorageService } from '../../application/storage/StorageService.js';

/**
 * Minimal slice of the Web Storage API used by this adapter.
 * Allows a test double to be injected without requiring a DOM environment.
 */
interface RawStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * StorageService implementation that wraps window.localStorage.
 *
 * No Capacitor dependency. Works in any browser and in the Vite dev server.
 *
 * Pass a custom RawStorage in tests to avoid requiring a DOM environment:
 *   new BrowserLocalStorageStorageService(fakeStorage)
 *
 * In production, construct without arguments and it defaults to window.localStorage:
 *   new BrowserLocalStorageStorageService()
 */
export class BrowserLocalStorageStorageService implements StorageService {
  private readonly storage: RawStorage;

  constructor(storage: RawStorage = window.localStorage) {
    this.storage = storage;
  }

  read(key: string): Promise<string | null> {
    return Promise.resolve(this.storage.getItem(key));
  }

  write(key: string, value: string): Promise<void> {
    this.storage.setItem(key, value);
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.storage.removeItem(key);
    return Promise.resolve();
  }
}
