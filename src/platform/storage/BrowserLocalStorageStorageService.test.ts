import { describe, it, expect, beforeEach } from 'vitest';
import { BrowserLocalStorageStorageService } from './BrowserLocalStorageStorageService.js';

/** Minimal RawStorage double — no DOM required. */
class FakeStorage {
  private readonly data = new Map<string, string>();
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void { this.data.set(key, value); }
  removeItem(key: string): void { this.data.delete(key); }
}

describe('BrowserLocalStorageStorageService', () => {
  let fake: FakeStorage;
  let storage: BrowserLocalStorageStorageService;

  beforeEach(() => {
    fake = new FakeStorage();
    storage = new BrowserLocalStorageStorageService(fake);
  });

  it('returns null for a missing key', async () => {
    expect(await storage.read('missing')).toBeNull();
  });

  it('write/read roundtrip preserves the value', async () => {
    await storage.write('matgo.v1.activeGame', '{"saveVersion":1}');
    expect(await storage.read('matgo.v1.activeGame')).toBe('{"saveVersion":1}');
  });

  it('overwrites an existing value on second write', async () => {
    await storage.write('k', 'first');
    await storage.write('k', 'second');
    expect(await storage.read('k')).toBe('second');
  });

  it('delete removes the key', async () => {
    await storage.write('k', 'v');
    await storage.delete('k');
    expect(await storage.read('k')).toBeNull();
  });

  it('delete of a missing key is a no-op', async () => {
    await expect(storage.delete('no-such-key')).resolves.toBeUndefined();
  });

  it('delegates write to the underlying storage', async () => {
    await storage.write('k', 'v');
    expect(fake.getItem('k')).toBe('v');
  });

  it('delegates delete to the underlying storage', async () => {
    fake.setItem('k', 'v');
    await storage.delete('k');
    expect(fake.getItem('k')).toBeNull();
  });

  it('separate keys are independent', async () => {
    await storage.write('a', 'aval');
    await storage.write('b', 'bval');
    await storage.delete('a');
    expect(await storage.read('a')).toBeNull();
    expect(await storage.read('b')).toBe('bval');
  });
});
