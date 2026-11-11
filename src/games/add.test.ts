import { describe, expect, it } from 'vitest';
import { makeAddRound } from './add';

describe('makeAddRound', () => {
  it('makes three sums with different totals, each from two groups of at least one', () => {
    for (const level of ['easy', 'hard'] as const) {
      for (let step = 0; step < 40; step++) {
        const round = makeAddRound(level, () => (step * 0.1337) % 1);
        expect(round.sums).toHaveLength(3);
        const totals = round.sums.map((sum) => sum.total);
        expect(new Set(totals).size).toBe(3);
        for (const sum of round.sums) {
          expect(sum.first).toBeGreaterThanOrEqual(1);
          expect(sum.second).toBeGreaterThanOrEqual(1);
          expect(sum.first + sum.second).toBe(sum.total);
        }
        expect([...round.answers].sort()).toEqual([...totals].sort());
      }
    }
  });

  it('keeps totals up to 5 on the easy level and up to 10 on the hard level', () => {
    for (let step = 0; step < 40; step++) {
      const easy = makeAddRound('easy', () => (step * 0.173) % 1);
      expect(Math.max(...easy.answers)).toBeLessThanOrEqual(5);
      const hard = makeAddRound('hard', () => (step * 0.173) % 1);
      expect(Math.max(...hard.answers)).toBeLessThanOrEqual(10);
    }
  });
});
