import { finishRoundGame } from '../ui/progressUi';
import { colorNamePart, phraseWordPart } from '../content';
import type { ColorEntry, LanguagePack, SpokenPart } from '../content';
import { byId, clearChildren, createElement, wait } from '../core/dom';
import { svgElement } from '../core/svg';
import { makeDraggable } from '../core/drag';
import { getPack, onLanguageChange } from '../core/i18n';
import { beginPlayback } from '../core/playback';
import { pickDistinct, pickRandom, shuffled } from '../core/random';
import type { RandomSource } from '../core/random';
import { playTryAgainSound } from '../core/sfx';
import { SPEECH_RATE, speakPart, speakPartsInOrder } from '../core/voice';
import { CHEER_MS, buildPrompt, buildStars, cheer, sayWellDone } from '../ui/playScreen';
import { ROUNDS_PER_SET, finishedSet, levelFor } from './rounds';
import type { Level } from './rounds';

/** Colour ids (see the colour lists in the language packs) that make a new colour when mixed. */
export interface MixRecipe {
  first: string;
  second: string;
  result: string;
}

export const MIX_RECIPES: readonly MixRecipe[] = [
  { first: 'red', second: 'yellow', result: 'orange' },
  { first: 'blue', second: 'yellow', result: 'green' },
  { first: 'red', second: 'blue', result: 'purple' },
  { first: 'red', second: 'white', result: 'pink' },
  { first: 'black', second: 'white', result: 'gray' },
];

const CHOICES_BY_LEVEL: Record<Level, number> = { easy: 3, hard: 4 };
const TRIES_BEFORE_HINT = 2;
const NEXT_ROUND_DELAY_MS = 900;

export interface MixRound {
  recipe: MixRecipe;
  /** Colour ids in the order shown; exactly one is the recipe's result. */
  choices: string[];
}

/** Picks a recipe (never the same as `previous`) and wrong colours to go with the right one. */
export function makeMixRound(
  level: Level,
  allColorIds: readonly string[],
  previous: MixRecipe | null = null,
  random: RandomSource = Math.random,
): MixRound {
  const candidates = MIX_RECIPES.filter((recipe) => recipe !== previous);
  const recipe = pickRandom(candidates, random) ?? MIX_RECIPES[0];
  if (!recipe) throw new Error('No mix recipes');
  const wrongPool = allColorIds.filter(
    (id) => id !== recipe.first && id !== recipe.second && id !== recipe.result,
  );
  const wrong = pickDistinct(wrongPool, CHOICES_BY_LEVEL[level] - 1, random);
  return { recipe, choices: shuffled([recipe.result, ...wrong], random) };
}

let solvedRounds = 0;
let wrongTries = 0;
let busy = false;
let round: MixRound | null = null;

export function initMixGame(): void {
  onLanguageChange(() => startRound());
  startRound();
}

function startRound(): void {
  busy = false;
  wrongTries = 0;
  const pack = getPack();
  round = makeMixRound(
    levelFor(solvedRounds),
    pack.colors.map((color) => color.id),
    round?.recipe ?? null,
  );
  renderRound(pack, round);
}

function findColor(pack: LanguagePack, id: string): ColorEntry {
  const color = pack.colors.find((entry) => entry.id === id);
  if (!color) throw new Error(`Unknown colour "${id}"`);
  return color;
}

function swatch(color: ColorEntry, className: string): HTMLElement {
  const element = createElement('div', { className: `mix-swatch ${className}`, title: color.name });
  element.style.background = color.hex;
  return element;
}

/** "red with yellow" */
function askParts(pack: LanguagePack, recipe: MixRecipe): SpokenPart[] {
  return [
    colorNamePart(findColor(pack, recipe.first)),
    phraseWordPart(pack, 'with'),
    colorNamePart(findColor(pack, recipe.second)),
  ];
}

/**
 * The two overlapping circles, drawn in SVG (160 x 100 units) so the overlap is exactly where
 * the circles meet: the right circle, cut by the left one. Both outlines are drawn on top.
 */
const VENN = { radius: 46, leftX: 50, rightX: 110, y: 50, width: 160, height: 100 } as const;
const LENS_CLIP_ID = 'mix-lens-clip';
const LENS_STRIPES_ID = 'mix-lens-stripes';
const OUTLINE = 'rgba(0, 0, 0, 0.18)';

interface VennDrawing {
  svg: SVGSVGElement;
  /** The overlap: filled with stripes, then with the mixed colour. */
  lens: SVGCircleElement;
  mark: SVGTextElement;
}

function buildVenn(left: ColorEntry, right: ColorEntry): VennDrawing {
  const { radius, leftX, rightX, y, width, height } = VENN;
  const svg = svgElement('svg', {
    class: 'mix-venn-svg',
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-label': `${left.name} + ${right.name}`,
  });
  const clip = svgElement('clipPath', { id: LENS_CLIP_ID });
  clip.append(svgElement('circle', { cx: String(leftX), cy: String(y), r: String(radius) }));
  const stripes = svgElement('pattern', {
    id: LENS_STRIPES_ID,
    width: '8',
    height: '8',
    patternUnits: 'userSpaceOnUse',
    patternTransform: 'rotate(45)',
  });
  stripes.append(
    svgElement('rect', { width: '8', height: '8', fill: '#eaf2ff' }),
    svgElement('rect', { width: '4', height: '8', fill: '#cfe0fa' }),
  );
  const defs = svgElement('defs', {});
  defs.append(clip, stripes);

  const disc = (x: number, fill: string): SVGCircleElement =>
    svgElement('circle', { cx: String(x), cy: String(y), r: String(radius), fill });
  const outline = (x: number): SVGCircleElement =>
    svgElement('circle', {
      cx: String(x),
      cy: String(y),
      r: String(radius),
      fill: 'none',
      stroke: OUTLINE,
      'stroke-width': '2.5',
    });
  const lens = svgElement('circle', {
    class: 'mix-lens',
    cx: String(rightX),
    cy: String(y),
    r: String(radius),
    fill: `url(#${LENS_STRIPES_ID})`,
    'clip-path': `url(#${LENS_CLIP_ID})`,
  });
  const mark = svgElement('text', {
    class: 'mix-lens-mark',
    x: String((leftX + rightX) / 2),
    y: String(y),
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
  });
  mark.textContent = '?';
  svg.append(
    defs,
    disc(leftX, left.hex),
    disc(rightX, right.hex),
    lens,
    outline(leftX),
    outline(rightX),
    mark,
  );
  return { svg, lens, mark };
}

function renderRound(pack: LanguagePack, current: MixRound): void {
  const { recipe } = current;
  const first = findColor(pack, recipe.first);
  const second = findColor(pack, recipe.second);
  const root = byId('mixplay');
  clearChildren(root);

  // Two colour circles that overlap; the overlap shows "?" and the mixed colour goes there.
  // The first colour is read first: on the right in Hebrew, on the left in English.
  const [leftColor, rightColor] = pack.dir === 'rtl' ? [second, first] : [first, second];
  const drawing = buildVenn(leftColor, rightColor);
  // An invisible oval over the overlap is what the child drops on (or taps); it shows the ring.
  const target = createElement('div', { className: 'mix-lens-target' });
  const venn = createElement('div', { className: 'mix-venn' }, drawing.svg, target);
  venn.addEventListener(
    'click',
    () => void speakPartsInOrder(askParts(pack, recipe), beginPlayback(), SPEECH_RATE.DEFAULT),
  );
  const board = createElement('div', { className: 'mix-board' }, venn);

  const choices = createElement('div', { className: 'play-choices' });
  for (const id of current.choices) {
    const color = findColor(pack, id);
    const dot = swatch(color, 'choice');
    dot.dataset.color = id;
    makeDraggable(dot, {
      targets: () => [target],
      onDrop: () => onColorDropped(pack, recipe, color, drawing),
      onReject: () => onWrong(choices, recipe),
      onTap: () => void speakPart(colorNamePart(color), SPEECH_RATE.DEFAULT),
    });
    choices.append(dot);
  }

  root.append(buildPrompt(pack, 'mix'), buildStars(solvedRounds, ROUNDS_PER_SET), board, choices);
}

function onColorDropped(
  pack: LanguagePack,
  recipe: MixRecipe,
  color: ColorEntry,
  drawing: VennDrawing,
): boolean {
  if (busy || color.id !== recipe.result) return false;
  busy = true;
  drawing.mark.remove();
  drawing.lens.setAttribute('fill', color.hex);
  drawing.lens.classList.add('done');
  byId('mixplay').querySelector(`.choice[data-color="${color.id}"]`)?.classList.add('placed');
  solvedRounds += 1;
  void finishRound(pack, recipe, color);
  return true;
}

async function finishRound(
  pack: LanguagePack,
  recipe: MixRecipe,
  result: ColorEntry,
): Promise<void> {
  const setFinished = finishedSet(solvedRounds);
  byId('mixplay')
    .querySelector('.play-stars')
    ?.replaceWith(buildStars(solvedRounds, ROUNDS_PER_SET));
  cheer(setFinished);
  if (setFinished) finishRoundGame('mix', pack);
  await wait(CHEER_MS);
  const playbackId = beginPlayback();
  await speakPartsInOrder(
    [...askParts(pack, recipe), phraseWordPart(pack, 'makes'), colorNamePart(result)],
    playbackId,
    SPEECH_RATE.DEFAULT,
  );
  if (setFinished) await sayWellDone(pack);
  await wait(NEXT_ROUND_DELAY_MS);
  startRound();
}

function onWrong(choices: HTMLElement, recipe: MixRecipe): void {
  if (busy) return;
  playTryAgainSound();
  wrongTries += 1;
  if (wrongTries < TRIES_BEFORE_HINT) return;
  choices.querySelector(`[data-color="${recipe.result}"]`)?.classList.add('hint');
}
