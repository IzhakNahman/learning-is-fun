import { describe, expect, it } from 'vitest';
import { finishedSet, levelFor, starsLit } from './rounds';

describe('rounds', () => {
  it('starts easy and gets harder after the first set', () => {
    expect(levelFor(0)).toBe('easy');
    expect(levelFor(4)).toBe('easy');
    expect(levelFor(5)).toBe('hard');
    expect(levelFor(12)).toBe('hard');
  });

  it('knows when a set is finished', () => {
    expect(finishedSet(0)).toBe(false);
    expect(finishedSet(4)).toBe(false);
    expect(finishedSet(5)).toBe(true);
    expect(finishedSet(10)).toBe(true);
    expect(finishedSet(3, 3)).toBe(true);
  });

  it('lights the stars of the current set, and all of them right after a set', () => {
    expect(starsLit(0)).toBe(0);
    expect(starsLit(3)).toBe(3);
    expect(starsLit(5)).toBe(5);
    expect(starsLit(6)).toBe(1);
  });
});
