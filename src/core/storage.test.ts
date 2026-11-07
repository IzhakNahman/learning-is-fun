import { afterEach, describe, expect, it, vi } from 'vitest';
import { readSetting, writeSetting } from './storage';

describe('settings storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('saves and reads a value', () => {
    writeSetting('language', 'en');
    expect(readSetting('language')).toBe('en');
  });

  it('returns null for a missing value', () => {
    expect(readSetting('nothing-here')).toBeNull();
  });

  it('never throws when storage is blocked', () => {
    const blockedStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    vi.stubGlobal('localStorage', blockedStorage);
    expect(() => writeSetting('language', 'he')).not.toThrow();
    expect(readSetting('language')).toBeNull();
  });
});
