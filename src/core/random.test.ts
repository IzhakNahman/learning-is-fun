import { describe, expect, it } from 'vitest';
import { pickDistinct, pickRandom, shuffled } from './random';

const sequence = (values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length] ?? 0;
};

describe('random helpers', () => {
  it('picks the item the random number points at', () => {
    expect(pickRandom(['a', 'b', 'c'], () => 0)).toBe('a');
    expect(pickRandom(['a', 'b', 'c'], () => 0.99)).toBe('c');
  });

  it('picks nothing from an empty list', () => {
    expect(pickRandom([])).toBeUndefined();
  });

  it('shuffles without losing or changing items', () => {
    const original = [1, 2, 3, 4, 5];
    const result = shuffled(original, sequence([0.1, 0.9, 0.5, 0.3]));
    expect([...result].sort()).toEqual(original);
    expect(original).toEqual([1, 2, 3, 4, 5]);
  });

  it('picks distinct items', () => {
    const result = pickDistinct([1, 2, 3, 4], 3, sequence([0.2, 0.7]));
    expect(new Set(result).size).toBe(3);
  });
});
