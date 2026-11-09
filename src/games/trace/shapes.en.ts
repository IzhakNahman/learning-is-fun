import { arc, shape } from './shapes';
import type { Point, Stroke, TraceSet } from './shapes';

/**
 * English capital letters in the Handwriting Without Tears teaching order: straight lines first,
 * then curves, then diagonals. Every letter starts at the top. Curved letters are one stroke.
 */

const line = (...points: Point[]): Stroke => points;

/** The bowl of P, B and R: from the stem, right, around and back to the stem. */
function bowl(
  centerY: number,
  radiusX: number,
  radiusY: number,
  top: number,
  bottom: number,
): Stroke {
  return [[30, top], [48, top], ...arc(48, centerY, radiusX, radiusY, -90, 90), [30, bottom]];
}

const stem = line([30, 15], [30, 85]);

export const englishTrace: TraceSet = {
  shapes: {
    L: shape(1, stem, line([30, 85], [75, 85])),
    F: shape(1, stem, line([30, 15], [75, 15]), line([30, 48], [66, 48])),
    E: shape(1, stem, line([30, 15], [75, 15]), line([30, 50], [68, 50]), line([30, 85], [75, 85])),
    H: shape(1, line([28, 15], [28, 85]), line([72, 15], [72, 85]), line([28, 50], [72, 50])),
    T: shape(1, line([50, 15], [50, 85]), line([22, 15], [78, 15])),
    I: shape(1, line([50, 15], [50, 85])),
    U: shape(1, [[28, 15], [28, 60], ...arc(50, 60, 22, 25, 180, 0), [72, 15]]),
    C: shape(1, arc(50, 50, 26, 35, -45, -315)),
    O: shape(1, arc(50, 50, 28, 35, -90, -450)),
    Q: shape(1, arc(50, 50, 28, 35, -90, -450), line([58, 66], [78, 88])),
    G: shape(1, arc(50, 50, 26, 35, -45, -330), line([50, 52], [73, 52]), line([73, 52], [73, 67])),
    S: shape(1, [...arc(50, 33, 22, 18, -35, -270), ...arc(50, 68, 22, 17, -90, 215).slice(1)]),
    J: shape(1, [[60, 15], [60, 60], ...arc(43, 60, 17, 25, 0, 150)]),
    D: shape(1, stem, [[30, 15], [48, 15], ...arc(48, 50, 30, 35, -90, 90), [30, 85]]),
    P: shape(1, stem, bowl(33, 24, 18, 15, 51)),
    B: shape(1, stem, bowl(33, 22, 18, 15, 51), [
      [30, 51],
      [48, 51],
      ...arc(48, 68, 28, 17, -90, 90),
      [30, 85],
    ]),
    R: shape(1, stem, bowl(33, 24, 18, 15, 51), line([46, 51], [74, 85])),
    K: shape(1, stem, line([72, 15], [30, 52]), line([42, 40], [75, 85])),
    A: shape(1, line([50, 15], [25, 85]), line([50, 15], [75, 85]), line([36, 62], [64, 62])),
    N: shape(1, line([28, 15], [28, 85]), line([28, 15], [72, 85]), line([72, 15], [72, 85])),
    M: shape(
      1,
      line([22, 15], [22, 85]),
      line([22, 15], [50, 60]),
      line([78, 15], [50, 60]),
      line([78, 15], [78, 85]),
    ),
    V: shape(1, line([25, 15], [50, 85]), line([75, 15], [50, 85])),
    W: shape(
      1,
      line([18, 15], [34, 85]),
      line([50, 15], [34, 85]),
      line([50, 15], [66, 85]),
      line([82, 15], [66, 85]),
    ),
    X: shape(1, line([25, 15], [75, 85]), line([75, 15], [25, 85])),
    Y: shape(1, line([25, 15], [50, 50]), line([75, 15], [50, 50]), line([50, 50], [50, 85])),
    Z: shape(1, line([25, 15], [75, 15]), line([75, 15], [25, 85]), line([25, 85], [75, 85])),
  },
  families: [
    {
      id: 'lines',
      color: '#378ADD',
      basicShape: shape(1, line([50, 15], [50, 85])),
      letters: [...'LFEHTI'],
    },
    {
      id: 'curves',
      color: '#1D9E75',
      basicShape: shape(1, arc(40, 50, 30, 35, -90, 90)),
      letters: [...'UCOQGSJDPBR'],
    },
    {
      id: 'diagonals',
      color: '#D85A30',
      basicShape: shape(1, line([25, 15], [75, 85])),
      letters: [...'KANMVWXYZ'],
    },
  ],
};
