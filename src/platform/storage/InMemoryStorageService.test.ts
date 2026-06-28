import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStorageService } from './InMemoryStorageService.js';

describe('InMemoryStorageService', () => {
  let storage: InMemoryStorageService;

  beforeEach(() => {
    storage = new InMemoryStorageService();
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

  it('separate keys are independent', async () => {
    await storage.write('a', 'aval');
    await storage.write('b', 'bval');
    await storage.delete('a');
    expect(await storage.read('a')).toBeNull();
    expect(await storage.read('b')).toBe('bval');
  });

  it('each instance has its own store', async () => {
    const other = new InMemoryStorageService();
    await storage.write('k', 'v');
    expect(await other.read('k')).toBeNull();
  });
});
