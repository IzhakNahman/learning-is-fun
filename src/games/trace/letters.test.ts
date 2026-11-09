import { describe, expect, it } from 'vitest';
import { packs } from '../../content';
import { resolveLetter } from './letters';
import { englishTrace } from './shapes.en';
import { hebrewTrace } from './shapes.he';

describe('resolveLetter', () => {
  it('finds a pack letter for every Hebrew and English shape', () => {
    for (const key of Object.keys(hebrewTrace.shapes)) {
      expect(resolveLetter(packs.he, key), key).not.toBeNull();
    }
    for (const key of Object.keys(englishTrace.shapes)) {
      expect(resolveLetter(packs.en, key), key).not.toBeNull();
    }
  });

  it('uses the dotted ב, כ and פ', () => {
    expect(resolveLetter(packs.he, 'ב')?.letterKey).toBe('בּ');
    expect(resolveLetter(packs.he, 'כ')?.letterKey).toBe('כּ');
    expect(resolveLetter(packs.he, 'פ')?.letterKey).toBe('פּ');
  });

  it('treats ם, ן, ך, ף and ץ as final letters of their base letter', () => {
    expect(resolveLetter(packs.he, 'ם')).toEqual({ letterKey: 'מ', isFinal: true });
    expect(resolveLetter(packs.he, 'ן')).toEqual({ letterKey: 'נ', isFinal: true });
    expect(resolveLetter(packs.he, 'ך')).toEqual({ letterKey: 'כ', isFinal: true });
  });

  it('maps English capitals to lowercase keys', () => {
    expect(resolveLetter(packs.en, 'B')).toEqual({ letterKey: 'b', isFinal: false });
  });

  it('returns null for an unknown shape', () => {
    expect(resolveLetter(packs.he, 'Z')).toBeNull();
  });
});
