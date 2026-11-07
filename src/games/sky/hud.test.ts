import { describe, expect, it } from 'vitest';
import { formatClock } from './hud';

describe('formatClock', () => {
  it('formats minutes and seconds', () => {
    expect(formatClock(300)).toBe('5:00');
    expect(formatClock(61)).toBe('1:01');
    expect(formatClock(59.2)).toBe('1:00');
  });

  it('never goes below zero', () => {
    expect(formatClock(-3)).toBe('0:00');
  });
});
