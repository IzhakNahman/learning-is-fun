import { describe, expect, it } from 'vitest';
import { packs } from '../../content';
import { englishTrace } from './shapes.en';
import { HEBREW_RIGHT_TO_LEFT_BASE, hebrewTrace } from './shapes.he';
import type { LetterShape, Point, Stroke, TraceSet } from './shapes';

const SETS: [string, TraceSet][] = [
  ['Hebrew', hebrewTrace],
  ['English', englishTrace],
];

function* segments(stroke: Stroke): Generator<[Point, Point]> {
  for (let index = 0; index < stroke.length - 1; index++) {
    const from = stroke[index];
    const to = stroke[index + 1];
    if (from && to) yield [from, to];
  }
}

describe.each(SETS)('%s tracing shapes', (_name, set) => {
  const allKeys = Object.keys(set.shapes);

  it('lists every letter in exactly one family', () => {
    const listed = set.families.flatMap((family) => family.letters);
    expect(new Set(listed).size).toBe(listed.length);
    expect([...listed].sort()).toEqual([...allKeys].sort());
  });

  it('gives every letter at least one stroke, with a valid base-stroke count', () => {
    for (const [key, letterShape] of Object.entries(set.shapes)) {
      expect(letterShape.strokes.length, key).toBeGreaterThan(0);
      expect(letterShape.baseStrokes, key).toBeGreaterThanOrEqual(1);
      expect(letterShape.baseStrokes, key).toBeLessThanOrEqual(letterShape.strokes.length);
      for (const stroke of letterShape.strokes) expect(stroke.length, key).toBeGreaterThan(1);
    }
  });

  it('keeps every point inside the drawing area', () => {
    const everyShape = [
      ...Object.entries(set.shapes),
      ...set.families.map((family): [string, LetterShape] => [family.id, family.basicShape]),
    ];
    for (const [key, letterShape] of everyShape) {
      for (const stroke of letterShape.strokes) {
        for (const [x, y] of stroke) {
          expect(x, key).toBeGreaterThanOrEqual(5);
          expect(x, key).toBeLessThanOrEqual(95);
          expect(y, key).toBeGreaterThanOrEqual(-5);
          expect(y, key).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('gives every group a basic shape made only of its basic strokes', () => {
    for (const family of set.families) {
      expect(family.basicShape.baseStrokes, family.id).toBe(family.basicShape.strokes.length);
    }
  });

  it('gives every family a colour', () => {
    for (const family of set.families) expect(family.color).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('Hebrew shapes', () => {
  it('covers every letter of the Hebrew pack, including the final letters', () => {
    const wanted = new Set([
      ...packs.he.letters.map((entry) => [...entry.key][0] ?? ''),
      ...packs.he.finalLetters.map((entry) => entry.char),
    ]);
    expect(Object.keys(hebrewTrace.shapes).sort()).toEqual([...wanted].sort());
  });

  it('starts every letter of a group with the group basic shape, identical in every letter', () => {
    // י is the small version of the group-2 basic shape.
    const exceptions = new Set(['י']);
    for (const family of hebrewTrace.families) {
      const base = family.basicShape.strokes;
      for (const key of family.letters) {
        if (exceptions.has(key)) continue;
        const letterShape = hebrewTrace.shapes[key];
        expect(letterShape?.baseStrokes, key).toBe(family.basicShape.baseStrokes);
        expect(letterShape?.strokes.slice(0, base.length), key).toEqual(base);
      }
    }
  });

  it('only drags downward or from left to right (except the family-4 base)', () => {
    const everyShape = [
      ...Object.entries(hebrewTrace.shapes),
      ...hebrewTrace.families.map((family): [string, LetterShape] => [
        family.id,
        family.basicShape,
      ]),
    ];
    for (const [key, letterShape] of everyShape) {
      letterShape.strokes.forEach((stroke, strokeIndex) => {
        if (stroke === HEBREW_RIGHT_TO_LEFT_BASE && strokeIndex === 0) return;
        for (const [from, to] of segments(stroke)) {
          const goesDown = to[1] > from[1];
          const goesRight = to[1] === from[1] && to[0] > from[0];
          expect(goesDown || goesRight, `${key} stroke ${strokeIndex}`).toBe(true);
        }
      });
    }
  });
});

describe('English shapes', () => {
  it('has a shape for every letter of the English pack', () => {
    const wanted = packs.en.letters.map((entry) => entry.key.toUpperCase());
    expect(Object.keys(englishTrace.shapes).sort()).toEqual([...wanted].sort());
  });

  it('starts every letter near the top', () => {
    for (const [key, letterShape] of Object.entries(englishTrace.shapes)) {
      const start = letterShape.strokes[0]?.[0];
      expect(start?.[1], key).toBeLessThan(38);
    }
  });

  it('follows the teaching order: straight lines, then curves, then diagonals', () => {
    expect(englishTrace.families.map((family) => family.letters.join(''))).toEqual([
      'LFEHTI',
      'UCOQGSJDPBR',
      'KANMVWXYZ',
    ]);
  });
});

describe('Hebrew basic-shape proportions', () => {
  const length = (a: readonly number[], b: readonly number[]): number =>
    Math.hypot((b[0] ?? 0) - (a[0] ?? 0), (b[1] ?? 0) - (a[1] ?? 0));
  const families = hebrewTrace.families;

  it('makes the ר shape’s top line as long as its line down', () => {
    const [stroke] = families.find((family) => family.id === 'resh')!.basicShape.strokes;
    const [start, corner, end] = stroke!;
    const top = length(start!, corner!);
    const down = length(corner!, end!);
    expect(Math.abs(top - down) / down).toBeLessThanOrEqual(0.02);
  });

  it('gives the ו family a shorter top line than before (22 → 16)', () => {
    const [stroke] = families.find((family) => family.id === 'vav')!.basicShape.strokes;
    const [start, corner] = stroke!;
    expect(length(start!, corner!)).toBeLessThan(22);
    expect(length(start!, corner!)).toBeGreaterThan(12);
  });
});
