import { guidePart } from '../content';
import type { LanguagePack } from '../content';
import { createElement } from '../core/dom';
import { svgElement } from '../core/svg';
import { speakInterrupting } from '../core/voice';

const OWL_BODY = '#ffd23f';
const OWL_BELLY = '#fff3c4';
const OWL_BEAK = '#ff8a3d';
const OWL_OUTLINE = '#c98a00';
const OWL_PUPIL = '#2b2b3a';

/** A small, original owl drawn in SVG (100 x 100 units). */
function buildOwl(): SVGSVGElement {
  const svg = svgElement('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' });
  const shape = (
    tag: 'ellipse' | 'circle' | 'path',
    attributes: Record<string, string>,
  ): SVGElement => svgElement(tag, attributes);
  svg.append(
    shape('path', {
      d: 'M24 34 L30 12 L44 28 Z',
      fill: OWL_BODY,
      stroke: OWL_OUTLINE,
      'stroke-width': '3',
    }),
    shape('path', {
      d: 'M76 34 L70 12 L56 28 Z',
      fill: OWL_BODY,
      stroke: OWL_OUTLINE,
      'stroke-width': '3',
    }),
    shape('ellipse', {
      cx: '50',
      cy: '58',
      rx: '34',
      ry: '34',
      fill: OWL_BODY,
      stroke: OWL_OUTLINE,
      'stroke-width': '3',
    }),
    shape('ellipse', { cx: '50', cy: '72', rx: '20', ry: '20', fill: OWL_BELLY }),
    shape('ellipse', {
      cx: '17',
      cy: '62',
      rx: '8',
      ry: '16',
      fill: OWL_BODY,
      stroke: OWL_OUTLINE,
      'stroke-width': '3',
    }),
    shape('ellipse', {
      cx: '83',
      cy: '62',
      rx: '8',
      ry: '16',
      fill: OWL_BODY,
      stroke: OWL_OUTLINE,
      'stroke-width': '3',
    }),
    shape('circle', {
      cx: '37',
      cy: '46',
      r: '12',
      fill: '#fff',
      stroke: OWL_OUTLINE,
      'stroke-width': '2',
    }),
    shape('circle', {
      cx: '63',
      cy: '46',
      r: '12',
      fill: '#fff',
      stroke: OWL_OUTLINE,
      'stroke-width': '2',
    }),
    shape('circle', { cx: '38', cy: '47', r: '6', fill: OWL_PUPIL }),
    shape('circle', { cx: '62', cy: '47', r: '6', fill: OWL_PUPIL }),
    shape('circle', { cx: '40', cy: '44', r: '2', fill: '#fff' }),
    shape('circle', { cx: '64', cy: '44', r: '2', fill: '#fff' }),
    shape('path', { d: 'M44 56 L56 56 L50 67 Z', fill: OWL_BEAK }),
    shape('path', {
      d: 'M38 92 L38 98 M44 92 L44 98 M56 92 L56 98 M62 92 L62 98',
      stroke: OWL_BEAK,
      'stroke-width': '4',
      'stroke-linecap': 'round',
    }),
  );
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
