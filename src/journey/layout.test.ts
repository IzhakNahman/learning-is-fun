import { describe, expect, it } from 'vitest';
import { buildLadder, layoutStops, roadMarkers, type RoadOrientation } from './layout';

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

  it('starts on the left in landscape, in every language', () => {
    expect(layoutStops(5, 'landscape', false)[0]!.x).toBeLessThan(0.5);
    expect(layoutStops(5, 'landscape', true)[0]!.x).toBeLessThan(0.5);
  });

  it('starts on the right in portrait for right-to-left', () => {
    expect(layoutStops(5, 'portrait', true)[0]!.x).toBeGreaterThan(0.5);
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

describe('buildLadder', () => {
  it('is empty with fewer than two points', () => {
    expect(buildLadder([], 10, 20)).toEqual({ rails: [], rungs: [] });
    expect(buildLadder([{ x: 0, y: 0 }], 10, 20)).toEqual({ rails: [], rungs: [] });
  });

  it('has two rails per piece, each halfWidth from the centre line', () => {
    const { rails } = buildLadder(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      10,
      20,
    );
    expect(rails).toEqual([
      { x1: 0, y1: -10, x2: 100, y2: -10 },
      { x1: 0, y1: 10, x2: 100, y2: 10 },
    ]);
  });

  it('puts a rung every rungSpacing, starting half a step in', () => {
    const { rungs } = buildLadder(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      10,
      20,
    );
    expect(rungs.map((rung) => rung.x1)).toEqual([10, 30, 50, 70, 90]);
    expect(rungs[0]).toEqual({ x1: 10, y1: -10, x2: 10, y2: 10 });
  });

  it('skips pieces of zero length', () => {
    const same = { x: 5, y: 5 };
    expect(buildLadder([same, same], 10, 20)).toEqual({ rails: [], rungs: [] });
  });

  it.each(ORIENTATIONS)('makes a ladder through every %s stop without NaN', (orientation) => {
    const points = layoutStops(6, orientation, false).map((point) => ({
      x: point.x * 800,
      y: point.y * 600,
    }));
    const { rails, rungs } = buildLadder(points, 30, 25);
    expect(rails).toHaveLength(10);
    expect(rungs.length).toBeGreaterThan(10);
    expect(JSON.stringify([rails, rungs])).not.toMatch(/null/);
  });
});

describe('roadMarkers', () => {
  it.each(ORIENTATIONS)('keeps the %s start and finish markers inside the scene', (orientation) => {
    const markers = roadMarkers(layoutStops(6, orientation, false), orientation);
    for (const point of [markers.start, markers.finish]) {
      expect(point.x).toBeGreaterThan(0);
      expect(point.x).toBeLessThan(1);
      expect(point.y).toBeGreaterThan(0);
      expect(point.y).toBeLessThan(1);
    }
  });

  it('puts the start below the first stop in portrait and the finish above the last', () => {
    const points = layoutStops(6, 'portrait', false);
    const markers = roadMarkers(points, 'portrait');
    expect(markers.start.y).toBeGreaterThan(points[0]!.y);
    expect(markers.finish.y).toBeLessThan(points[5]!.y);
  });

  it('puts the start before the first stop in landscape, in every language', () => {
    for (const isRtl of [false, true]) {
      const points = layoutStops(6, 'landscape', isRtl);
      expect(roadMarkers(points, 'landscape').start.x).toBeLessThan(points[0]!.x);
    }
  });
});
