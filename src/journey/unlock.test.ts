import { describe, expect, it } from 'vitest';
import type { GameId } from '../content';
import { STOPS } from './stops';
import { openPolicy, sequentialPolicy } from './unlock';

describe('openPolicy', () => {
  it('opens every stop', () => {
    STOPS.forEach((_, index) => expect(openPolicy(index, STOPS)).toBe(true));
  });
});

describe('sequentialPolicy', () => {
  it('opens only the first stop when nothing is completed', () => {
    const policy = sequentialPolicy(new Set<GameId>());
    expect(STOPS.map((_, index) => policy(index, STOPS))).toEqual([
      true,
      false,
      false,
      false,
      false,
    ]);
  });

  it('opens the next stop after the previous game is completed', () => {
    const first = STOPS[0]!.game;
    const policy = sequentialPolicy(new Set<GameId>([first]));
    expect(policy(1, STOPS)).toBe(true);
    expect(policy(2, STOPS)).toBe(false);
  });

  it('keeps a stop closed when its index is out of range', () => {
    expect(sequentialPolicy(new Set<GameId>())(99, STOPS)).toBe(false);
  });
});
