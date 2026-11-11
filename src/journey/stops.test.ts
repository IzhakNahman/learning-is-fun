import { describe, expect, it } from 'vitest';
import { packs } from '../content';
import { STOPS, stopsFor } from './stops';

describe('STOPS', () => {
  it('lists every game exactly once', () => {
    const games = STOPS.map((stop) => stop.game);
    expect(new Set(games).size).toBe(games.length);
    expect([...games].sort()).toEqual(Object.keys(packs.he.ui.gameNames).sort());
  });

  it('gives every stop an icon and colours', () => {
    for (const stop of STOPS) {
      expect(stop.icon).not.toBe('');
      for (const colour of [stop.top, stop.bottom, stop.edge]) {
        expect(colour).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it('puts the games in order from easiest to hardest', () => {
    expect(STOPS.map((stop) => stop.game)).toEqual([
      'numbers',
      'colors',
      'shapes',
      'lookalike',
      'letters',
      'count',
      'trace',
      'mix',
      'words',
      'starts',
      'add',
      'sky',
      'niqqud',
    ]);
  });

  it('follows each language pack: Hebrew has niqqud, English does not', () => {
    expect(stopsFor(packs.he).map((stop) => stop.game)).toContain('niqqud');
    expect(stopsFor(packs.en).map((stop) => stop.game)).not.toContain('niqqud');
    expect(stopsFor(packs.en)).toHaveLength(STOPS.length - 1);
  });
});

describe('game names', () => {
  const plain = (text: string): string => text.replace(/[\u0591-\u05C7]/gu, '');

  it('calls the Hebrew games "שילוב צבעים" and "אות מתחילה"', () => {
    expect(plain(packs.he.ui.gameNames.mix)).toBe('שילוב צבעים');
    expect(plain(packs.he.ui.gameNames.starts)).toBe('אות מתחילה');
  });
});
