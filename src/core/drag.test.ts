import { describe, expect, it } from 'vitest';
import { chooseTarget, pickTarget, toggleSelection } from './drag';

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

describe('tap, then tap', () => {
  const setup = (accept: boolean) => {
    const source = document.createElement('div');
    const target = document.createElement('div');
    document.body.append(source, target);
    const calls: string[] = [];
    const options = {
      targets: () => [target],
      onDrop: () => {
        calls.push('drop');
        return accept;
      },
      onReject: () => calls.push('reject'),
    };
    return { source, target, calls, options };
  };

  it('selects a thing, marks the places, and puts it down on the tapped place', () => {
    const { source, target, calls, options } = setup(true);
    toggleSelection(source, options);
    expect(source.classList.contains('selected')).toBe(true);
    expect(target.classList.contains('ready')).toBe(true);
    expect(chooseTarget(target)).toBe(true);
    expect(calls).toEqual(['drop']);
    expect(source.classList.contains('selected')).toBe(false);
    expect(target.classList.contains('ready')).toBe(false);
  });

  it('reports a wrong place as a rejection and clears the selection', () => {
    const { source, target, calls, options } = setup(false);
    toggleSelection(source, options);
    chooseTarget(target);
    expect(calls).toEqual(['drop', 'reject']);
    expect(chooseTarget(target)).toBe(false);
  });

  it('unselects when the same thing is tapped again, and does nothing without a selection', () => {
    const { source, target, calls, options } = setup(true);
    toggleSelection(source, options);
    toggleSelection(source, options);
    expect(source.classList.contains('selected')).toBe(false);
    expect(chooseTarget(target)).toBe(false);
    expect(calls).toEqual([]);
  });

  it('ignores a selection whose thing has left the screen', () => {
    const { source, target, calls, options } = setup(true);
    toggleSelection(source, options);
    source.remove();
    expect(chooseTarget(target)).toBe(false);
    expect(calls).toEqual([]);
  });
});
