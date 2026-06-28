import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted above all imports by Vitest's transform.
// The factory runs before CapacitorStorageService.ts is evaluated, so
// the service's `import { Preferences }` picks up these mock functions.
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

import { Preferences } from '@capacitor/preferences';
import { CapacitorStorageService } from './CapacitorStorageService.js';

// ---------------------------------------------------------------------------
// CapacitorStorageService
// ---------------------------------------------------------------------------

describe('CapacitorStorageService', () => {
  let service: CapacitorStorageService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CapacitorStorageService();
  });

  // ── read ──────────────────────────────────────────────────────────────────

  describe('read', () => {
    it('returns the stored string when key exists', async () => {
      vi.mocked(Preferences.get).mockResolvedValue({ value: 'hello' });
      expect(await service.read('myKey')).toBe('hello');
    });

    it('passes the key to Preferences.get', async () => {
      vi.mocked(Preferences.get).mockResolvedValue({ value: null });
      await service.read('someKey');
      expect(vi.mocked(Preferences.get)).toHaveBeenCalledWith({ key: 'someKey' });
    });

    it('returns null when key does not exist', async () => {
      vi.mocked(Preferences.get).mockResolvedValue({ value: null });
      expect(await service.read('missing')).toBeNull();
    });

    it('returns null (not undefined) when Preferences returns null', async () => {
      vi.mocked(Preferences.get).mockResolvedValue({ value: null });
      const result = await service.read('k');
      expect(result).toBeNull();
    });
  });

  // ── write ─────────────────────────────────────────────────────────────────

  describe('write', () => {
    it('calls Preferences.set with the correct key and value', async () => {
      vi.mocked(Preferences.set).mockResolvedValue();
      await service.write('myKey', 'myValue');
      expect(vi.mocked(Preferences.set)).toHaveBeenCalledWith({ key: 'myKey', value: 'myValue' });
    });

    it('calls Preferences.set exactly once', async () => {
      vi.mocked(Preferences.set).mockResolvedValue();
      await service.write('k', 'v');
      expect(vi.mocked(Preferences.set)).toHaveBeenCalledTimes(1);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('calls Preferences.remove with the correct key', async () => {
      vi.mocked(Preferences.remove).mockResolvedValue();
      await service.delete('myKey');
      expect(vi.mocked(Preferences.remove)).toHaveBeenCalledWith({ key: 'myKey' });
    });

    it('calls Preferences.remove exactly once', async () => {
      vi.mocked(Preferences.remove).mockResolvedValue();
      await service.delete('k');
      expect(vi.mocked(Preferences.remove)).toHaveBeenCalledTimes(1);
    });
  });

  // ── interface contract ────────────────────────────────────────────────────

  describe('StorageService contract', () => {
    it('write then read returns the written value', async () => {
      // Simulate in-memory backing via mocks
      let stored: string | null = null;
      vi.mocked(Preferences.set).mockImplementation(async ({ value }) => { stored = value; });
      vi.mocked(Preferences.get).mockImplementation(async () => ({ value: stored }));

      await service.write('k', 'abc');
      expect(await service.read('k')).toBe('abc');
    });

    it('delete then read returns null', async () => {
      let stored: string | null = 'initial';
      vi.mocked(Preferences.set).mockImplementation(async ({ value }) => { stored = value; });
      vi.mocked(Preferences.get).mockImplementation(async () => ({ value: stored }));
      vi.mocked(Preferences.remove).mockImplementation(async () => { stored = null; });

      await service.write('k', 'initial');
      await service.delete('k');
      expect(await service.read('k')).toBeNull();
    });
  });
});
