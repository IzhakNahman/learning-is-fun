import { describe, expect, it } from 'vitest';
import { LANGUAGE_ORDER, packs } from '../content';
import { hasShapeDrawing, starPoints } from './shapeArt';

describe('shape drawings', () => {
  it.each(LANGUAGE_ORDER)('exist for every shape in the %s pack', (code) => {
    for (const shape of packs[code].shapes) expect(hasShapeDrawing(shape.id), shape.id).toBe(true);
  });

  it('draws a five-pointed star with ten corners', () => {
    expect(starPoints().split(' ')).toHaveLength(10);
  });
});
