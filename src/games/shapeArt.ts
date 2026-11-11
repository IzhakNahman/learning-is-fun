import { svgElement } from '../core/svg';

const VIEW_BOX = '0 0 100 100';

const STAR_POINTS = 5;
const STAR_OUTER_RADIUS = 46;
const STAR_INNER_RADIUS = 20;

/** The corner points of a star, going around once: outer, inner, outer, inner... */
export function starPoints(): string {
  const points: string[] = [];
  for (let index = 0; index < STAR_POINTS * 2; index++) {
    const radius = index % 2 === 0 ? STAR_OUTER_RADIUS : STAR_INNER_RADIUS;
    const angle = (Math.PI * index) / STAR_POINTS - Math.PI / 2;
    points.push(
      `${(50 + radius * Math.cos(angle)).toFixed(1)},${(54 + radius * Math.sin(angle)).toFixed(1)}`,
    );
  }
  return points.join(' ');
}

const HEART_PATH =
  'M50 88 C 8 58, 6 26, 30 19 C 42 16, 50 25, 50 32 C 50 25, 58 16, 70 19 C 94 26, 92 58, 50 88 Z';

/** Each shape is drawn as one SVG element; the ids match the shape ids in the language packs. */
const DRAWINGS: Record<string, () => SVGElement> = {
  circle: () => svgElement('circle', { cx: '50', cy: '50', r: '42' }),
  square: () => svgElement('rect', { x: '14', y: '14', width: '72', height: '72', rx: '3' }),
  rectangle: () => svgElement('rect', { x: '6', y: '27', width: '88', height: '46', rx: '3' }),
  triangle: () => svgElement('polygon', { points: '50,10 92,86 8,86' }),
  rhombus: () => svgElement('polygon', { points: '50,6 90,50 50,94 10,50' }),
  oval: () => svgElement('ellipse', { cx: '50', cy: '50', rx: '44', ry: '29' }),
  star: () => svgElement('polygon', { points: starPoints() }),
  heart: () => svgElement('path', { d: HEART_PATH }),
};

/** Colours that go with the shapes, in the same order as the shape list. */
const FILLS = [
  '#ff6b6b',
  '#4d96ff',
  '#ffa94d',
  '#51cf66',
  '#cc5de8',
  '#22b8cf',
  '#fcc419',
  '#f06595',
];

export function hasShapeDrawing(id: string): boolean {
  return id in DRAWINGS;
}

export function shapeColor(index: number): string {
  return FILLS[index % FILLS.length] ?? '#4d96ff';
}

export function buildShapeSvg(id: string, color: string): SVGSVGElement {
  const svg = svgElement('svg', { viewBox: VIEW_BOX, class: 'shape-art', 'aria-hidden': 'true' });
  const drawing = DRAWINGS[id]?.();
  if (!drawing) return svg;
  drawing.setAttribute('fill', color);
  drawing.setAttribute('stroke', 'rgba(0,0,0,0.18)');
  drawing.setAttribute('stroke-width', '3');
  drawing.setAttribute('stroke-linejoin', 'round');
  svg.append(drawing);
  return svg;
}
