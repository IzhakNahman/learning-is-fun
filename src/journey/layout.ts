/**
 * Geometry of the home-screen ladder. Everything here is plain maths on fractions (0..1) of the
 * scene, so it can be tested without a browser.
 */

export type RoadOrientation = 'portrait' | 'landscape';

export interface Point {
  x: number;
  y: number;
}

/** Empty space kept at both ends of the road (fraction of the scene along the road). */
const END_MARGIN = 0.13;
/** How far stops swing away from the centre line (fraction of the scene across the road). */
const SWING: Record<RoadOrientation, number> = { portrait: 0.2, landscape: 0.235 };
/** How far the start and finish markers sit beyond the first and last stop. */
const MARKER_DISTANCE = 0.075;
const MARKER_EDGE_LIMIT = 0.03;

/**
 * Where each stop sits. The road starts at the bottom (portrait) or on the left (landscape, in
 * every language: a road is not text) and zig-zags to the end. In a right-to-left language the
 * portrait zig-zag starts on the right.
 */
export function layoutStops(count: number, orientation: RoadOrientation, isRtl: boolean): Point[] {
  return Array.from({ length: count }, (_, index) => {
    const along = positionAlongRoad(index, count);
    const across = positionAcrossRoad(index, count, orientation);
    if (orientation === 'portrait') return { x: mirrorIf(isRtl, across), y: 1 - along };
    return { x: along, y: across };
  });
}

function positionAlongRoad(index: number, count: number): number {
  if (count <= 1) return 0.5;
  return END_MARGIN + ((1 - 2 * END_MARGIN) * index) / (count - 1);
}

function positionAcrossRoad(index: number, count: number, orientation: RoadOrientation): number {
  if (count <= 1) return 0.5;
  const swing = SWING[orientation];
  return index % 2 === 0 ? 0.5 - swing : 0.5 + swing;
}

const mirrorIf = (shouldMirror: boolean, value: number): number =>
  shouldMirror ? 1 - value : value;

export interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Ladder {
  /** The two long side poles of each ladder piece. */
  rails: Line[];
  /** The steps across the poles. */
  rungs: Line[];
}

/**
 * A wooden ladder from stop to stop, in pixels: two rails `halfWidth` either side of the line
 * between the stops, and a rung every `rungSpacing` along it.
 */
export function buildLadder(
  points: readonly Point[],
  halfWidth: number,
  rungSpacing: number,
): Ladder {
  const rails: Line[] = [];
  const rungs: Line[] = [];
  for (let index = 0; index < points.length - 1; index++) {
    const start = points[index] as Point;
    const end = points[index + 1] as Point;
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    if (length === 0) continue;
    const along = { x: (end.x - start.x) / length, y: (end.y - start.y) / length };
    const side = { x: -along.y * halfWidth, y: along.x * halfWidth };
    for (const sign of [-1, 1]) {
      rails.push({
        x1: start.x + sign * side.x,
        y1: start.y + sign * side.y,
        x2: end.x + sign * side.x,
        y2: end.y + sign * side.y,
      });
    }
    for (let distance = rungSpacing / 2; distance < length; distance += rungSpacing) {
      const middle = { x: start.x + along.x * distance, y: start.y + along.y * distance };
      rungs.push({
        x1: middle.x - side.x,
        y1: middle.y - side.y,
        x2: middle.x + side.x,
        y2: middle.y + side.y,
      });
    }
  }
  return { rails, rungs };
}

export interface RoadMarkers {
  start: Point;
  finish: Point;
}

/** Where the start sign and the finish flag stand: just past each end of the road. */
export function roadMarkers(points: readonly Point[], orientation: RoadOrientation): RoadMarkers {
  const first = points[0] ?? { x: 0.5, y: 0.9 };
  const last = points[points.length - 1] ?? first;
  const second = points[1] ?? first;
  const beforeLast = points[points.length - 2] ?? last;
  const axis = orientation === 'portrait' ? 'y' : 'x';
  return {
    start: moveAlong(first, Math.sign(first[axis] - second[axis]), axis),
    finish: moveAlong(last, Math.sign(last[axis] - beforeLast[axis]), axis),
  };
}

function moveAlong(point: Point, direction: number, axis: 'x' | 'y'): Point {
  const moved = point[axis] + direction * MARKER_DISTANCE;
  const limited = Math.min(1 - MARKER_EDGE_LIMIT, Math.max(MARKER_EDGE_LIMIT, moved));
  return { ...point, [axis]: limited };
}
