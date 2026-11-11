import { gameNamePart } from '../content';
import type { GameId, LanguagePack } from '../content';
import { createElement } from '../core/dom';
import { svgElement } from '../core/svg';
import { speakInterrupting } from '../core/voice';
import {
  PATH_VIEW_SIZE,
  buildRiverPath,
  buildRoadPath,
  layoutStops,
  placeDecor,
  roadMarkers,
  type DecorKind,
  type Point,
  type RoadOrientation,
} from '../journey/layout';
import { nextGameToPlay } from '../journey/played';
import { stopsFor, type StopDefinition } from '../journey/stops';
import type { UnlockPolicy } from '../journey/unlock';
import { buildGuide } from './guide';

const DECOR_EMOJI: Record<Exclude<DecorKind, 'letter'>, string> = {
  tree: '🌳',
  pine: '🌲',
  bush: '🌿',
  flower: '🌸',
};
/** The big faded numbers that share the "letter land" scenery with the letters. */
const DECOR_DIGITS = ['1', '2', '3', '4', '5'];
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

/** The scrollable scene: sky, river, winding road, scenery and one button per stop. */
export function buildRoad(options: RoadOptions): HTMLElement {
  const { pack, orientation, isUnlocked, playedGames, onOpen } = options;
  const stops = stopsFor(pack);
  const points = layoutStops(stops.length, orientation, pack.dir === 'rtl');
  const scene = createElement('div', { className: `road-scene ${orientation}` });
  // The scene grows with the number of stops so they never crowd each other.
  scene.style.setProperty('--stops', String(stops.length));
  scene.append(buildPathsSvg(points, orientation));
  placeDecor(points, orientation).forEach((item, index) => {
    scene.append(buildDecor(item, decorText(item.kind, index, pack)));
  });
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
  const scroller = createElement('div', { className: 'road-scroll' }, scene);
  scroller.tabIndex = 0;
  return createElement('div', { className: 'road-wrap' }, scroller);
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

/** Emoji for scenery; for "letter" items, a letter of the language or a digit, in turn. */
function decorText(kind: DecorKind, index: number, pack: LanguagePack): string {
  if (kind !== 'letter') return DECOR_EMOJI[kind];
  const symbols = [...pack.letters.map((letter) => letter.boxText), ...DECOR_DIGITS];
  return symbols[(index * 7) % symbols.length] ?? DECOR_DIGITS[0] ?? '';
}

function buildDecor(point: Point & { kind: DecorKind }, text: string): HTMLElement {
  const item = createElement('span', { className: `decor ${point.kind}`, text });
  item.setAttribute('aria-hidden', 'true');
  place(item, point);
  return item;
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
    createElement('span', { className: 'ic', text: stop.icon }),
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

  const wrapper = createElement(
    'div',
    { className: status.unlocked ? 'stop' : 'stop locked' },
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
