/**
 * Geometry of the home-screen road. Everything here is plain maths on fractions (0..1) of the
 * scene, so it can be tested without a browser.
 */

export type RoadOrientation = 'portrait' | 'landscape';

export interface Point {
  x: number;
  y: number;
}

export type DecorKind = 'tree' | 'pine' | 'bush' | 'rock' | 'flower';

export interface DecorItem extends Point {
  kind: DecorKind;
}

/** Size of the SVG coordinate system the road and river paths are written in. */
export const PATH_VIEW_SIZE = 1000;

/** Empty space kept at both ends of the road (fraction of the scene along the road). */
const END_MARGIN = 0.13;
/** How far stops swing away from the centre line (fraction of the scene across the road). */
const SWING = 0.2;
/** Approximate width / height of the scene, used to measure distances fairly on both axes. */
const SCENE_ASPECT: Record<RoadOrientation, number> = { portrait: 0.55, landscape: 2.2 };
/** Decorations stay at least this far (in fractions of the shorter side) from the road. */
const DECOR_CLEARANCE = 0.1;
const DECOR_COUNT: Record<RoadOrientation, number> = { portrait: 16, landscape: 18 };
const SAMPLES_PER_SEGMENT = 8;
const DECOR_KINDS: readonly DecorKind[] = ['tree', 'pine', 'bush', 'rock', 'flower'];

/**
 * Where each stop sits. The road starts at the bottom (portrait) or at the reading-start side
 * (landscape: left, or right in a right-to-left language) and zig-zags to the end.
 */
export function layoutStops(count: number, orientation: RoadOrientation, isRtl: boolean): Point[] {
  return Array.from({ length: count }, (_, index) => {
    const along = positionAlongRoad(index, count);
    const across = positionAcrossRoad(index, count);
    if (orientation === 'portrait') return { x: mirrorIf(isRtl, across), y: 1 - along };
    return { x: mirrorIf(isRtl, along), y: across };
  });
}

function positionAlongRoad(index: number, count: number): number {
  if (count <= 1) return 0.5;
  return END_MARGIN + ((1 - 2 * END_MARGIN) * index) / (count - 1);
}

function positionAcrossRoad(index: number, count: number): number {
  if (count <= 1) return 0.5;
  return index % 2 === 0 ? 0.5 - SWING : 0.5 + SWING;
}

const mirrorIf = (shouldMirror: boolean, value: number): number =>
  shouldMirror ? 1 - value : value;

/** A smooth SVG path (in `PATH_VIEW_SIZE` units) through all the points, in order. */
export function buildRoadPath(points: readonly Point[]): string {
  const first = points[0];
  if (!first) return '';
  const segments = [`M ${toUnits(first.x)} ${toUnits(first.y)}`];
  for (let index = 0; index < points.length - 1; index++) {
    const [control1, control2, end] = bezierSegment(points, index);
    segments.push(
      `C ${toUnits(control1.x)} ${toUnits(control1.y)}, ${toUnits(control2.x)} ${toUnits(control2.y)}, ${toUnits(end.x)} ${toUnits(end.y)}`,
    );
  }
  return segments.join(' ');
}

/** Catmull-Rom spline converted to one cubic Bezier segment between point `index` and the next. */
function bezierSegment(points: readonly Point[], index: number): [Point, Point, Point] {
  const before = points[Math.max(index - 1, 0)] as Point;
  const start = points[index] as Point;
  const end = points[index + 1] as Point;
  const after = points[Math.min(index + 2, points.length - 1)] as Point;
  const control1 = { x: start.x + (end.x - before.x) / 6, y: start.y + (end.y - before.y) / 6 };
  const control2 = { x: end.x - (after.x - start.x) / 6, y: end.y - (after.y - start.y) / 6 };
  return [control1, control2, end];
}

const toUnits = (fraction: number): number => Math.round(fraction * PATH_VIEW_SIZE * 10) / 10;

/** Points along the road curve, used to keep decorations off the road. */
export function sampleRoad(points: readonly Point[]): Point[] {
  const first = points[0];
  if (!first) return [];
  const samples: Point[] = [first];
  for (let index = 0; index < points.length - 1; index++) {
    const [control1, control2, end] = bezierSegment(points, index);
    const start = points[index] as Point;
    for (let step = 1; step <= SAMPLES_PER_SEGMENT; step++) {
      samples.push(cubicPoint(start, control1, control2, end, step / SAMPLES_PER_SEGMENT));
    }
  }
  return samples;
}

function cubicPoint(start: Point, control1: Point, control2: Point, end: Point, t: number): Point {
  const inverse = 1 - t;
  const weights = [inverse ** 3, 3 * inverse ** 2 * t, 3 * inverse * t ** 2, t ** 3];
  const sources = [start, control1, control2, end];
  return {
    x: sources.reduce((sum, point, i) => sum + point.x * (weights[i] as number), 0),
    y: sources.reduce((sum, point, i) => sum + point.y * (weights[i] as number), 0),
  };
}

/** A gentle river crossing the scene at the middle of the road. Empty when there is no road. */
export function buildRiverPath(points: readonly Point[], orientation: RoadOrientation): string {
  if (points.length === 0) return '';
  const middle = points[Math.floor(points.length / 2)] as Point;
  const mid = toUnits(orientation === 'portrait' ? middle.y : middle.x);
  const size = PATH_VIEW_SIZE;
  const wave = 60;
  if (orientation === 'portrait') {
    return `M -50 ${mid + wave} C ${size * 0.25} ${mid - wave}, ${size * 0.6} ${mid + 2 * wave}, ${size + 50} ${mid - wave}`;
  }
  return `M ${mid + wave} -50 C ${mid - wave} ${size * 0.25}, ${mid + 2 * wave} ${size * 0.6}, ${mid - wave} ${size + 50}`;
}

/** Trees, rocks, and flowers placed deterministically, never on the road. */
export function placeDecor(points: readonly Point[], orientation: RoadOrientation): DecorItem[] {
  const road = sampleRoad(points);
  const nextRandom = createRandom(points.length * 7919 + (orientation === 'portrait' ? 1 : 2));
  const items: DecorItem[] = [];
  const wanted = DECOR_COUNT[orientation];
  for (let attempt = 0; attempt < wanted * 30 && items.length < wanted; attempt++) {
    const candidate = { x: 0.04 + nextRandom() * 0.92, y: 0.04 + nextRandom() * 0.92 };
    const kind = DECOR_KINDS[Math.floor(nextRandom() * DECOR_KINDS.length)] as DecorKind;
    if (!isClearOfRoad(candidate, road, orientation)) continue;
    items.push({ ...candidate, kind });
  }
  return items;
}

export function isClearOfRoad(
  point: Point,
  road: readonly Point[],
  orientation: RoadOrientation,
): boolean {
  return road.every(
    (roadPoint) => distanceOnScreen(point, roadPoint, orientation) >= DECOR_CLEARANCE,
  );
}

/** Distance measured as if the scene were a square whose sides are its shorter dimension. */
export function distanceOnScreen(a: Point, b: Point, orientation: RoadOrientation): number {
  const aspect = SCENE_ASPECT[orientation];
  const dx = orientation === 'portrait' ? (a.x - b.x) * aspect : a.x - b.x;
  const dy = orientation === 'portrait' ? a.y - b.y : (a.y - b.y) / aspect;
  return Math.hypot(dx, dy);
}

/** Small seeded random generator (mulberry32) so the scenery looks the same every time. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
