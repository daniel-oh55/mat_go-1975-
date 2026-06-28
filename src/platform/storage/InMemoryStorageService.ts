import type { StorageService } from '../../application/storage/StorageService.js';

/**
 * Map-backed in-process StorageService.
 *
 * No browser or Capacitor dependency. Use in tests and anywhere a real
 * persistence adapter is not needed.
 */
export class InMemoryStorageService implements StorageService {
  private readonly store = new Map<string, string>();

  read(key: string): Promise<string | null> {
    return Promise.resolve(this.store.get(key) ?? null);
  }

  write(key: string, value: string): Promise<void> {
    this.store.set(key, value);
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.store.delete(key);
    return Promise.resolve();
  }
}
