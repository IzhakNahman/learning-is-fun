/** Shared types and helpers for the letter-writing (tracing) game. */

/** A point in the drawing box. x grows to the right and y grows downward. */
export type Point = readonly [number, number];

/** One line the child drags along, in the order it is written. */
export type Stroke = readonly Point[];

export interface LetterShape {
  strokes: readonly Stroke[];
  /** How many strokes from the start are the family's "basic shape" (drawn in the family colour). */
  baseStrokes: number;
}

/** A group of letters that share the same basic shape or stroke type. */
export interface TraceFamily {
  id: string;
  /** Colour of the basic strokes. The additions use `ADDITION_COLOR`. */
  color: string;
  /** The group's basic shape: practised on its own, and the start of every letter in the group. */
  basicShape: LetterShape;
  /** Keys into `TraceSet.shapes`, in teaching order. */
  letters: readonly string[];
}

export interface TraceSet {
  shapes: Readonly<Record<string, LetterShape>>;
  families: readonly TraceFamily[];
}

/** The drawing area: tall enough for a long stem above (ל) and a long tail below (ק, ך, ף). */
export const DRAWING_BOX = { x: 0, y: -10, width: 100, height: 115 } as const;

/** Colour of every stroke that is added on top of the basic shape. */
export const ADDITION_COLOR = '#d4537e';

export function shape(baseStrokes: number, ...strokes: Stroke[]): LetterShape {
  return { strokes, baseStrokes };
}

/** Points on an ellipse arc. Angles are in degrees and y grows downward, so -90 is the top. */
export function arc(
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  fromDegrees: number,
  toDegrees: number,
): Point[] {
  const steps = Math.max(6, Math.round(Math.abs(toDegrees - fromDegrees) / 12));
  const points: Point[] = [];
  for (let step = 0; step <= steps; step++) {
    const radians = ((fromDegrees + ((toDegrees - fromDegrees) * step) / steps) * Math.PI) / 180;
    points.push([
      Math.round((centerX + radiusX * Math.cos(radians)) * 10) / 10,
      Math.round((centerY + radiusY * Math.sin(radians)) * 10) / 10,
    ]);
  }
  return points;
}
