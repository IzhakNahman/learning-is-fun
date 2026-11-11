import { describe, expect, it } from 'vitest';
import { makeCountRound } from './count';

const fixed = (value: number) => () => value;

describe('makeCountRound', () => {
  it('counts 1-5 objects on the easy level and offers three different numbers', () => {
    for (const value of [0, 0.3, 0.6, 0.99]) {
      const round = makeCountRound('easy', fixed(value));
      expect(round.count).toBeGreaterThanOrEqual(1);
      expect(round.count).toBeLessThanOrEqual(5);
      expect(round.choices).toHaveLength(3);
      expect(new Set(round.choices).size).toBe(3);
      expect(round.choices).toContain(round.count);
    }
  });

  it('goes up to 10 objects on the hard level', () => {
    const round = makeCountRound('hard', fixed(0.99));
    expect(round.count).toBe(10);
    expect(round.choices).toContain(10);
  });

  it('never offers zero or a negative number', () => {
    for (let step = 0; step < 20; step++) {
      const round = makeCountRound('hard', () => (step * 0.173) % 1);
      expect(Math.min(...round.choices)).toBeGreaterThanOrEqual(1);
    }
  });
});
