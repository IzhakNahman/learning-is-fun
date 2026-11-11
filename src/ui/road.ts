import { gameNamePart } from '../content';
import type { GameId, LanguagePack } from '../content';
import { createElement } from '../core/dom';
import { svgElement } from '../core/svg';
import { speakInterrupting } from '../core/voice';
import {
  buildLadder,
  layoutStops,
  roadMarkers,
  type Point,
  type RoadOrientation,
} from '../journey/layout';
import { nextGameToPlay } from '../journey/played';
import { stopIcon, stopsFor, type StopDefinition } from '../journey/stops';
import type { UnlockPolicy } from '../journey/unlock';
import { buildGuide } from './guide';

/** Ladder size, as a share of a game button's width. */
const RAIL_HALF_WIDTH = 0.3;
const RUNG_SPACING = 0.27;
/** Dark wood under light wood, for both the rails and the rungs. */
const LADDER_LAYERS = [
  { part: 'rails', color: '#7a4a1f', width: 0.07 },
  { part: 'rails', color: '#c58b4a', width: 0.03 },
  { part: 'rungs', color: '#a8672b', width: 0.1 },
  { part: 'rungs', color: '#e6b06a', width: 0.06 },
] as const;

interface CloudSpot {
  left: number;
  top: number;
  scale: number;
}
/** Where the clouds float (percent of the sky world). */
const CLOUD_SPOTS: Record<RoadOrientation, CloudSpot[]> = {
  portrait: [
    { left: 14, top: 9, scale: 1 },
    { left: 66, top: 21, scale: 0.8 },
    { left: 24, top: 34, scale: 1.1 },
    { left: 78, top: 47, scale: 0.9 },
    { left: 12, top: 60, scale: 0.8 },
    { left: 70, top: 72, scale: 1 },
  ],
  landscape: [
    { left: 4, top: 22, scale: 1 },
    { left: 11, top: 52, scale: 0.8 },
    { left: 18, top: 16, scale: 1.1 },
    { left: 26, top: 40, scale: 0.9 },
    { left: 33, top: 64, scale: 0.8 },
    { left: 40, top: 20, scale: 1 },
    { left: 48, top: 48, scale: 1.1 },
    { left: 55, top: 70, scale: 0.8 },
    { left: 62, top: 18, scale: 0.9 },
    { left: 70, top: 44, scale: 1 },
    { left: 77, top: 66, scale: 0.8 },
    { left: 84, top: 24, scale: 1.1 },
    { left: 91, top: 52, scale: 0.9 },
  ],
};
const START_MARKER = '🚩';
const FINISH_MARKER = '🏁';
const PLAYED_CHECK = '✓';

export interface RoadOptions {
  pack: LanguagePack;
  orientation: RoadOrientation;
  isUnlocked: UnlockPolicy;
  /** Games the child has already opened; they get a ✓. */
  playedGames: ReadonlySet<GameId>;
  onOpen: (game: GameId) => void;
}

/** The scrollable sky world: sun, clouds, a wooden ladder and one button per stop. */
export function buildRoad(options: RoadOptions): HTMLElement {
  const { pack, orientation, isUnlocked, playedGames, onOpen } = options;
  const stops = stopsFor(pack);
  const points = layoutStops(stops.length, orientation, pack.dir === 'rtl');
  const scene = createElement('div', { className: `road-scene ${orientation}` });
  // The scene grows with the number of stops so they never crowd each other.
  scene.style.setProperty('--stops', String(stops.length));
  const ladder = svgElement('svg', { class: 'ladder-svg', 'aria-hidden': 'true' });
  scene.append(ladder);
  const markers = roadMarkers(points, orientation);
  scene.append(
    buildMarker(markers.start, START_MARKER, 'start'),
    buildMarker(markers.finish, FINISH_MARKER, 'finish'),
  );
  const guideGame = nextGameToPlay(stops, playedGames);
  stops.forEach((stop, index) => {
    const point = points[index];
    if (!point) return;
    const status = {
      unlocked: isUnlocked(index, stops),
      played: playedGames.has(stop.game),
      hasGuide: stop.game === guideGame,
    };
    scene.append(buildStop(stop, point, status, pack, onOpen));
  });
  redrawLadderOnResize(scene, ladder, points);
  const world = createElement(
    'div',
    { className: `road-world ${orientation}` },
    ...buildSkyWorld(orientation),
    scene,
  );
  const scroller = createElement('div', { className: 'road-scroll' }, world);
  scroller.tabIndex = 0;
  return createElement('div', { className: 'road-wrap' }, scroller);
}

function buildSkyWorld(orientation: RoadOrientation): HTMLElement[] {
  const sun = createElement('span', { className: `world-sun ${orientation}` });
  const clouds = CLOUD_SPOTS[orientation].map(({ left, top, scale }) => {
    const cloud = createElement('span', { className: 'world-cloud' });
    cloud.style.left = `${left}%`;
    cloud.style.top = `${top}%`;
    cloud.style.setProperty('--cloud-scale', String(scale));
    return cloud;
  });
  const parts = [sun, ...clouds];
  parts.forEach((part) => part.setAttribute('aria-hidden', 'true'));
  return parts;
}

/** The ladder is drawn in real pixels, so it is redrawn whenever the scene changes size. */
function redrawLadderOnResize(scene: HTMLElement, svg: SVGSVGElement, points: Point[]): void {
  if (typeof ResizeObserver === 'undefined') return;
  new ResizeObserver(() => drawLadder(scene, svg, points)).observe(scene);
}

function drawLadder(scene: HTMLElement, svg: SVGSVGElement, points: Point[]): void {
  const width = scene.clientWidth;
  const height = scene.clientHeight;
  const buttonWidth = scene.querySelector<HTMLElement>('.stop-button')?.offsetWidth ?? 0;
  if (width === 0 || height === 0 || buttonWidth === 0) return;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.replaceChildren();
  const ladder = buildLadder(
    points.map((point) => ({ x: point.x * width, y: point.y * height })),
    buttonWidth * RAIL_HALF_WIDTH,
    buttonWidth * RUNG_SPACING,
  );
  for (const layer of LADDER_LAYERS) {
    for (const line of ladder[layer.part]) {
      svg.append(
        svgElement('line', {
          x1: String(line.x1),
          y1: String(line.y1),
          x2: String(line.x2),
          y2: String(line.y2),
          stroke: layer.color,
          'stroke-width': String(buttonWidth * layer.width),
          'stroke-linecap': 'round',
        }),
      );
    }
  }
}

function place(element: HTMLElement, point: Point): void {
  element.style.left = `${point.x * 100}%`;
  element.style.top = `${point.y * 100}%`;
}

function buildMarker(point: Point, symbol: string, className: string): HTMLElement {
  const marker = createElement('span', { className: `marker ${className}`, text: symbol });
  marker.setAttribute('aria-hidden', 'true');
  place(marker, point);
  return marker;
}

function buildStop(
  stop: StopDefinition,
  point: Point,
  status: { unlocked: boolean; played: boolean; hasGuide: boolean },
  pack: LanguagePack,
  onOpen: (game: GameId) => void,
): HTMLElement {
  const name = pack.ui.gameNames[stop.game];
  const button = createElement(
    'button',
    { className: 'stop-button', dataset: { game: stop.game } },
    createElement('span', {
      className: stop.letterIcon === undefined ? 'ic' : 'ic letter',
      text: stopIcon(stop, pack),
    }),
    createElement('span', { className: 'gname', text: name }),
  );
  button.style.setProperty('--top', stop.top);
  button.style.setProperty('--bottom', stop.bottom);
  button.style.setProperty('--edge', stop.edge);
  button.disabled = !status.unlocked;
  button.addEventListener('click', () => onOpen(stop.game));

  const speaker = createElement('button', { className: 'stop-speaker', text: '🔊', title: name });
  speaker.setAttribute('aria-label', name);
  speaker.addEventListener('click', () => void speakInterrupting(gameNamePart(pack, stop.game)));

  const classNames = ['stop', status.unlocked ? '' : 'locked', status.hasGuide ? 'has-guide' : ''];
  const wrapper = createElement(
    'div',
    { className: classNames.filter(Boolean).join(' ') },
    button,
    speaker,
  );
  if (status.played) {
    button.append(createElement('span', { className: 'stop-check', text: PLAYED_CHECK }));
  }
  if (status.hasGuide) wrapper.append(buildGuide(pack));
  place(wrapper, point);
  return wrapper;
}
