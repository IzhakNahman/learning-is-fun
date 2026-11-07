import { gameNamePart } from '../content';
import type { GameId, LanguagePack } from '../content';
import { createElement } from '../core/dom';
import { speakInterrupting } from '../core/voice';
import {
  PATH_VIEW_SIZE,
  buildRiverPath,
  buildRoadPath,
  layoutStops,
  placeDecor,
  type DecorKind,
  type Point,
  type RoadOrientation,
} from '../journey/layout';
import { STOPS, type StopDefinition } from '../journey/stops';
import type { UnlockPolicy } from '../journey/unlock';

const SVG_NS = 'http://www.w3.org/2000/svg';

const DECOR_EMOJI: Record<DecorKind, string> = {
  tree: '🌳',
  pine: '🌲',
  bush: '🌿',
  rock: '🪨',
  flower: '🌸',
};

export interface RoadOptions {
  pack: LanguagePack;
  orientation: RoadOrientation;
  isUnlocked: UnlockPolicy;
  onOpen: (game: GameId) => void;
}

/** The scrollable scene: sky, river, winding road, scenery and one button per stop. */
export function buildRoad({ pack, orientation, isUnlocked, onOpen }: RoadOptions): HTMLElement {
  const points = layoutStops(STOPS.length, orientation, pack.dir === 'rtl');
  const scene = createElement('div', { className: `road-scene ${orientation}` });
  scene.append(buildPathsSvg(points, orientation));
  for (const item of placeDecor(points, orientation)) scene.append(buildDecor(item, item.kind));
  STOPS.forEach((stop, index) => {
    const point = points[index];
    if (!point) return;
    scene.append(buildStop(stop, point, isUnlocked(index, STOPS), pack, onOpen));
  });
  return createElement('div', { className: 'road-scroll' }, scene);
}

/** Show the beginning of the road: the bottom in portrait, the reading-start side in landscape. */
export function scrollRoadToStart(scroller: HTMLElement, orientation: RoadOrientation): void {
  if (orientation === 'portrait') scroller.scrollTop = scroller.scrollHeight;
  else scroller.scrollLeft = 0;
}

function svgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string>,
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return element;
}

function buildPathsSvg(points: readonly Point[], orientation: RoadOrientation): SVGSVGElement {
  const svg = svgElement('svg', {
    class: 'road-svg',
    viewBox: `0 0 ${PATH_VIEW_SIZE} ${PATH_VIEW_SIZE}`,
    preserveAspectRatio: 'none',
    'aria-hidden': 'true',
  });
  const roadPath = buildRoadPath(points);
  const layers = [
    { class: 'river', d: buildRiverPath(points, orientation) },
    { class: 'road-edge', d: roadPath },
    { class: 'road-surface', d: roadPath },
    { class: 'road-dashes', d: roadPath },
  ];
  for (const layer of layers) {
    svg.append(
      svgElement('path', { ...layer, 'vector-effect': 'non-scaling-stroke', fill: 'none' }),
    );
  }
  return svg;
}

function place(element: HTMLElement, point: Point): void {
  element.style.left = `${point.x * 100}%`;
  element.style.top = `${point.y * 100}%`;
}

function buildDecor(point: Point, kind: DecorKind): HTMLElement {
  const item = createElement('span', { className: `decor ${kind}`, text: DECOR_EMOJI[kind] });
  item.setAttribute('aria-hidden', 'true');
  place(item, point);
  return item;
}

function buildStop(
  stop: StopDefinition,
  point: Point,
  unlocked: boolean,
  pack: LanguagePack,
  onOpen: (game: GameId) => void,
): HTMLElement {
  const name = pack.ui.gameNames[stop.game];
  const button = createElement(
    'button',
    { className: 'stop-button', dataset: { game: stop.game } },
    createElement('span', { className: 'ic', text: stop.icon }),
    createElement('span', { className: 'gname', text: name }),
  );
  button.style.setProperty('--top', stop.top);
  button.style.setProperty('--bottom', stop.bottom);
  button.style.setProperty('--edge', stop.edge);
  button.disabled = !unlocked;
  button.addEventListener('click', () => onOpen(stop.game));

  const speaker = createElement('button', { className: 'stop-speaker', text: '🔊', title: name });
  speaker.setAttribute('aria-label', name);
  speaker.addEventListener('click', () => void speakInterrupting(gameNamePart(pack, stop.game)));

  const wrapper = createElement(
    'div',
    { className: unlocked ? 'stop' : 'stop locked' },
    button,
    speaker,
  );
  place(wrapper, point);
  return wrapper;
}
