import { colorNamePart, phraseWordPart } from '../content';
import type { ColorEntry, LanguagePack, SpokenPart } from '../content';
import { byId, clearChildren, createElement, wait } from '../core/dom';
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

/** "red plus yellow" */
function askParts(pack: LanguagePack, recipe: MixRecipe): SpokenPart[] {
  return [
    colorNamePart(findColor(pack, recipe.first)),
    phraseWordPart(pack, 'plus'),
    colorNamePart(findColor(pack, recipe.second)),
  ];
}

function renderRound(pack: LanguagePack, current: MixRound): void {
  const { recipe } = current;
  const first = findColor(pack, recipe.first);
  const second = findColor(pack, recipe.second);
  const root = byId('mixplay');
  clearChildren(root);

  const slot = createElement('div', { className: 'mix-slot', text: '?' });
  const left = createElement(
    'div',
    { className: 'mix-side' },
    swatch(first, 'fixed'),
    createElement('span', { className: 'mix-plus', text: '+' }),
    swatch(second, 'fixed'),
  );
  left.addEventListener(
    'click',
    () => void speakPartsInOrder(askParts(pack, recipe), beginPlayback(), SPEECH_RATE.DEFAULT),
  );
  const board = createElement(
    'div',
    { className: 'mix-board' },
    left,
    createElement('div', { className: 'mix-line' }),
    createElement('div', { className: 'mix-side' }, slot),
  );

  const choices = createElement('div', { className: 'play-choices' });
  for (const id of current.choices) {
    const color = findColor(pack, id);
    const dot = swatch(color, 'choice');
    dot.dataset.color = id;
    makeDraggable(dot, {
      targets: () => [slot],
      onDrop: () => onColorDropped(pack, recipe, color, slot),
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
  slot: HTMLElement,
): boolean {
  if (busy || color.id !== recipe.result) return false;
  busy = true;
  slot.textContent = '';
  slot.style.background = color.hex;
  slot.classList.add('done');
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
