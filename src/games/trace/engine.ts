import type { Point, Stroke } from './shapes';

/** How far (in drawing units) the finger may be from the dot to pick it up. */
export const GRAB_RADIUS = 16;
/** How far the finger may be from the line and still move the dot along it. */
export const PATH_TOLERANCE = 13;
/** How many steps ahead of the dot the finger may reach in one move. */
export const LOOK_AHEAD = 10;
const SAMPLE_SPACING = 2;

function distance(first: Point, second: Point): number {
  return Math.hypot(first[0] - second[0], first[1] - second[1]);
}

/** Turns a stroke's corner points into evenly spaced points along the line. */
export function sampleStroke(stroke: Stroke, spacing = SAMPLE_SPACING): Point[] {
  const samples: Point[] = [];
  for (let index = 0; index < stroke.length - 1; index++) {
    const from = stroke[index];
    const to = stroke[index + 1];
    if (!from || !to) continue;
    const steps = Math.max(1, Math.round(distance(from, to) / spacing));
    for (let step = 0; step < steps; step++) {
      samples.push([
        from[0] + ((to[0] - from[0]) * step) / steps,
        from[1] + ((to[1] - from[1]) * step) / steps,
      ]);
    }
  }
  const last = stroke[stroke.length - 1];
  if (last) samples.push(last);
  return samples;
}

/** True when the finger is close enough to the dot to pick it up. */
export function isNearDot(pointer: Point, dot: Point): boolean {
  return distance(pointer, dot) < GRAB_RADIUS;
}

/**
 * Moves the dot forward along the line to the point nearest the finger.
 * The dot never goes backward, so a wobbly finger cannot undo progress.
 */
export function advanceAlong(samples: readonly Point[], current: number, pointer: Point): number {
  const here = samples[current];
  if (!here) return current;
  const last = Math.min(current + LOOK_AHEAD, samples.length - 1);
  let best = current;
  let bestDistance = distance(pointer, here);
  for (let candidate = current + 1; candidate <= last; candidate++) {
    const sample = samples[candidate];
    if (!sample) continue;
    const candidateDistance = distance(pointer, sample);
    if (candidateDistance < PATH_TOLERANCE && candidateDistance <= bestDistance) {
      best = candidate;
      bestDistance = candidateDistance;
    }
  }
  return best;
}

export function isAtEnd(samples: readonly Point[], index: number): boolean {
  return index >= samples.length - 1;
}
