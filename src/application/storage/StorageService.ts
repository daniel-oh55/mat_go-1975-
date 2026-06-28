/**
 * Platform Layer storage contract.
 *
 * Defined in the Application Layer (dependency inversion) so the Application Layer
 * can be tested with InMemoryStorageService without a browser or Capacitor environment.
 *
 * Implementations live in src/platform/storage/:
 *   BrowserLocalStorageStorageService — wraps window.localStorage (M5-PR2)
 *   InMemoryStorageService            — Map-backed, for tests (M5-PR2)
 *   CapacitorStorageService           — production mobile (M5-PR6)
 *
 * All values are opaque strings. The Application Layer owns serialization.
 * The Platform Layer never interprets or validates the stored content.
 */
export interface StorageService {
  /** Returns the stored string, or null if the key does not exist. */
  read(key: string): Promise<string | null>;
  /** Stores a string value under the given key. Overwrites any existing value. */
  write(key: string, value: string): Promise<void>;
  /** Removes the key from storage. No-op if the key does not exist. */
  delete(key: string): Promise<void>;
}
