import { countingPart, letterNamePart } from '../content';
import type { LanguagePack } from '../content';
import { createElement } from '../core/dom';
import { randomBetween, type RandomSource } from '../core/random';
import { playPopSound } from '../core/sfx';
import { speakInterrupting } from '../core/voice';
import type { RoadOrientation } from '../journey/layout';

/**
 * Soap bubbles with letters and numbers float up over the home road. Tapping one pops it and
 * says the letter name or the number; a new bubble then starts from the bottom of its lane.
 */

export type BalloonKind = 'letter' | 'number';

interface Range {
  min: number;
  max: number;
}

/** One bubble per lane, so they never bump into each other. */
const LANES: Record<RoadOrientation, number> = { portrait: 3, landscape: 4 };
const RISE_SECONDS: Range = { min: 26, max: 34 };
const START_DELAY_SECONDS: Range = { min: 0.6, max: 3 };
const SWAY_PX: Range = { min: 10, max: 22 };
const SWAY_SECONDS: Range = { min: 3.2, max: 5 };
const POP_MS = 420;
/** Number bubbles show 1 to this. */
const HIGHEST_NUMBER = 10;
const NUMBER_CHANCE = 0.34;
const POP_DOTS = 8;
const POP_DOT_DISTANCE_PX = 60;

export const BALLOON_COLORS = [
  { top: '#ff9ec7', bottom: '#d94a8a', tint: '240, 98, 158' },
  { top: '#ffd45e', bottom: '#d98f0c', tint: '245, 166, 35' },
  { top: '#8fe3a0', bottom: '#2fa857', tint: '63, 191, 106' },
  { top: '#9fd0ff', bottom: '#3a7fd8', tint: '74, 144, 232' },
  { top: '#c9a8ff', bottom: '#7a50d8', tint: '143, 100, 232' },
  { top: '#ffb27a', bottom: '#d9622a', tint: '240, 118, 58' },
] as const;

export interface BalloonPlan {
  kind: BalloonKind;
  /** The letter key or the number, used to say it. */
  symbol: string;
  /** What is written on the bubble. */
  text: string;
  colorIndex: number;
  leftPercent: number;
  riseSeconds: number;
  /** Negative: the bubble starts part of the way up (used when the page first opens). */
  delaySeconds: number;
  swayPx: number;
  swaySeconds: number;
}

export function laneCount(orientation: RoadOrientation): number {
  return LANES[orientation];
}

const pickIn = (range: Range, random: RandomSource): number =>
  randomBetween(range.min, range.max, random);

/** Letters most of the time; at most half the lanes show numbers at once. */
export function pickKind(
  numbersShowing: number,
  lanes: number,
  needsNumber: boolean,
  random: RandomSource = Math.random,
): BalloonKind {
  if (numbersShowing >= Math.floor(lanes / 2)) return 'letter';
  if (needsNumber || random() < NUMBER_CHANCE) return 'number';
  return 'letter';
}

/** A letter or number not already showing (if possible). */
export function pickSymbol(
  pack: LanguagePack,
  kind: BalloonKind,
  showing: ReadonlySet<string>,
  random: RandomSource = Math.random,
): { symbol: string; text: string } | null {
  const all =
    kind === 'number'
      ? Array.from({ length: HIGHEST_NUMBER }, (_, index) => ({
          symbol: String(index + 1),
          text: String(index + 1),
        }))
      : pack.letters.map((letter) => ({ symbol: letter.key, text: letter.boxText }));
  const fresh = all.filter((item) => !showing.has(item.symbol));
  const choices = fresh.length > 0 ? fresh : all;
  return choices[Math.floor(random() * choices.length)] ?? null;
}

export function planBalloon(
  pack: LanguagePack,
  lane: number,
  lanes: number,
  showing: ReadonlySet<string>,
  options: { kind: BalloonKind; startsPartWay: boolean },
  random: RandomSource = Math.random,
): BalloonPlan | null {
  const picked = pickSymbol(pack, options.kind, showing, random);
  if (!picked) return null;
  const riseSeconds = pickIn(RISE_SECONDS, random);
  const laneWidth = 100 / lanes;
  return {
    kind: options.kind,
    symbol: picked.symbol,
    text: picked.text,
    colorIndex: Math.floor(random() * BALLOON_COLORS.length),
    leftPercent: lane * laneWidth + laneWidth * (0.2 + random() * 0.6),
    riseSeconds,
    delaySeconds: options.startsPartWay
      ? -random() * riseSeconds * 0.9
      : pickIn(START_DELAY_SECONDS, random),
    swayPx: pickIn(SWAY_PX, random),
    swaySeconds: pickIn(SWAY_SECONDS, random),
  };
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function buildBalloon(plan: BalloonPlan, standsStill: boolean, random: RandomSource): HTMLElement {
  const color = BALLOON_COLORS[plan.colorIndex] ?? BALLOON_COLORS[0];
  const shape = createElement(
    'span',
    { className: 'balloon-shape' },
    createElement('span', { className: 'balloon-letter', text: plan.text }),
  );
  const balloon = createElement(
    'button',
    { className: 'balloon', dataset: { symbol: plan.symbol, kind: plan.kind } },
    createElement('span', { className: 'balloon-sway' }, shape),
  );
  balloon.setAttribute('aria-label', plan.text);
  const style = balloon.style;
  style.setProperty('--left', `${plan.leftPercent}%`);
  style.setProperty('--rise', `${plan.riseSeconds}s`);
  style.setProperty('--delay', `${plan.delaySeconds}s`);
  style.setProperty('--sway', `${plan.swayPx}px`);
  style.setProperty('--sway-time', `${plan.swaySeconds}s`);
  style.setProperty('--top-color', color.top);
  style.setProperty('--bottom-color', color.bottom);
  style.setProperty('--tint', color.tint);
  if (standsStill) style.setProperty('--rest-y', `${15 + random() * 60}%`);
  return balloon;
}

/** Little coloured dots that fly out when a bubble pops. */
function addPopDots(balloon: HTMLElement, random: RandomSource): void {
  for (let index = 0; index < POP_DOTS; index++) {
    const angle = (index / POP_DOTS) * Math.PI * 2 + random() * 0.4;
    const dot = createElement('span', { className: 'balloon-dot' });
    dot.style.setProperty('--dx', `${Math.cos(angle) * POP_DOT_DISTANCE_PX}px`);
    dot.style.setProperty('--dy', `${Math.sin(angle) * POP_DOT_DISTANCE_PX}px`);
    dot.style.setProperty(
      '--dot-color',
      BALLOON_COLORS[index % BALLOON_COLORS.length]?.top ?? '#fff',
    );
    balloon.append(dot);
  }
}

export function buildBalloonLayer(
  pack: LanguagePack,
  orientation: RoadOrientation,
  random: RandomSource = Math.random,
): HTMLElement {
  const layer = createElement('div', { className: 'balloon-layer' });
  const standsStill = prefersReducedMotion();
  if (standsStill) layer.classList.add('still');
  const lanes = laneCount(orientation);

  const showingSymbols = (): Set<string> =>
    new Set(
      [...layer.querySelectorAll<HTMLElement>('.balloon')].map(
        (balloon) => balloon.dataset.symbol ?? '',
      ),
    );
  const numbersShowing = (): number =>
    layer.querySelectorAll('.balloon[data-kind="number"]:not(.popped)').length;

  const launch = (lane: number, isFirstFill: boolean): void => {
    // The home screen was redrawn (language or rotation): this old layer stops making bubbles.
    if (!layer.isConnected && !isFirstFill) return;
    const numbers = numbersShowing();
    const isLastFirstLane = isFirstFill && lane === lanes - 1;
    // Make sure at least one number is up when the page opens, and later whenever none is.
    const needsNumber = numbers === 0 && (!isFirstFill || isLastFirstLane);
    const kind = pickKind(numbers, lanes, needsNumber, random);
    const plan = planBalloon(
      pack,
      lane,
      lanes,
      showingSymbols(),
      { startsPartWay: isFirstFill, kind },
      random,
    );
    if (!plan) return;
    const balloon = buildBalloon(plan, standsStill, random);
    balloon.dataset.lane = String(lane);
    balloon.addEventListener('click', () => pop(balloon));
    balloon.addEventListener('animationend', (event) => {
      if (event.animationName === 'balloon-rise') replace(balloon);
    });
    layer.append(balloon);
  };

  const replace = (balloon: HTMLElement): void => {
    const lane = Number(balloon.dataset.lane);
    balloon.remove();
    launch(lane, false);
  };

  const pop = (balloon: HTMLElement): void => {
    if (balloon.classList.contains('popped')) return;
    balloon.classList.add('popped');
    addPopDots(balloon, random);
    playPopSound();
    const symbol = balloon.dataset.symbol ?? '';
    const part =
      balloon.dataset.kind === 'number'
        ? countingPart(pack, Number(symbol))
        : letterNamePart(pack, symbol);
    if (part) void speakInterrupting(part);
    window.setTimeout(() => replace(balloon), POP_MS);
  };

  for (let lane = 0; lane < lanes; lane++) launch(lane, true);
  return layer;
}
