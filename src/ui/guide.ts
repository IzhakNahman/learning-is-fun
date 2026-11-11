import { guidePart } from '../content';
import type { LanguagePack } from '../content';
import { createElement } from '../core/dom';
import { svgElement } from '../core/svg';
import { speakInterrupting } from '../core/voice';

/** The baby owl: the same one that hatches from the egg in the app icon. */
const OWL_BODY = '#a8693a';
const OWL_WINGS = '#8e5530';
const OWL_FACE = '#e9c9a0';
const OWL_BELLY = '#f3e1c7';
const OWL_BELLY_MARKS = '#d4b48c';
const OWL_OUTLINE = '#5e3a1e';
const OWL_BEAK = '#ff8a3d';
const OWL_CHEEKS = '#ffb0a8';
const OWL_PUPIL = '#2b2b3a';

type OwlShape = 'path' | 'ellipse' | 'circle';

/** Each part of the owl, back to front (100 x 100 units). */
const OWL_PARTS: ReadonlyArray<[OwlShape, Record<string, string>]> = [
  [
    'path',
    {
      d: 'M27 30 L30 11 L42 25 Z',
      fill: OWL_BODY,
      stroke: OWL_OUTLINE,
      'stroke-width': '2',
      'stroke-linejoin': 'round',
    },
  ],
  [
    'path',
    {
      d: 'M73 30 L70 11 L58 25 Z',
      fill: OWL_BODY,
      stroke: OWL_OUTLINE,
      'stroke-width': '2',
      'stroke-linejoin': 'round',
    },
  ],
  [
    'ellipse',
    {
      cx: '17',
      cy: '62',
      rx: '8',
      ry: '16',
      fill: OWL_WINGS,
      stroke: OWL_OUTLINE,
      'stroke-width': '2',
    },
  ],
  [
    'ellipse',
    {
      cx: '83',
      cy: '62',
      rx: '8',
      ry: '16',
      fill: OWL_WINGS,
      stroke: OWL_OUTLINE,
      'stroke-width': '2',
    },
  ],
  [
    'ellipse',
    {
      cx: '50',
      cy: '56',
      rx: '34',
      ry: '36',
      fill: OWL_BODY,
      stroke: OWL_OUTLINE,
      'stroke-width': '2',
    },
  ],
  [
    'path',
    {
      d: 'M50 30 C38 25 25 32 26 45 C27 56 40 58 50 52 C60 58 73 56 74 45 C75 32 62 25 50 30 Z',
      fill: OWL_FACE,
    },
  ],
  ['ellipse', { cx: '50', cy: '74', rx: '19', ry: '16', fill: OWL_BELLY }],
  [
    'path',
    {
      d: 'M43 70 q3 -3 6 0 M51 70 q3 -3 6 0 M47 77 q3 -3 6 0',
      stroke: OWL_BELLY_MARKS,
      'stroke-width': '1.6',
      fill: 'none',
      'stroke-linecap': 'round',
    },
  ],
  [
    'circle',
    { cx: '39', cy: '42', r: '10', fill: '#fff', stroke: OWL_OUTLINE, 'stroke-width': '1.6' },
  ],
  [
    'circle',
    { cx: '61', cy: '42', r: '10', fill: '#fff', stroke: OWL_OUTLINE, 'stroke-width': '1.6' },
  ],
  ['circle', { cx: '40', cy: '44', r: '5.5', fill: OWL_PUPIL }],
  ['circle', { cx: '60', cy: '44', r: '5.5', fill: OWL_PUPIL }],
  ['circle', { cx: '42', cy: '41', r: '1.8', fill: '#fff' }],
  ['circle', { cx: '62', cy: '41', r: '1.8', fill: '#fff' }],
  ['path', { d: 'M46 50 L54 50 L50 56 Z', fill: OWL_BEAK }],
  ['circle', { cx: '29', cy: '53', r: '3.2', fill: OWL_CHEEKS, opacity: '0.85' }],
  ['circle', { cx: '71', cy: '53', r: '3.2', fill: OWL_CHEEKS, opacity: '0.85' }],
  [
    'path',
    {
      d: 'M39 91 L39 97 M44 91 L44 97 M56 91 L56 97 M61 91 L61 97',
      stroke: OWL_BEAK,
      'stroke-width': '3',
      'stroke-linecap': 'round',
    },
  ],
];

/** A small, original baby owl drawn in SVG (100 x 100 units). */
export function buildOwl(): SVGSVGElement {
  const svg = svgElement('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' });
  for (const [shape, attributes] of OWL_PARTS) svg.append(svgElement(shape, attributes));
  return svg;
}

/** The friendly owl that stands next to the next game to play and says "let's play" when tapped. */
export function buildGuide(pack: LanguagePack): HTMLElement {
  const guide = createElement('button', { className: 'guide', title: pack.ui.guide.label });
  guide.setAttribute('aria-label', pack.ui.guide.label);
  guide.append(buildOwl());
  guide.addEventListener('click', () => void speakInterrupting(guidePart(pack)));
  return guide;
}
