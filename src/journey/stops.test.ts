import { describe, expect, it } from 'vitest';
import { packs } from '../content';
import { STOPS } from './stops';

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
});
