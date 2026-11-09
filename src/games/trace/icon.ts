import { svgElement } from '../../core/svg';
import type { LetterShape, Point } from './shapes';

export const LINE_WIDTH = 9;
const ICON_LINE_WIDTH = 11;
const ICON_PADDING = 7;

export function polyline(
  points: readonly Point[],
  color: string,
  opacity: number,
  width = LINE_WIDTH,
): SVGElement {
  return svgElement('polyline', {
    points: points.map(([x, y]) => `${x},${y}`).join(' '),
    fill: 'none',
    stroke: color,
    'stroke-opacity': String(opacity),
    'stroke-width': String(width),
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });
}

/** A small picture of a shape, sized by CSS. Used for the group buttons and the basic-shape tile. */
export function shapeIcon(shape: LetterShape, color: string): SVGElement {
  const points = shape.strokes.flat();
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const left = Math.min(...xs) - ICON_PADDING;
  const top = Math.min(...ys) - ICON_PADDING;
  const width = Math.max(...xs) - Math.min(...xs) + ICON_PADDING * 2;
  const height = Math.max(...ys) - Math.min(...ys) + ICON_PADDING * 2;
  const icon = svgElement('svg', {
    viewBox: `${left} ${top} ${width} ${height}`,
    class: 'shape-icon',
    'aria-hidden': 'true',
  });
  for (const stroke of shape.strokes) icon.append(polyline(stroke, color, 1, ICON_LINE_WIDTH));
  return icon;
}
