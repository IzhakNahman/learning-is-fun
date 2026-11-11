import { describe, expect, it } from 'vitest';
import { isInView, scrollEdges, scrollTargetFor } from './roadScroll';

describe('scrollTargetFor', () => {
  it('centres the point in the view', () => {
    expect(scrollTargetFor(1000, 400, 3000)).toBe(800);
  });

  it('never scrolls before the start or past the end', () => {
    expect(scrollTargetFor(50, 400, 3000)).toBe(0);
    expect(scrollTargetFor(2950, 400, 3000)).toBe(2600);
  });

  it('does not scroll when everything fits', () => {
    expect(scrollTargetFor(300, 1000, 800)).toBe(0);
  });
});

describe('scrollEdges', () => {
  it('knows which ends have more road', () => {
    expect(scrollEdges(0, 400, 1000)).toEqual({ before: false, after: true });
    expect(scrollEdges(300, 400, 1000)).toEqual({ before: true, after: true });
    expect(scrollEdges(600, 400, 1000)).toEqual({ before: true, after: false });
  });

  it('has no edges when everything fits', () => {
    expect(scrollEdges(0, 1000, 800)).toEqual({ before: false, after: false });
  });
});

describe('isInView', () => {
  it('is true only when the whole box is in view', () => {
    expect(isInView(100, 200, 0, 400)).toBe(true);
    expect(isInView(-10, 200, 0, 400)).toBe(false);
    expect(isInView(300, 450, 0, 400)).toBe(false);
  });
});
