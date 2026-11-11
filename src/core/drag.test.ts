import { describe, expect, it } from 'vitest';
import { pickTarget } from './drag';

const box = (left: number, top: number, right: number, bottom: number) => ({
  left,
  top,
  right,
  bottom,
});

describe('pickTarget', () => {
  const boxes = [box(0, 0, 100, 100), box(200, 0, 300, 100)];

  it('finds the box the point is in', () => {
    expect(pickTarget({ x: 50, y: 50 }, boxes)).toBe(0);
    expect(pickTarget({ x: 250, y: 50 }, boxes)).toBe(1);
  });

  it('returns -1 when the point is in none', () => {
    expect(pickTarget({ x: 150, y: 50 }, boxes)).toBe(-1);
  });

  it('forgives a drop just outside a box when there is slack', () => {
    expect(pickTarget({ x: 110, y: 50 }, boxes)).toBe(-1);
    expect(pickTarget({ x: 110, y: 50 }, boxes, 14)).toBe(0);
  });

  it('prefers the nearest centre when boxes overlap', () => {
    const overlapping = [box(0, 0, 100, 100), box(60, 0, 160, 100)];
    expect(pickTarget({ x: 70, y: 50 }, overlapping)).toBe(0);
    expect(pickTarget({ x: 90, y: 50 }, overlapping)).toBe(1);
  });
});
