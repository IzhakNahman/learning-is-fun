import { describe, expect, it } from 'vitest';
import {
  PATH_VIEW_SIZE,
  buildRiverPath,
  buildRoadPath,
  isClearOfRoad,
  layoutStops,
  placeDecor,
  sampleRoad,
  type RoadOrientation,
} from './layout';

const ORIENTATIONS: RoadOrientation[] = ['portrait', 'landscape'];

describe('layoutStops', () => {
  it.each(ORIENTATIONS)('keeps all %s points inside the scene', (orientation) => {
    for (const point of layoutStops(5, orientation, false)) {
      expect(point.x).toBeGreaterThan(0);
      expect(point.x).toBeLessThan(1);
      expect(point.y).toBeGreaterThan(0);
      expect(point.y).toBeLessThan(1);
    }
  });

  it('starts at the bottom in portrait and climbs up', () => {
    const points = layoutStops(5, 'portrait', false);
    expect(points[0]!.y).toBeGreaterThan(points[4]!.y);
  });

  it('starts on the left in landscape, and on the right for right-to-left', () => {
    expect(layoutStops(5, 'landscape', false)[0]!.x).toBeLessThan(0.5);
    expect(layoutStops(5, 'landscape', true)[0]!.x).toBeGreaterThan(0.5);
  });

  it('zig-zags across the road', () => {
    const points = layoutStops(4, 'portrait', false);
    expect(points[0]!.x).toBeLessThan(points[1]!.x);
    expect(points[1]!.x).toBeGreaterThan(points[2]!.x);
  });

  it('handles zero and one stop', () => {
    expect(layoutStops(0, 'portrait', false)).toEqual([]);
    expect(layoutStops(1, 'landscape', false)).toEqual([{ x: 0.5, y: 0.5 }]);
  });
});

describe('road path', () => {
  it('is empty without points', () => {
    expect(buildRoadPath([])).toBe('');
    expect(sampleRoad([])).toEqual([]);
    expect(buildRiverPath([], 'portrait')).toBe('');
  });

  it('starts at the first stop and has one curve per gap', () => {
    const points = layoutStops(5, 'portrait', false);
    const path = buildRoadPath(points);
    expect(path.startsWith(`M ${points[0]!.x * PATH_VIEW_SIZE}`)).toBe(true);
    expect(path.match(/C/g)).toHaveLength(4);
    expect(path).not.toMatch(/NaN/);
  });

  it('samples pass through the stops', () => {
    const points = layoutStops(3, 'landscape', false);
    const samples = sampleRoad(points);
    expect(samples[0]).toEqual(points[0]);
    expect(samples[samples.length - 1]!.x).toBeCloseTo(points[2]!.x);
  });

  it.each(ORIENTATIONS)('draws a %s river without NaN', (orientation) => {
    const river = buildRiverPath(layoutStops(5, orientation, false), orientation);
    expect(river).toMatch(/^M /);
    expect(river).not.toMatch(/NaN/);
  });
});

describe('placeDecor', () => {
  it.each(ORIENTATIONS)('is deterministic and keeps %s scenery off the road', (orientation) => {
    const points = layoutStops(5, orientation, false);
    const first = placeDecor(points, orientation);
    expect(placeDecor(points, orientation)).toEqual(first);
    expect(first.length).toBeGreaterThan(5);
    const road = sampleRoad(points);
    for (const item of first) {
      expect(isClearOfRoad(item, road, orientation)).toBe(true);
      expect(item.x).toBeGreaterThan(0);
      expect(item.x).toBeLessThan(1);
    }
  });
});
