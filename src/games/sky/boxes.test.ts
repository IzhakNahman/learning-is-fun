import { describe, expect, it } from 'vitest';
import { SKY } from './config';
import { advanceBoxes, createBox, findPunchTarget, pickBoxLetter } from './boxes';
import type { Box } from './types';

const ALL_KEYS = ['a', 'b', 'c', 'd', 'e'];

function boxAt(
  x: number,
  y: number,
  z: number,
  letterKey = 'a',
  phase: Box['phase'] = 'hovering',
): Box {
  return { ...createBox(letterKey, z, []), x, y, z, phase };
}

describe('pickBoxLetter', () => {
  it('always offers a needed letter when none is on screen', () => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const letter = pickBoxLetter(['b'], [boxAt(0, 0, 7, 'a')], ALL_KEYS);
      expect(letter).toBe('b');
    }
  });

  it('can pick a wrong letter once a needed one is on screen', () => {
    const boxes = [boxAt(0, 0, 7, 'b')];
    const picked = pickBoxLetter(['b'], boxes, ALL_KEYS, () => 0.99);
    expect(picked).not.toBe('b');
  });

  it('avoids repeating letters that are already live', () => {
    const boxes = [boxAt(0, 0, 7, 'b'), boxAt(3, 0, 7, 'c')];
    for (let attempt = 0; attempt < 50; attempt++) {
      expect(['b', 'c']).not.toContain(pickBoxLetter(['b'], boxes, ALL_KEYS, () => 0.99));
    }
  });
});

describe('findPunchTarget', () => {
  const glove = { x: 0, y: 0 };

  it('finds a box under the glove', () => {
    const box = boxAt(0.5, 0, SKY.PUNCH_PLANE_Z);
    expect(findPunchTarget([box], glove)).toBe(box);
  });

  it('ignores boxes that are too far from the glove', () => {
    expect(findPunchTarget([boxAt(3, 0, SKY.PUNCH_PLANE_Z)], glove)).toBeNull();
  });

  it('ignores boxes that are still far away or leaving', () => {
    expect(findPunchTarget([boxAt(0, 0, 25, 'a', 'approaching')], glove)).toBeNull();
    expect(findPunchTarget([boxAt(0, 0, SKY.PUNCH_PLANE_Z, 'a', 'leaving')], glove)).toBeNull();
  });

  it('prefers the nearest box', () => {
    const near = boxAt(0, 0, SKY.PUNCH_PLANE_Z);
    const far = boxAt(0.2, 0, SKY.PUNCH_PLANE_Z + 1);
    expect(findPunchTarget([far, near], glove)).toBe(near);
  });
});

describe('advanceBoxes', () => {
  it('stops an approaching box at the punch plane and lets it hover', () => {
    const box = boxAt(0, 0, SKY.PUNCH_PLANE_Z + 0.1, 'a', 'approaching');
    advanceBoxes([box], 1);
    expect(box.z).toBe(SKY.PUNCH_PLANE_Z);
    expect(box.phase).toBe('hovering');
  });

  it('lets a box leave after hovering too long, then removes it', () => {
    const box = boxAt(0, 0, SKY.PUNCH_PLANE_Z);
    advanceBoxes([box], SKY.BOX_HOVER_SECONDS + 1);
    expect(box.phase).toBe('leaving');
    expect(advanceBoxes([box], 5)).toHaveLength(0);
  });
});
