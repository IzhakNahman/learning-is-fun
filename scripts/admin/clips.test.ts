// @vitest-environment node
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { clipFilePath, clipIdFromFileName, isKnownClipId, listClips, parseLanguage } from './clips';

const ROOT = '/repo';

describe('listClips', () => {
  it('lists the Hebrew clips from the language pack', () => {
    const ids = listClips('he').map((item) => item.clipId);
    expect(ids).toContain('letter-name-alef');
    expect(ids.length).toBeGreaterThan(100);
  });
});

describe('parseLanguage', () => {
  it('accepts he and en only', () => {
    expect(parseLanguage('he')).toBe('he');
    expect(parseLanguage('en')).toBe('en');
    expect(parseLanguage('fr')).toBeNull();
    expect(parseLanguage('../he')).toBeNull();
    expect(parseLanguage(undefined)).toBeNull();
  });
});

describe('isKnownClipId', () => {
  it('accepts ids from the language pack', () => {
    expect(isKnownClipId('he', 'letter-name-alef')).toBe(true);
    expect(isKnownClipId('en', 'num-01')).toBe(true);
  });

  it('rejects unknown ids, path tricks and non-strings', () => {
    for (const bad of [
      'nope',
      '../letter-name-alef',
      'letter-name-alef.mp3',
      'letter-name-alef/',
      'LETTER-NAME-ALEF',
      'manifest',
      '',
      ' letter-name-alef',
      'letter-name-alef\u0000',
      42,
      null,
    ]) {
      expect(isKnownClipId('he', bad), String(bad)).toBe(false);
    }
  });

  it('rejects ids that exist only in the other language', () => {
    const heOnly = listClips('he').find(
      (item) => !listClips('en').some((other) => other.clipId === item.clipId),
    );
    expect(heOnly).toBeDefined();
    expect(isKnownClipId('en', heOnly?.clipId)).toBe(false);
  });
});

describe('clipFilePath', () => {
  it('points inside public/audio/<language>/', () => {
    expect(clipFilePath(ROOT, 'he', 'letter-name-alef')).toBe(
      path.resolve(ROOT, 'public/audio/he/letter-name-alef.mp3'),
    );
  });

  it('returns null for anything that is not a known clip id', () => {
    expect(clipFilePath(ROOT, 'he', '../../package')).toBeNull();
    expect(clipFilePath(ROOT, 'he', 'manifest')).toBeNull();
    expect(clipFilePath(ROOT, 'he', '/etc/passwd')).toBeNull();
  });
});

describe('clipIdFromFileName', () => {
  it('reads known mp3 file names only', () => {
    expect(clipIdFromFileName('he', 'letter-name-alef.mp3')).toBe('letter-name-alef');
    expect(clipIdFromFileName('he', 'letter-name-alef.wav')).toBeNull();
    expect(clipIdFromFileName('he', 'manifest.json')).toBeNull();
    expect(clipIdFromFileName('he', 'random.mp3')).toBeNull();
  });
});
