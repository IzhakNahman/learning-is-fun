import { describe, expect, it } from 'vitest';
import { advanceAlong, isAtEnd, isNearDot, sampleStroke } from './engine';
import type { Point } from './shapes';

const DOWN: Point[] = [
  [10, 10],
  [10, 30],
];

describe('sampleStroke', () => {
  it('starts at the first point, ends at the last, and is evenly spaced', () => {
    const samples = sampleStroke(DOWN, 2);
    expect(samples[0]).toEqual([10, 10]);
    expect(samples[samples.length - 1]).toEqual([10, 30]);
    expect(samples).toHaveLength(11);
  });

  it('follows every corner of a bent stroke', () => {
    const samples = sampleStroke(
      [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
      2,
    );
    expect(samples).toContainEqual([10, 0]);
    expect(samples[samples.length - 1]).toEqual([10, 10]);
  });

  it('handles a single point without crashing', () => {
    expect(sampleStroke([[5, 5]])).toEqual([[5, 5]]);
  });
});

describe('isNearDot', () => {
  it('picks up the dot only when the finger is close', () => {
    expect(isNearDot([12, 12], [10, 10])).toBe(true);
    expect(isNearDot([60, 60], [10, 10])).toBe(false);
  });
});

describe('advanceAlong', () => {
  const samples = sampleStroke(DOWN, 2);

  it('moves forward with the finger', () => {
    expect(advanceAlong(samples, 0, [10, 18])).toBe(4);
  });

  it('never moves backward', () => {
    expect(advanceAlong(samples, 6, [10, 12])).toBe(6);
  });

  it('ignores a finger far from the line', () => {
    expect(advanceAlong(samples, 0, [80, 20])).toBe(0);
  });

  it('cannot jump past the look-ahead limit', () => {
    const long = sampleStroke(
      [
        [10, 10],
        [10, 60],
      ],
      2,
    );
    expect(advanceAlong(long, 0, [10, 60])).toBe(0);
  });

  it('reports the end of a stroke', () => {
    expect(isAtEnd(samples, 4)).toBe(false);
    expect(isAtEnd(samples, samples.length - 1)).toBe(true);
  });
});
