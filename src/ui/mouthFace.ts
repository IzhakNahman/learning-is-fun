import { svgElement } from '../core/svg';

/**
 * The owl's face saying a vowel: the mouth shows how the child's mouth moves for each niqqud
 * mark (wide open for "a", a smile for "i", a round O for "o" ...).
 */

export type MouthShape = 'a' | 'e' | 'i' | 'o' | 'u' | 'shva';

/** Which mouth each niqqud mark makes (by the mark's id in the language pack). */
export const MOUTH_OF_NIQQUD: Readonly<Record<string, MouthShape>> = {
  kamatz: 'a',
  patach: 'a',
  tzere: 'e',
  segol: 'e',
  hiriq: 'i',
  holam: 'o',
  shuruk: 'u',
  kubutz: 'u',
  shva: 'shva',
};

const BODY = '#a8693a';
const FACE = '#e9c9a0';
const OUTLINE = '#5e3a1e';
const PUPIL = '#2b2b3a';
const MOUTH = '#7a1f2b';
const TONGUE = '#ff8a8a';
const CHEEKS = '#ffb0a8';

type Part = ['path' | 'ellipse' | 'circle', Record<string, string>];

/** The owl's head (100 x 100 units), the same owl as the guide, without its beak. */
const HEAD: readonly Part[] = [
  ['path', { d: 'M22 34 L26 10 L42 26 Z', fill: BODY, stroke: OUTLINE, 'stroke-width': '2' }],
  ['path', { d: 'M78 34 L74 10 L58 26 Z', fill: BODY, stroke: OUTLINE, 'stroke-width': '2' }],
  ['circle', { cx: '50', cy: '54', r: '42', fill: BODY, stroke: OUTLINE, 'stroke-width': '2' }],
  [
    'path',
    {
      d: 'M50 26 C34 20 16 30 18 50 C20 68 34 78 50 84 C66 78 80 68 82 50 C84 30 66 20 50 26 Z',
      fill: FACE,
    },
  ],
  ['circle', { cx: '36', cy: '44', r: '11', fill: '#fff', stroke: OUTLINE, 'stroke-width': '1.6' }],
  ['circle', { cx: '64', cy: '44', r: '11', fill: '#fff', stroke: OUTLINE, 'stroke-width': '1.6' }],
  ['circle', { cx: '37', cy: '46', r: '6', fill: PUPIL }],
  ['circle', { cx: '63', cy: '46', r: '6', fill: PUPIL }],
  ['circle', { cx: '39', cy: '43', r: '2', fill: '#fff' }],
  ['circle', { cx: '65', cy: '43', r: '2', fill: '#fff' }],
  ['circle', { cx: '24', cy: '60', r: '4', fill: CHEEKS, opacity: '0.8' }],
  ['circle', { cx: '76', cy: '60', r: '4', fill: CHEEKS, opacity: '0.8' }],
];

/** The mouth, centred under the eyes at (50, 68). */
const MOUTHS: Readonly<Record<MouthShape, readonly Part[]>> = {
  // "a": wide open, with the tongue showing
  a: [
    ['ellipse', { cx: '50', cy: '68', rx: '10', ry: '11', fill: MOUTH }],
    ['ellipse', { cx: '50', cy: '74', rx: '6', ry: '4', fill: TONGUE }],
  ],
  // "e": half open and wide
  e: [
    ['ellipse', { cx: '50', cy: '68', rx: '13', ry: '6', fill: MOUTH }],
    ['ellipse', { cx: '50', cy: '71', rx: '7', ry: '2.5', fill: TONGUE }],
  ],
  // "i": a big smile
  i: [['path', { d: 'M34 64 Q50 80 66 64 Q50 70 34 64 Z', fill: MOUTH }]],
  // "o": a round O
  o: [
    [
      'circle',
      { cx: '50', cy: '68', r: '7.5', fill: MOUTH, stroke: '#c0392b', 'stroke-width': '2' },
    ],
  ],
  // "u": lips pushed forward into a small circle
  u: [
    ['circle', { cx: '50', cy: '68', r: '5.5', fill: '#e2735f' }],
    ['circle', { cx: '50', cy: '68', r: '2.5', fill: MOUTH }],
  ],
  // שְׁוָא: a short, almost closed mouth
  shva: [['ellipse', { cx: '50', cy: '68', rx: '7', ry: '1.8', fill: MOUTH }]],
};

export function buildMouthFace(mouth: MouthShape): SVGSVGElement {
  const svg = svgElement('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' });
  svg.dataset.mouth = mouth;
  for (const [shape, attributes] of [...HEAD, ...MOUTHS[mouth]]) {
    svg.append(svgElement(shape, attributes));
  }
  return svg;
}

/** The mouth for a niqqud mark, or null for an unknown mark. */
export function mouthOf(niqqudId: string): MouthShape | null {
  return MOUTH_OF_NIQQUD[niqqudId] ?? null;
}
