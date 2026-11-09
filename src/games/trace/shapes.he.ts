import { shape } from './shapes';
import type { Point, Stroke, TraceSet } from './shapes';

/**
 * Hebrew letters in four families. Every letter of a family starts with the same basic shape
 * (the first `baseStrokes` strokes), then adds its own lines. Strokes go downward, or from left
 * to right; the only exception is the bottom of the family-4 basic shape.
 */

/** Family 1: a long top line, then down. */
const RESH: Stroke = [
  [15, 25],
  [75, 25],
  [75, 75],
];
/** Family 2: a short top line, then down. */
const VAV: Stroke = [
  [30, 25],
  [60, 25],
  [60, 75],
];
/** Family 3: a diagonal and a small branch above it. */
const DIAGONAL: Stroke = [
  [15, 25],
  [75, 70],
];
const BRANCH: Stroke = [
  [55, 20],
  [42, 45],
];
/** Family 4, "the opposite of ר": down, then left (like _|). */
const NUN: Stroke = [
  [75, 25],
  [75, 75],
  [15, 75],
];
/** The little curl of פ and ף: down from the top-left corner, then right. */
const CURL: Stroke = [
  [15, 25],
  [15, 46],
  [37, 46],
];

const line = (...points: Point[]): Stroke => points;

export const hebrewTrace: TraceSet = {
  shapes: {
    // Family 1
    ר: shape(1, RESH),
    ד: shape(1, RESH, line([75, 25], [87, 25])),
    ה: shape(1, RESH, line([15, 42], [15, 75])),
    ח: shape(1, RESH, line([15, 25], [15, 75])),
    ת: shape(1, RESH, line([15, 25], [15, 75]), line([6, 75], [15, 75])),
    ב: shape(1, RESH, line([15, 75], [87, 75])),
    כ: shape(1, RESH, line([15, 75], [75, 75])),
    ל: shape(1, RESH, line([15, -4], [15, 25])),
    ס: shape(1, RESH, line([15, 25], [11, 45], [20, 66], [40, 75], [75, 75])),
    ק: shape(1, RESH, line([38, 45], [38, 100])),
    פ: shape(1, RESH, line([15, 75], [75, 75]), CURL),
    ך: shape(1, RESH, line([75, 75], [75, 100])),
    ם: shape(1, RESH, line([15, 25], [15, 75], [75, 75])),
    ף: shape(1, RESH, line([75, 75], [75, 100]), CURL),
    // Family 2
    ו: shape(1, VAV),
    י: shape(1, line([30, 25], [60, 25], [60, 45])),
    ז: shape(1, VAV, line([60, 25], [78, 25])),
    ן: shape(1, VAV, line([60, 75], [60, 100])),
    ג: shape(1, VAV, line([35, 50], [60, 50]), line([35, 50], [35, 75])),
    // Family 3
    צ: shape(2, DIAGONAL, BRANCH, line([15, 78], [75, 78])),
    א: shape(2, DIAGONAL, BRANCH, line([24, 30], [20, 70])),
    ץ: shape(2, DIAGONAL, BRANCH, line([75, 70], [93, 83.5])),
    // Family 4
    נ: shape(1, NUN, line([55, 25], [75, 25])),
    ט: shape(1, NUN, line([15, 28], [15, 75]), line([73, 27], [45, 48])),
    ש: shape(1, NUN, line([15, 25], [15, 75]), line([45, 25], [45, 75])),
    ע: shape(1, NUN, line([32, 25], [32, 75])),
    מ: shape(1, NUN, line([75, 28], [15, 58]), line([33, 20], [33, 49])),
  },
  families: [
    { id: 'resh', color: '#378ADD', basicShape: shape(1, RESH), letters: [...'רדהחתבכלסקפךםף'] },
    { id: 'vav', color: '#1D9E75', basicShape: shape(1, VAV), letters: [...'ויזןג'] },
    { id: 'tsadi', color: '#D85A30', basicShape: shape(2, DIAGONAL, BRANCH), letters: [...'צאץ'] },
    { id: 'nun', color: '#7F77DD', basicShape: shape(1, NUN), letters: [...'נטשעמ'] },
  ],
};

/** The family-4 basic shape is the one stroke allowed to end by going right to left. */
export const HEBREW_RIGHT_TO_LEFT_BASE: Stroke = NUN;
